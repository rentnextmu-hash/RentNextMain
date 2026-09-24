import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ContractStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;
export type Hotel = Database["public"]["Tables"]["hotels"]["Row"];

export type HotelFilters = {
  contractStatus?: ContractStatus;
  locationId?: string;
};

export async function getHotels(supabase: Client, filters: HotelFilters = {}) {
  let query = supabase.from("hotels").select("*, location:locations(*)").order("name", { ascending: true });

  if (filters.contractStatus) query = query.eq("contract_status", filters.contractStatus);
  if (filters.locationId) query = query.eq("location_id", filters.locationId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getHotelById(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("hotels")
    .select("*, location:locations(*)")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type HotelBookingSummary = {
  bookingsThisMonth: number;
  revenueThisMonthMur: number;
  bookingsAllTime: number;
  revenueAllTimeMur: number;
};

export async function getHotelBookingSummary(supabase: Client, hotelId: string): Promise<HotelBookingSummary> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("bookings")
    .select("total_mur, created_at")
    .eq("hotel_id", hotelId)
    .neq("status", "cancelled");

  if (error) throw error;

  const rows = data ?? [];
  const thisMonth = rows.filter((b) => new Date(b.created_at) >= startOfMonth);

  return {
    bookingsThisMonth: thisMonth.length,
    revenueThisMonthMur: thisMonth.reduce((sum, b) => sum + b.total_mur, 0),
    bookingsAllTime: rows.length,
    revenueAllTimeMur: rows.reduce((sum, b) => sum + b.total_mur, 0),
  };
}

export type PartnerHotel = { id: string; name: string; slug: string; locationId: string | null };

/**
 * Active partner hotels for the public booking flow's "deliver to my
 * hotel" select. Reads the public_partner_hotels view (migration 0006),
 * not `hotels` — the table itself is staff-only because it holds contact
 * details and commission rates.
 */
export async function getPartnerHotels(supabase: Client): Promise<PartnerHotel[]> {
  const { data, error } = await supabase
    .from("public_partner_hotels")
    .select("id, name, slug, location_id")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).flatMap((h) =>
    h.id && h.name && h.slug ? [{ id: h.id, name: h.name, slug: h.slug, locationId: h.location_id }] : [],
  );
}
