import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { VehicleStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

export type VehicleWithRelations = Vehicle & {
  category: Database["public"]["Tables"]["vehicle_categories"]["Row"];
  location: Database["public"]["Tables"]["locations"]["Row"];
};

const VEHICLE_RELATIONS_SELECT = `*, category:vehicle_categories(*), location:locations(*)`;

export type VehicleFilters = {
  locationId?: string;
  categoryId?: string;
  status?: VehicleStatus | VehicleStatus[];
  /** Matches code, registration, or category name. */
  search?: string;
};

export async function getVehicles(supabase: Client, filters: VehicleFilters = {}): Promise<VehicleWithRelations[]> {
  let matchingCategoryIds: string[] = [];
  if (filters.search) {
    const { data: matchingCategories, error } = await supabase
      .from("vehicle_categories")
      .select("id")
      .ilike("name", `%${filters.search}%`);
    if (error) throw error;
    matchingCategoryIds = (matchingCategories ?? []).map((c) => c.id);
  }

  let query = supabase.from("vehicles").select(VEHICLE_RELATIONS_SELECT).order("code", { ascending: true });

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.status) {
    query = Array.isArray(filters.status)
      ? query.in("status", filters.status)
      : query.eq("status", filters.status);
  }
  if (filters.search) {
    const categoryFilter =
      matchingCategoryIds.length > 0 ? `,category_id.in.(${matchingCategoryIds.join(",")})` : "";
    query = query.or(`code.ilike.%${filters.search}%,registration.ilike.%${filters.search}%${categoryFilter}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as VehicleWithRelations[];
}

export async function getVehicleById(supabase: Client, id: string): Promise<VehicleWithRelations | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_RELATIONS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VehicleWithRelations | null;
}

export async function createVehicle(supabase: Client, vehicle: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(supabase: Client, id: string, updates: VehicleUpdate): Promise<Vehicle> {
  const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// ── Add/edit support ────────────────────────────────────────────────────

/**
 * Next free vehicle code for a category, e.g. "VITZ-004". The prefix is
 * whatever the category's existing cars already use; for a category with
 * no cars yet it's derived from the model name. The number is one past
 * the highest code with that prefix across the whole fleet (codes are
 * globally unique), zero-padded to three digits.
 */
export async function suggestVehicleCode(supabase: Client, categoryId: string): Promise<string> {
  const [{ data: category, error: categoryError }, { data: codes, error: codesError }] = await Promise.all([
    supabase.from("vehicle_categories").select("model, name").eq("id", categoryId).maybeSingle(),
    supabase.from("vehicles").select("code, category_id"),
  ]);
  if (categoryError) throw categoryError;
  if (codesError) throw codesError;

  const prefixOf = (code: string) => code.replace(/-\d+$/, "");
  const inCategory = (codes ?? []).filter((v) => v.category_id === categoryId).map((v) => prefixOf(v.code));
  const counts = new Map<string, number>();
  for (const p of inCategory) counts.set(p, (counts.get(p) ?? 0) + 1);

  const derived = (category?.model ?? category?.name ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  const prefix = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? (derived || "CAR");

  const highest = (codes ?? [])
    .filter((v) => prefixOf(v.code) === prefix)
    .reduce((max, v) => Math.max(max, Number(v.code.slice(prefix.length + 1)) || 0), 0);

  return `${prefix}-${String(highest + 1).padStart(3, "0")}`;
}

/** Which of code / registration are already taken by another vehicle. */
export async function findVehicleConflicts(
  supabase: Client,
  values: { code: string; registration: string },
  excludeVehicleId?: string,
): Promise<{ code: boolean; registration: boolean }> {
  let query = supabase
    .from("vehicles")
    .select("id, code, registration")
    // Quoted: registrations contain spaces. Both values are already restricted
    // to [A-Z0-9 -] by vehicleFormSchema.
    .or(`code.eq."${values.code}",registration.eq."${values.registration}"`);
  if (excludeVehicleId) query = query.neq("id", excludeVehicleId);
  const { data, error } = await query;
  if (error) throw error;
  return {
    code: (data ?? []).some((v) => v.code === values.code),
    registration: (data ?? []).some((v) => v.registration === values.registration),
  };
}

// ── Detail page ─────────────────────────────────────────────────────────

export type VehicleBooking = Database["public"]["Tables"]["bookings"]["Row"] & {
  customer: { first_name: string; last_name: string } | null;
  pickup_location: { name: string } | null;
  return_location: { name: string } | null;
};

export async function getVehicleBookings(supabase: Client, vehicleId: string): Promise<VehicleBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*, customer:customers(first_name, last_name),
       pickup_location:locations!bookings_pickup_location_id_fkey(name),
       return_location:locations!bookings_return_location_id_fkey(name)`,
    )
    .eq("vehicle_id", vehicleId)
    .order("pickup_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VehicleBooking[];
}

export type VehicleStats = {
  totalBookings: number;
  daysRentedThisYear: number;
  /** Share of this year's days so far (or since acquisition, if later) spent on rent, 0-100. */
  utilisationPct: number;
  revenueMur: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Operational stats from a vehicle's bookings. Counts rentals that are or
 * were actually on the road (active, completed) plus confirmed ones, never
 * requested or cancelled. Revenue is the stored booking totals — no
 * pricing is recalculated here.
 */
export function vehicleStats(
  bookings: VehicleBooking[],
  acquiredAt: string | null,
  now: Date = new Date(),
): VehicleStats {
  const counted = bookings.filter((b) => ["confirmed", "active", "completed"].includes(b.status));
  const yearStart = new Date(`${now.getUTCFullYear()}-01-01T00:00:00+04:00`);
  const windowStart = acquiredAt && new Date(acquiredAt) > yearStart ? new Date(acquiredAt) : yearStart;

  let rentedMs = 0;
  for (const b of counted) {
    const start = Math.max(new Date(b.pickup_at).getTime(), windowStart.getTime());
    const end = Math.min(new Date(b.return_at).getTime(), now.getTime());
    if (end > start) rentedMs += end - start;
  }
  const windowMs = Math.max(DAY_MS, now.getTime() - windowStart.getTime());

  return {
    totalBookings: counted.length,
    daysRentedThisYear: Math.round(rentedMs / DAY_MS),
    utilisationPct: Math.min(100, Math.round((rentedMs / windowMs) * 100)),
    revenueMur: counted.reduce((sum, b) => sum + b.total_mur, 0),
  };
}
