// The only place the vehicle-assignment policy lives. Given a booking that
// needs a car, rank the free vehicles of its category and explain why —
// so staff (and the auto-assign on Confirm) make the same, defensible choice.
//
// This consumes lib/availability.ts for the eligible set: it NEVER re-checks
// overlaps itself. On top of "which cars are free" it layers a transparent,
// explainable score:
//   * a car already at the pickup location beats one that must be relocated,
//   * spread the load — a car with nothing else booked soon beats a busy one,
//   * even out wear — lower mileage breaks ties.
// and it flags (without disqualifying) risks worth eyeballing: a tight
// turnaround before the car's next booking, or that next booking starting
// somewhere else.
//
// Staff/service-role only (getAvailableVehicles reads the staff-only
// `vehicles` table).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAvailableVehicles, type AvailableVehicle, type AvailabilityOptions } from "@/lib/availability";

type Client = SupabaseClient<Database>;

const OVERLAPPING_STATUSES = ["confirmed", "active"] as const;
const HOUR_MS = 3_600_000;
// Turnaround below which a back-to-back booking is worth a warning.
const TIGHT_TURNAROUND_HOURS = 24;
// How far ahead the "not booked again soon" reward looks.
const UPCOMING_WINDOW_DAYS = 30;

// Score contributions, all in one place so the policy reads at a glance.
const BASE_SCORE = 50;
const AT_PICKUP_BONUS = 30;
const RELOCATE_PENALTY = 10;
const IDLE_BONUS = 15; // nothing else booked in the window
const LIGHT_LOAD_BONUS = 5; // exactly one other upcoming booking
const TIGHT_TURNAROUND_PENALTY = 15;
const MILEAGE_BONUS_MAX = 10; // for the lowest-mileage car in the group

function toIso(date: Date | string): string {
  return typeof date === "string" ? new Date(date).toISOString() : date.toISOString();
}

export type AssignmentBooking = {
  categoryId: string;
  pickupAt: Date | string;
  returnAt: Date | string;
  pickupLocationId: string;
  returnLocationId: string;
};

export type RankedVehicle = AvailableVehicle & {
  /** 0–100, higher is a better fit. */
  score: number;
  /** The single best pick (only the top row is true). */
  recommended: boolean;
  /** Why it scored well. */
  reasons: string[];
  /** Free for this window, but worth checking. */
  warnings: string[];
};

export type NeighbourBooking = {
  reference: string;
  vehicleId: string;
  pickupAt: string;
  pickupLocationId: string;
  pickupLocationName: string | null;
};

/**
 * The pure assignment policy: score, rank, explain. No IO — given the free
 * vehicles and their upcoming bookings, it produces the ranked list. Kept
 * separate from the query so the scoring is unit-testable in isolation.
 */
