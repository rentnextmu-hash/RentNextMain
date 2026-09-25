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

// ── Admin (staff-only: reads vehicles, bookings and hotels) ─────────────

export type LocationFleetSummary = { total: number; available: number; booked: number; maintenance: number; inactive: number };

export type LocationAdminRow = Location & { fleet: LocationFleetSummary; bookingsThisMonth: number };

const emptyFleet = (): LocationFleetSummary => ({ total: 0, available: 0, booked: 0, maintenance: 0, inactive: 0 });

/** Every location (active or not) in display order, with fleet status counts and bookings picked up there this month. */
export async function getLocationsAdmin(supabase: Client, monthRange: { start: string; end: string }): Promise<LocationAdminRow[]> {
  const [locationsRes, vehiclesRes, bookingsRes] = await Promise.all([
    supabase.from("locations").select("*").order("display_order", { ascending: true }),
    supabase.from("vehicles").select("location_id, status"),
    supabase
      .from("bookings")
      .select("pickup_location_id")
      .neq("status", "cancelled")
      .gte("pickup_at", monthRange.start)
      .lt("pickup_at", monthRange.end),
  ]);
  for (const r of [locationsRes, vehiclesRes, bookingsRes]) if (r.error) throw r.error;

  const fleet = new Map<string, LocationFleetSummary>();
  for (const v of vehiclesRes.data ?? []) {
    const f = fleet.get(v.location_id) ?? emptyFleet();
    f.total += 1;
    if (v.status in f) f[v.status as keyof Omit<LocationFleetSummary, "total">] += 1;
    fleet.set(v.location_id, f);
  }
  const bookings = new Map<string, number>();
  for (const b of bookingsRes.data ?? []) bookings.set(b.pickup_location_id, (bookings.get(b.pickup_location_id) ?? 0) + 1);

  return (locationsRes.data ?? []).map((l) => ({
    ...l,
    fleet: fleet.get(l.id) ?? emptyFleet(),
    bookingsThisMonth: bookings.get(l.id) ?? 0,
  }));
}

export type LocationVehicleRow = {
  id: string;
  code: string;
  registration: string;
  status: string;
  categoryName: string;
  currentBooking: { reference: string; customerName: string; returnAt: string } | null;
};

export type LocationMovement = {
  reference: string;
  at: string;
  kind: "pickup" | "return";
  status: string;
  customerName: string;
  categoryName: string;
  vehicleCode: string | null;
};

export type LocationAdminDetail = {
  location: Location;
  fleet: LocationFleetSummary;
  vehicles: LocationVehicleRow[];
  movements: LocationMovement[];
  hotels: { id: string; name: string; slug: string; contractStatus: string; isActive: boolean }[];
};

type Named = { first_name: string; last_name: string } | null;
const fullName = (c: Named) => (c ? `${c.first_name} ${c.last_name}` : "—");

/** One location for the admin: its cars, the next seven days of pickups and returns there, and its partner hotels. */
export async function getLocationAdminDetail(supabase: Client, slug: string, now: Date = new Date()): Promise<LocationAdminDetail | null> {
  const { data: location, error } = await supabase.from("locations").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!location) return null;

  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const [vehiclesRes, activeRes, pickupsRes, returnsRes, hotelsRes] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, code, registration, status, category:vehicle_categories(name)")
      .eq("location_id", location.id)
      .order("code"),
    supabase
      .from("bookings")
      .select("reference, vehicle_id, return_at, customer:customers(first_name, last_name)")
      .eq("status", "active")
      .not("vehicle_id", "is", null),
    supabase
      .from("bookings")
      .select("reference, pickup_at, status, customer:customers(first_name, last_name), category:vehicle_categories(name), vehicle:vehicles(code)")
      .eq("pickup_location_id", location.id)
      .in("status", ["requested", "confirmed"])
      .gte("pickup_at", now.toISOString())
      .lt("pickup_at", weekAhead),
    supabase
      .from("bookings")
      .select("reference, return_at, status, customer:customers(first_name, last_name), category:vehicle_categories(name), vehicle:vehicles(code)")
      .eq("return_location_id", location.id)
      .in("status", ["confirmed", "active"])
      .gte("return_at", now.toISOString())
      .lt("return_at", weekAhead),
    supabase.from("hotels").select("id, name, slug, contract_status, is_active").eq("location_id", location.id).order("name"),
  ]);
  for (const r of [vehiclesRes, activeRes, pickupsRes, returnsRes, hotelsRes]) if (r.error) throw r.error;

  const activeByVehicle = new Map(
    (activeRes.data ?? []).map((b) => [
      b.vehicle_id!,
      { reference: b.reference, customerName: fullName(b.customer as Named), returnAt: b.return_at },
    ]),
  );
  const fleet = emptyFleet();
  const vehicles: LocationVehicleRow[] = (vehiclesRes.data ?? []).map((v) => {
    fleet.total += 1;
    if (v.status in fleet) fleet[v.status as keyof Omit<LocationFleetSummary, "total">] += 1;
    return {
      id: v.id,
      code: v.code,
      registration: v.registration,
      status: v.status,
      categoryName: (v.category as { name: string } | null)?.name ?? "—",
      currentBooking: activeByVehicle.get(v.id) ?? null,
    };
  });

  type MovementRow = { reference: string; status: string; customer: unknown; category: unknown; vehicle: unknown };
  const toMovement = (b: MovementRow, at: string, kind: LocationMovement["kind"]): LocationMovement => ({
    reference: b.reference,
    at,
    kind,
    status: b.status,
    customerName: fullName(b.customer as Named),
    categoryName: (b.category as { name: string } | null)?.name ?? "—",
    vehicleCode: (b.vehicle as { code: string } | null)?.code ?? null,
  });
  const movements = [
    ...(pickupsRes.data ?? []).map((b) => toMovement(b, b.pickup_at, "pickup")),
    ...(returnsRes.data ?? []).map((b) => toMovement(b, b.return_at, "return")),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return {
    location,
    fleet,
    vehicles,
    movements,
    hotels: (hotelsRes.data ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      slug: h.slug,
      contractStatus: h.contract_status,
      isActive: h.is_active,
    })),
  };
}
