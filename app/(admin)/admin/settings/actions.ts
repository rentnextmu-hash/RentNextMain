"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { AuthError, requireRole } from "@/lib/auth";
import {
  addOnFormSchema,
  categoryFormSchema,
  categoryRatesSchema,
  settingsFormSchema,
  type AddOnFormValues,
  type CategoryFormValues,
  type SettingsFormValues,
} from "@/lib/validation";

export type SaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Settings, rates and add-ons drive the public site (statically generated),
// so refresh the pages that read them.
function revalidatePublic() {
  revalidatePath("/", "layout"); // homepage + footer (settings) everywhere
  revalidatePath("/cars");
  revalidatePath("/cars", "page");
  revalidatePath("/search");
  revalidatePath("/contact");
  revalidatePath("/about");
  revalidatePath("/admin/settings");
}

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) fieldErrors[issue.path.join(".")] ??= issue.message;
  return fieldErrors;
}

function fail(err: unknown): SaveResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong saving. Please try again." };
}

/** Upserts settings key/value rows. Owner only (settings writes are owner-only in RLS). */
export async function saveSettingsAction(values: SettingsFormValues): Promise<SaveResult> {
  try {
    await requireRole(["owner"]);
    const parsed = settingsFormSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const v = parsed.data;
    const rows: { key: string; value: Json }[] = [
      ...Object.entries(v.company).map(([key, value]) => ({ key, value })),
      ...Object.entries(v.booking).map(([key, value]) => ({ key, value })),
    ];
    const supabase = await createClient();
    const { error } = await supabase.from("settings").upsert(rows, { onConflict: "key" });
    if (error) throw error;

    revalidatePublic();
    return { ok: true, message: "Settings saved" };
  } catch (err) {
    return fail(err);
  }
}

/** Inline table save of a category's three duration rates. */
export async function saveCategoryRatesAction(
  categoryId: string,
  rates: { rate12: unknown; rate35: unknown; rate6: unknown },
): Promise<SaveResult> {
  try {
    await requireRole(["owner"]);
    const parsed = categoryRatesSchema.safeParse(rates);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_categories")
      .update({ rate_1_2_mur: parsed.data.rate12, rate_3_5_mur: parsed.data.rate35, rate_6_plus_mur: parsed.data.rate6 })
      .eq("id", categoryId)
      .select("name")
      .single();
    if (error) throw error;

    revalidatePublic();
    return { ok: true, message: `${data.name} rates updated` };
  } catch (err) {
    return fail(err);
  }
}

/** Full category edit from the drawer. Categories aren't created here — they mirror the real fleet. */
export async function saveCategoryAction(categoryId: string, values: CategoryFormValues): Promise<SaveResult> {
  try {
    await requireRole(["owner"]);
    const parsed = categoryFormSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const v = parsed.data;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("vehicle_categories")
      .update({
        name: v.name,
        tagline: v.tagline,
        best_for: v.bestFor,
        description: v.description,
        transmission: v.transmission,
        fuel_type: v.fuelType,
        seats: v.seats,
        doors: v.doors,
        luggage_capacity: v.luggageCapacity,
        air_conditioning: v.airConditioning,
        rate_1_2_mur: v.rate12,
        rate_3_5_mur: v.rate35,
        rate_6_plus_mur: v.rate6,
        is_active: v.isActive,
      })
      .eq("id", categoryId)
      .select("name, slug")
      .single();
    if (error) throw error;

    revalidatePublic();
    revalidatePath(`/cars/${data.slug}`);
    return { ok: true, message: `${data.name} saved` };
  } catch (err) {
    return fail(err);
  }
}

/** Create (addOnId null) or update an add-on. */
export async function saveAddOnAction(addOnId: string | null, values: AddOnFormValues): Promise<SaveResult> {
  try {
    await requireRole(["owner"]);
    const parsed = addOnFormSchema.safeParse(values);
    if (!parsed.success) return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error.issues) };

    const v = parsed.data;
    const supabase = await createClient();
    const row = {
      name: v.name,
      description: v.description,
      price_mur: v.priceMur,
      price_type: v.priceType,
      max_quantity: v.maxQuantity,
      is_active: v.isActive,
    };

    if (addOnId) {
      const { error } = await supabase.from("add_ons").update(row).eq("id", addOnId);
      if (error) throw error;
    } else {
      // Slug from the name; add a numeric suffix on the rare clash.
      const base = v.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "add-on";
      let slug = base;
      for (let i = 2; i < 50; i++) {
        const { data: clash } = await supabase.from("add_ons").select("id").eq("slug", slug).maybeSingle();
        if (!clash) break;
        slug = `${base}-${i}`;
      }
      const { error } = await supabase.from("add_ons").insert({ ...row, slug });
      if (error) throw error;
    }

    revalidatePublic();
    return { ok: true, message: addOnId ? `${v.name} saved` : `${v.name} added` };
  } catch (err) {
    return fail(err);
  }
}
