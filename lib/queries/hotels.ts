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