export function rankCandidates(
  free: AvailableVehicle[],
  neighbours: NeighbourBooking[],
  booking: AssignmentBooking,
): RankedVehicle[] {
  if (free.length === 0) return [];

  const returnMs = new Date(toIso(booking.returnAt)).getTime();
  const windowEndMs = returnMs + UPCOMING_WINDOW_DAYS * 24 * HOUR_MS;

  // Earliest upcoming booking per vehicle (back-to-back allowed, so the first
  // starting on or after this return is the "next" one), and how many fall in
  // the reward window.
  const sorted = [...neighbours].sort((a, b) => a.pickupAt.localeCompare(b.pickupAt));
  const nextByVehicle = new Map<string, NeighbourBooking>();
  const upcomingCount = new Map<string, number>();
  for (const n of sorted) {
    const startMs = new Date(n.pickupAt).getTime();
    if (startMs < returnMs) continue; // only bookings on/after this return count
    if (!nextByVehicle.has(n.vehicleId)) nextByVehicle.set(n.vehicleId, n);
    if (startMs <= windowEndMs) upcomingCount.set(n.vehicleId, (upcomingCount.get(n.vehicleId) ?? 0) + 1);
  }

  const mileages = free.map((v) => v.mileageKm);
  const minMileage = Math.min(...mileages);
  const maxMileage = Math.max(...mileages);
  const mileageSpread = maxMileage - minMileage;

  const scored = free.map((v) => {
    let score = BASE_SCORE;
    const reasons: string[] = [];
    const warnings: string[] = [];

    if (v.locationId === booking.pickupLocationId) {
      score += AT_PICKUP_BONUS;
      reasons.push("Already at the pickup location");
    } else {
      score -= RELOCATE_PENALTY;
      warnings.push(`At ${v.locationName || "another location"} — needs moving to the pickup point`);
    }

    const load = upcomingCount.get(v.id) ?? 0;
    if (load === 0) {
      score += IDLE_BONUS;
      reasons.push(`Nothing else booked for ${UPCOMING_WINDOW_DAYS} days after`);
    } else if (load === 1) {
      score += LIGHT_LOAD_BONUS;
    }

    const next = nextByVehicle.get(v.id);
    if (next) {
      const gapMs = new Date(next.pickupAt).getTime() - returnMs;
      if (gapMs < TIGHT_TURNAROUND_HOURS * HOUR_MS) {
        score -= TIGHT_TURNAROUND_PENALTY;
        const hrs = Math.max(0, Math.round(gapMs / HOUR_MS));
        warnings.push(`Only ${hrs}h before its next booking (${next.reference})`);
      }
      if (next.pickupLocationId !== booking.returnLocationId) {
        warnings.push(`Next booking (${next.reference}) starts at ${next.pickupLocationName ?? "another location"}`);
      }
    }

    if (mileageSpread > 0) {
      score += Math.round(MILEAGE_BONUS_MAX * (1 - (v.mileageKm - minMileage) / mileageSpread));
      if (v.mileageKm === minMileage) reasons.push("Lowest mileage in the group");
    }

    return {
      ...v,
      score: Math.max(0, Math.min(100, score)),
      recommended: false,
      reasons,
      warnings,
    };
  });

  // Best first: score, then lowest mileage, then a stable code order.
  scored.sort((a, b) => b.score - a.score || a.mileageKm - b.mileageKm || a.code.localeCompare(b.code));
  if (scored.length > 0) scored[0].recommended = true;
  return scored;
}

/**
 * Rank every free vehicle of the booking's category for its window, best
 * first, each with a score, reasons and warnings. Empty when nothing is free.
 */
export async function rankVehiclesForBooking(
  supabase: Client,
  booking: AssignmentBooking,
  options: AvailabilityOptions = {},
): Promise<RankedVehicle[]> {
  const free = await getAvailableVehicles(
    supabase,
    {
      categoryId: booking.categoryId,
      from: booking.pickupAt,
      to: booking.returnAt,
      preferLocationId: booking.pickupLocationId,
    },
    options,
  );
  if (free.length === 0) return [];

  // The bookings each candidate already has on or after this return.
  let neighbourQuery = supabase
    .from("bookings")
    .select("reference, vehicle_id, pickup_at, pickup_location_id, pickup_location:locations!bookings_pickup_location_id_fkey(name)")
    .in("vehicle_id", free.map((v) => v.id))
    .in("status", OVERLAPPING_STATUSES)
    .gte("pickup_at", toIso(booking.returnAt))
    .order("pickup_at", { ascending: true });
  if (options.excludeBookingId) neighbourQuery = neighbourQuery.neq("id", options.excludeBookingId);

  const { data: neighbourRows, error } = await neighbourQuery;
  if (error) throw error;

  const neighbours: NeighbourBooking[] = (
    (neighbourRows ?? []) as unknown as {
      reference: string;
      vehicle_id: string;
      pickup_at: string;
      pickup_location_id: string;
      pickup_location: { name: string } | null;
    }[]
  ).map((n) => ({
    reference: n.reference,
    vehicleId: n.vehicle_id,
    pickupAt: n.pickup_at,
    pickupLocationId: n.pickup_location_id,
    pickupLocationName: n.pickup_location?.name ?? null,
  }));

  return rankCandidates(free, neighbours, booking);
}

/** The single best vehicle id for a booking, or null when none is free. */
export async function pickBestVehicleId(
  supabase: Client,
  booking: AssignmentBooking,
  options: AvailabilityOptions = {},
): Promise<string | null> {
  const ranked = await rankVehiclesForBooking(supabase, booking, options);
  return ranked[0]?.id ?? null;
}
