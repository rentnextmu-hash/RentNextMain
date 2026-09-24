"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireRole } from "@/lib/auth";
import { findVehicleConflicts, suggestVehicleCode } from "@/lib/queries/vehicles";
import { vehicleFormSchema, vehicleStatusSchema } from "@/lib/validation";

export type VehicleFormResult =
  | { ok: true; message: string; vehicleId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const EDITORS = ["owner", "manager"] as const;

function revalidateFleet(vehicleId?: string) {
  revalidatePath("/admin/fleet");
  if (vehicleId) revalidatePath(`/admin/fleet/${vehicleId}`);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

function fail(err: unknown): VehicleFormResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong saving the vehicle. Please try again." };
}

function parseForm(formData: FormData) {
  return vehicleFormSchema.safeParse(Object.fromEntries(formData));
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[String(issue.path[0])] ??= issue.message;
  return fieldErrors;
}

async function conflictErrors(values: { code: string; registration: string }, excludeId?: string) {
  const supabase = await createClient();
  const conflicts = await findVehicleConflicts(supabase, values, excludeId);
  const fieldErrors: Record<string, string> = {};
  if (conflicts.code) fieldErrors.code = `${values.code} is already used by another vehicle.`;
  if (conflicts.registration) fieldErrors.registration = `${values.registration} is already registered to another vehicle.`;
  return fieldErrors;
}

export async function createVehicleAction(formData: FormData): Promise<VehicleFormResult> {
  try {
    await requireRole([...EDITORS]);
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
    }
    const v = parsed.data;
    const clashes = await conflictErrors(v);
    if (Object.keys(clashes).length > 0) return { ok: false, error: "Check the highlighted fields.", fieldErrors: clashes };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        category_id: v.categoryId,
        code: v.code,
        registration: v.registration,
        location_id: v.locationId,
        status: v.status,
        mileage_km: v.mileageKm,
        year: v.year ?? null,
        colour: v.colour ?? null,
        acquired_at: v.acquiredAt ?? null,
        notes: v.notes ?? null,
      })
      .select("id, code, location:locations(name)")
      .single();
    // A race with another insert still lands on the unique constraints.
    if (error?.code === "23505") {
      return { ok: false, error: "That code or registration was just taken. Check and try again." };
    }
    if (error) throw error;

    revalidateFleet(data.id);
    return { ok: true, vehicleId: data.id, message: `${data.code} added to ${data.location?.name ?? "the fleet"}` };
  } catch (err) {
    return fail(err);
  }
}

export async function updateVehicleAction(vehicleId: string, formData: FormData): Promise<VehicleFormResult> {
  try {
    await requireRole([...EDITORS]);
    const parsed = parseForm(formData);
    if (!parsed.success) {
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };
    }
    const v = parsed.data;
    const clashes = await conflictErrors(v, vehicleId);
    if (Object.keys(clashes).length > 0) return { ok: false, error: "Check the highlighted fields.", fieldErrors: clashes };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .update({
        category_id: v.categoryId,
        code: v.code,
        registration: v.registration,
        location_id: v.locationId,
        status: v.status,
        mileage_km: v.mileageKm,
        year: v.year ?? null,
        colour: v.colour ?? null,
        acquired_at: v.acquiredAt ?? null,
        notes: v.notes ?? null,
      })
      .eq("id", vehicleId)
      .select("id, code")
      .single();
    if (error?.code === "23505") {
      return { ok: false, error: "That code or registration was just taken. Check and try again." };
    }
    if (error) throw error;

    revalidateFleet(vehicleId);
    return { ok: true, vehicleId, message: `${data.code} updated` };
  } catch (err) {
    return fail(err);
  }
}

export async function changeVehicleStatusAction(vehicleId: string, status: string): Promise<VehicleFormResult> {
  try {
    await requireRole([...EDITORS]);
    const parsed = vehicleStatusSchema.safeParse({ status });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicles")
      .update({ status: parsed.data.status })
      .eq("id", vehicleId)
      .select("code")
      .single();
    if (error) throw error;

    revalidateFleet(vehicleId);
    return { ok: true, vehicleId, message: `${data.code} is now ${parsed.data.status}` };
  } catch (err) {
    return fail(err);
  }
}

/** For the form's "code" field: the suggested next code when a category is picked. */
export async function suggestVehicleCodeAction(categoryId: string): Promise<string | null> {
  try {
    await requireRole([...EDITORS]);
    return await suggestVehicleCode(await createClient(), categoryId);
  } catch {
    return null;
  }
}
