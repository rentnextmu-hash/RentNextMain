// The only place availability logic happens anywhere in the codebase.
// Availability means: the vehicle's status is 'available' or 'booked' (not
// 'maintenance' or 'inactive'), it's based at the requested location, and
// it has no booking with status in (confirmed, active) overlapping the
// requested window. The window is treated as [pickup_at, return_at).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const OVERLAPPING_STATUSES = ["confirmed", "active"] as const;
const OPERABLE_VEHICLE_STATUSES = ["available", "booked"] as const;

function toIso(date: Date | string): string {
  return typeof date === "string" ? new Date(date).toISOString() : date.toISOString();
}

export async function isVehicleAvailable(
  supabase: Client,
  vehicleId: string,
  from: Date | string,
  to: Date | string,
): Promise<boolean> {
  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("status")
    .eq("id", vehicleId)
    .maybeSingle();

  if (vehicleError) throw vehicleError;
  if (!vehicle || !OPERABLE_VEHICLE_STATUSES.includes(vehicle.status as "available" | "booked")) {
    return false;
  }

  const { count, error } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("vehicle_id", vehicleId)
    .in("status", OVERLAPPING_STATUSES)
    .lt("pickup_at", toIso(to))
    .gt("return_at", toIso(from));

  if (error) throw error;
  return (count ?? 0) === 0;
}

async function unavailableVehicleIds(
  supabase: Client,
  vehicleIds: string[],
  from: Date | string,
  to: Date | string,
): Promise<Set<string>> {
  if (vehicleIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("bookings")
    .select("vehicle_id")
    .in("vehicle_id", vehicleIds)
    .in("status", OVERLAPPING_STATUSES)
    .lt("pickup_at", toIso(to))
    .gt("return_at", toIso(from));

  if (error) throw error;
  return new Set((data ?? []).map((b) => b.vehicle_id).filter((id): id is string => id !== null));
}

export async function getAvailableVehicleCount(
  supabase: Client,
  categoryId: string,
  locationId: string,
  from: Date | string,
  to: Date | string,
): Promise<number> {
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id")
    .eq("category_id", categoryId)
    .eq("location_id", locationId)
    .in("status", OPERABLE_VEHICLE_STATUSES);

  if (error) throw error;
  if (!vehicles || vehicles.length === 0) return 0;

  const vehicleIds = vehicles.map((v) => v.id);
  const unavailable = await unavailableVehicleIds(supabase, vehicleIds, from, to);

  return vehicleIds.filter((id) => !unavailable.has(id)).length;
}

export type CategoryAvailability = {
  categoryId: string;
  availableCount: number;
};

export async function getAvailableCategories(
  supabase: Client,
  locationId: string,
  from: Date | string,
  to: Date | string,
): Promise<CategoryAvailability[]> {
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id, category_id")
    .eq("location_id", locationId)
    .in("status", OPERABLE_VEHICLE_STATUSES);

  if (error) throw error;
  if (!vehicles || vehicles.length === 0) return [];

  const vehicleIds = vehicles.map((v) => v.id);
  const unavailable = await unavailableVehicleIds(supabase, vehicleIds, from, to);

  const countByCategory = new Map<string, number>();
  for (const v of vehicles) {
    if (unavailable.has(v.id)) continue;
    countByCategory.set(v.category_id, (countByCategory.get(v.category_id) ?? 0) + 1);
  }

  return Array.from(countByCategory.entries()).map(([categoryId, availableCount]) => ({
    categoryId,
    availableCount,
  }));
}
