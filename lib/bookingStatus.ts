// Booking status rules, for deciding what the admin UI offers. The
// database is authoritative — the bookings_status_guard trigger
// (migration 0007) rejects any transition not listed here — so this map
// only has to agree with it, never replace it.
import type { BookingStatus } from "@/types/enums";

export const BOOKING_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: string, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from as BookingStatus]?.includes(to) ?? false;
}

/** Whether the vehicle on a booking can still be changed. */
export function isOpenBooking(status: string): boolean {
  return status === "requested" || status === "confirmed" || status === "active";
}

export type AttentionReason = "requested" | "unassigned" | "pickup_soon";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Why a booking needs a human to look at it, or null: a website request
 * waiting for confirmation, a confirmed booking with no car assigned, or a
 * pickup within the next 24 hours that hasn't happened yet.
 */
export function attentionReason(
  booking: { status: string; vehicle_id: string | null; pickup_at: string },
  now: Date = new Date(),
): AttentionReason | null {
  if (booking.status === "requested") return "requested";
  if (booking.status === "confirmed" && !booking.vehicle_id) return "unassigned";
  const untilPickup = new Date(booking.pickup_at).getTime() - now.getTime();
  if (booking.status === "confirmed" && untilPickup >= 0 && untilPickup <= DAY_MS) return "pickup_soon";
  return null;
}

export const ATTENTION_LABEL: Record<AttentionReason, string> = {
  requested: "Awaiting confirmation",
  unassigned: "No vehicle assigned",
  pickup_soon: "Pickup within 24 hours",
};
