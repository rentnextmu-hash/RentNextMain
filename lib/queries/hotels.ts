import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ContractStatus } from "@/types/enums";
import { calculateCommission } from "@/lib/pricing";

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

// ── Admin (P9.2) ────────────────────────────────────────────────────────

export type HotelPerformance = {
  /** Bookings the hotel referred (source = 'hotel'), not cancelled. */
  referredBookings: number;
  referredRevenueMur: number;
  commissionMur: number;
};

export type HotelAdminRow = Hotel & {
  location: { name: string; slug: string } | null;
  thisMonth: HotelPerformance;
};

type BookingForStats = { hotel_id: string | null; source: string; status: string; total_mur: number; pickup_at: string };

/**
 * Commission is owed on bookings the hotel referred (source 'hotel') —
 * not on website customers who merely chose delivery to that hotel, even
 * though those bookings carry the same hotel_id.
 */
function performance(bookings: BookingForStats[], commissionRatePct: number): HotelPerformance {
  const referred = bookings.filter((b) => b.source === "hotel" && b.status !== "cancelled");
  const revenue = referred.reduce((sum, b) => sum + b.total_mur, 0);
  return {
    referredBookings: referred.length,
    referredRevenueMur: revenue,
    commissionMur: calculateCommission(revenue, commissionRatePct),
  };
}

const inRange = (at: string, range: { start: string; end: string }) =>
  new Date(at) >= new Date(range.start) && new Date(at) < new Date(range.end);

export async function getHotelsAdmin(
  supabase: Client,
  monthRange: { start: string; end: string },
  filters: HotelFilters = {},
): Promise<HotelAdminRow[]> {
  let hotelsQuery = supabase.from("hotels").select("*, location:locations(name, slug)").order("name");
  if (filters.contractStatus) hotelsQuery = hotelsQuery.eq("contract_status", filters.contractStatus);
  if (filters.locationId) hotelsQuery = hotelsQuery.eq("location_id", filters.locationId);

  const [hotelsRes, bookingsRes] = await Promise.all([
    hotelsQuery,
    supabase
      .from("bookings")
      .select("hotel_id, source, status, total_mur, pickup_at")
      .not("hotel_id", "is", null)
      .gte("pickup_at", monthRange.start)
      .lt("pickup_at", monthRange.end),
  ]);
  if (hotelsRes.error) throw hotelsRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  return (hotelsRes.data ?? []).map((h) => ({
    ...h,
    location: h.location as { name: string; slug: string } | null,
    thisMonth: performance(
      (bookingsRes.data ?? []).filter((b) => b.hotel_id === h.id),
      Number(h.commission_rate),
    ),
  }));
}

export type HotelBookingRow = BookingForStats & {
  reference: string;
  return_at: string;
  customer: { first_name: string; last_name: string } | null;
  category: { name: string } | null;
};

export type HotelAdminDetail = {
  hotel: Hotel & { location: { id: string; name: string; slug: string } | null };
  bookings: HotelBookingRow[];
  thisMonth: HotelPerformance;
  allTime: HotelPerformance;
};

export async function getHotelAdminDetail(
  supabase: Client,
  slug: string,
  monthRange: { start: string; end: string },
): Promise<HotelAdminDetail | null> {
  const { data: hotel, error } = await supabase
    .from("hotels")
    .select("*, location:locations(id, name, slug)")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!hotel) return null;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(
      "reference, hotel_id, source, status, total_mur, pickup_at, return_at, customer:customers(first_name, last_name), category:vehicle_categories(name)",
    )
    .eq("hotel_id", hotel.id)
    .order("pickup_at", { ascending: false });
  if (bookingsError) throw bookingsError;

  const rows = (bookings ?? []) as unknown as HotelBookingRow[];
  const rate = Number(hotel.commission_rate);
  return {
    hotel: { ...hotel, location: hotel.location as HotelAdminDetail["hotel"]["location"] },
    bookings: rows,
    thisMonth: performance(rows.filter((b) => inRange(b.pickup_at, monthRange)), rate),
    allTime: performance(rows, rate),
  };
}
