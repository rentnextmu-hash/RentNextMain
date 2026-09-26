"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { isVehicleAvailable } from "@/lib/availability";
import { pickBestVehicleId } from "@/lib/assignment";
import { canTransition } from "@/lib/bookingStatus";
import { assignBookingVehicle, getBookingById, transitionBooking } from "@/lib/queries/bookings";
import { completeBookingSchema, internalNotesSchema, recordPaymentSchema } from "@/lib/validation";
import type { BookingStatus } from "@/types/enums";

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

// Every action re-checks the session: server actions are public HTTP
// endpoints, so the admin layout having rendered is no guarantee.
async function staffContext() {
  const staff = await getCurrentStaff();
  if (!staff?.is_active) throw new Error("Your session has expired. Sign in again.");
  return { staff, supabase: await createClient() };
}

function revalidateBooking(reference: string) {
  revalidatePath(`/admin/bookings/${reference}`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/bookings/assign");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

// Postgres errors raised by the status guard and transition_booking() are
// written for people; anything else gets a generic message.
function messageFrom(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    const code = "code" in err ? err.code : undefined;
    // 23P01 = exclusion_violation: the no-double-booking constraint fired.
    // The app-level availability check should catch this first, so this is
    // the race safety net — another staff member just took the car.
    if (code === "23P01") {
      return "That vehicle was just booked for an overlapping period by someone else. Refresh and pick another car.";
    }
    if (code === "23514" || err.message.startsWith("Your session")) return err.message;
    console.error(err);
  } else {
    console.error(err);
  }
  return "Something went wrong saving that change. Please try again.";
}

async function run(bookingId: string, fn: (ctx: Awaited<ReturnType<typeof staffContext>>, booking: NonNullable<Awaited<ReturnType<typeof getBookingById>>>) => Promise<string>): Promise<ActionResult> {
  try {
    const ctx = await staffContext();
    const booking = await getBookingById(ctx.supabase, bookingId);
    if (!booking) return { ok: false, error: "That booking no longer exists." };
    const message = await fn(ctx, booking);
    revalidateBooking(booking.reference);
    return { ok: true, message };
  } catch (err) {
    return { ok: false, error: messageFrom(err) };
  }
}

class UserError extends Error {
  code = "23514";
}

export async function confirmBooking(bookingId: string): Promise<ActionResult> {
  return run(bookingId, async ({ supabase }, booking) => {
    if (!canTransition(booking.status, "confirmed")) throw new UserError(`A ${booking.status} booking can't be confirmed.`);

    // Confirming assigns a car if none is assigned yet, using the shared
    // assignment engine (lib/assignment.ts) — the same ranking staff see in
    // the Assign dialog, so the auto-pick matches the top recommendation.
    let vehicleId: string | undefined;
    if (!booking.vehicle_id) {
      const best = await pickBestVehicleId(
        supabase,
        {
          categoryId: booking.category_id,
          pickupAt: booking.pickup_at,
          returnAt: booking.return_at,
          pickupLocationId: booking.pickup_location_id,
          returnLocationId: booking.return_location_id,
        },
        { excludeBookingId: booking.id },
      );
      if (!best) {
        throw new UserError(
          `No ${booking.category.name} is free for these dates. Change the dates or car, or cancel the request.`,
        );
      }
      vehicleId = best;
    }

    await transitionBooking(supabase, booking.id, "confirmed", { vehicleId });
    return vehicleId ? "Booking confirmed and a vehicle assigned." : "Booking confirmed.";
  });
}

export async function assignVehicle(bookingId: string, vehicleId: string): Promise<ActionResult> {
  return run(bookingId, async ({ supabase }, booking) => {
    if (!["requested", "confirmed"].includes(booking.status)) {
      throw new UserError(`The vehicle on a ${booking.status} booking can't be changed here.`);
    }
    const free = await isVehicleAvailable(supabase, vehicleId, booking.pickup_at, booking.return_at, {
      excludeBookingId: booking.id,
    });
    if (!free) throw new UserError("That vehicle has just been booked for an overlapping period. Pick another.");

    await assignBookingVehicle(supabase, booking.id, vehicleId);
    return "Vehicle assigned.";
  });
}

export async function markPickedUp(bookingId: string): Promise<ActionResult> {
  return run(bookingId, async ({ supabase }, booking) => {
    await transitionBooking(supabase, booking.id, "active");
    return "Marked as picked up.";
  });
}

export async function completeBooking(bookingId: string, formData: FormData): Promise<ActionResult> {
  const parsed = completeBookingSchema.safeParse({ returnMileageKm: formData.get("returnMileageKm") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(bookingId, async ({ supabase }, booking) => {
    await transitionBooking(supabase, booking.id, "completed", { returnMileageKm: parsed.data.returnMileageKm });
    return "Booking completed and the vehicle is available again.";
  });
}

export async function cancelBooking(bookingId: string): Promise<ActionResult> {
  return run(bookingId, async ({ supabase }, booking) => {
    await transitionBooking(supabase, booking.id, "cancelled" satisfies BookingStatus);
    return "Booking cancelled.";
  });
}

export async function recordPayment(bookingId: string, formData: FormData): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse({
    amountMur: formData.get("amountMur"),
    method: formData.get("method"),
    reference: formData.get("reference") || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(bookingId, async ({ supabase }, booking) => {
    const { error } = await supabase.from("payments").insert({
      booking_id: booking.id,
      amount_mur: parsed.data.amountMur,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      status: "paid",
      paid_at: new Date().toISOString(),
    });
    if (error) throw error;
    return "Payment recorded.";
  });
}

export async function saveInternalNotes(bookingId: string, notes: string): Promise<ActionResult> {
  const parsed = internalNotesSchema.safeParse({ notes });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return run(bookingId, async ({ supabase, staff }, booking) => {
    const { error } = await supabase
      .from("bookings")
      .update({
        internal_notes: parsed.data.notes.trim() || null,
        internal_notes_updated_at: new Date().toISOString(),
        internal_notes_updated_by: staff.id,
      })
      .eq("id", booking.id);
    if (error) throw error;
    return "Notes saved.";
  });
}
