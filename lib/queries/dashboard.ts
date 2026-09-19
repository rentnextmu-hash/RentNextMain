import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { VehicleStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;

export type FleetStats = {
  total: number;
  available: number;
  booked: number;
  maintenance: number;
  inactive: number;
};

export async function getFleetStats(supabase: Client): Promise<FleetStats> {
  const { data, error } = await supabase.from("vehicles").select("status");
  if (error) throw error;

  const stats: FleetStats = { total: 0, available: 0, booked: 0, maintenance: 0, inactive: 0 };
  for (const v of data ?? []) {
    stats.total += 1;
    stats[v.status as VehicleStatus] += 1;
  }
  return stats;
}

// Mauritius has a fixed UTC+4 offset (no DST), but computing "today" from
// the server's own clock would be wrong whenever the server runs in a
// different timezone — so today's boundaries are derived from Mauritius
// local time via Intl, not from server-local midnight.
function mauritiusDayBounds(reference: Date = new Date()): { start: Date; end: Date } {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Mauritius" }).format(reference);
  const start = new Date(`${localDate}T00:00:00+04:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

const TODAY_ACTIVITY_SELECT = `*, customer:customers(*), vehicle:vehicles(*)`;

export async function getTodayActivity(supabase: Client) {
  const { start, end } = mauritiusDayBounds();

  const [{ data: pickups, error: pickupsError }, { data: returns, error: returnsError }] = await Promise.all([
    supabase
      .from("bookings")
      .select(TODAY_ACTIVITY_SELECT)
      .gte("pickup_at", start.toISOString())
      .lt("pickup_at", end.toISOString())
      .in("status", ["confirmed", "active"])
      .order("pickup_at", { ascending: true }),
    supabase
      .from("bookings")
      .select(TODAY_ACTIVITY_SELECT)
      .gte("return_at", start.toISOString())
      .lt("return_at", end.toISOString())
      .eq("status", "active")
      .order("return_at", { ascending: true }),
  ]);

  if (pickupsError) throw pickupsError;
  if (returnsError) throw returnsError;

  return { pickups: pickups ?? [], returns: returns ?? [] };
}

export async function getUpcomingReturns(supabase: Client, withinDays = 7) {
  const now = new Date();
  const until = new Date(now);
  until.setUTCDate(until.getUTCDate() + withinDays);

  const { data, error } = await supabase
    .from("bookings")
    .select(`
      *,
      customer:customers(*),
      category:vehicle_categories(*),
      vehicle:vehicles(*),
      return_location:locations!bookings_return_location_id_fkey(*)
    `)
    .gte("return_at", now.toISOString())
    .lte("return_at", until.toISOString())
    .in("status", ["confirmed", "active"])
    .order("return_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getRecentBookings(supabase: Client, limit = 8) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`*, customer:customers(*), category:vehicle_categories(*)`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
