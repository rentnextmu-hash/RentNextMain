import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type Location = Database["public"]["Tables"]["locations"]["Row"];

export async function getActiveLocations(supabase: Client): Promise<Location[]> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getLocationBySlug(supabase: Client, slug: string): Promise<Location | null> {
  const { data, error } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type LocationWithFleetSummary = Location & {
  vehicleCount: number;
  availableCount: number;
  bookedCount: number;
  maintenanceCount: number;
};

// Reads the `vehicles` table directly, which RLS restricts to staff — this
// is an admin-only query (used from /admin/locations/[slug]).
export async function getLocationWithFleetSummary(
  supabase: Client,
  slug: string,
): Promise<LocationWithFleetSummary | null> {
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (locationError) throw locationError;
  if (!location) return null;

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("status")
    .eq("location_id", location.id);

  if (vehiclesError) throw vehiclesError;

  const summary = { vehicleCount: 0, availableCount: 0, bookedCount: 0, maintenanceCount: 0 };
  for (const v of vehicles ?? []) {
    summary.vehicleCount += 1;
    if (v.status === "available") summary.availableCount += 1;
    if (v.status === "booked") summary.bookedCount += 1;
    if (v.status === "maintenance") summary.maintenanceCount += 1;
  }

  return { ...location, ...summary };
}

/**
 * Public per-location car counts, from the location_fleet_counts view
 * (migration 0009) — `vehicles` itself is staff-only, so an anon client
 * querying it directly would silently count zero.
 */
export async function getLocationFleetCounts(supabase: Client): Promise<Map<string, number>> {
  const { data, error } = await supabase.from("location_fleet_counts").select("location_id, vehicle_count");
  if (error) throw error;
  return new Map((data ?? []).flatMap((r) => (r.location_id ? [[r.location_id, r.vehicle_count ?? 0] as const] : [])));
}

/** A location's SEO title with its `{from_price}` placeholder filled from live rates (migration 0009). */
export function locationSeoTitle(location: Pick<Location, "name" | "seo_title">, fromPrice: string | null): string {
  const title = location.seo_title ?? `Car Rental in ${location.name} | Rent Next Car Hire`;
  return fromPrice ? title.replace("{from_price}", fromPrice) : title.replace(/ from \{from_price\}\/day/, "");
}
