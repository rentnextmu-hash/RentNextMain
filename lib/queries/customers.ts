import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export type CustomerMatch = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string | null;
  bookingCount: number;
};

/** Staff-only (customers is staff RLS). Matches name, email or phone; newest first. */
export async function searchCustomers(supabase: Client, query: string, limit = 8): Promise<CustomerMatch[]> {
  // PostgREST's or() treats , ( ) as syntax — strip them from free text.
  const q = query.replace(/[,()*%\\]/g, " ").trim();
  if (q.length < 2) return [];

  const { data, error } = await supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone, country, bookings(count)")
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((c) => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email,
    phone: c.phone,
    country: c.country,
    bookingCount: (c.bookings as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

// ── Admin customers section (V2 Admin) ──────────────────────────────────

export type CustomerStats = {
  bookings: number; // non-cancelled
  totalSpentMur: number; // sum of non-cancelled totals
  lastBookingAt: string | null;
  isRepeat: boolean;
};

export type CustomerAdminRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string | null;
  createdAt: string;
  stats: CustomerStats;
};

export type CustomersPage = { rows: CustomerAdminRow[]; total: number };

const EMPTY_STATS: CustomerStats = { bookings: 0, totalSpentMur: 0, lastBookingAt: null, isRepeat: false };

/** Aggregate each customer's non-cancelled bookings into CustomerStats, in JS. */
function statsByCustomer(bookings: { customer_id: string; status: string; total_mur: number; pickup_at: string }[]): Map<string, CustomerStats> {
  const map = new Map<string, CustomerStats>();
  for (const b of bookings) {
    if (b.status === "cancelled") continue;
    const s = map.get(b.customer_id) ?? { ...EMPTY_STATS };
    s.bookings += 1;
    s.totalSpentMur += b.total_mur;
    if (!s.lastBookingAt || b.pickup_at > s.lastBookingAt) s.lastBookingAt = b.pickup_at;
    s.isRepeat = s.bookings > 1;
    map.set(b.customer_id, s);
  }
  return map;
}

/** One page of customers (newest first, or matching a search) with booking aggregates. */
export async function getCustomersPage(
  supabase: Client,
  { search, page = 1, pageSize = 25 }: { search?: string; page?: number; pageSize?: number } = {},
): Promise<CustomersPage> {
  const q = (search ?? "").replace(/[,()*%\\]/g, " ").trim();
  let query = supabase
    .from("customers")
    .select("id, first_name, last_name, email, phone, country, created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  if (q.length >= 2) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const start = (page - 1) * pageSize;
  const { data: customers, count, error } = await query.range(start, start + pageSize - 1);
  if (error) throw error;

  const ids = (customers ?? []).map((c) => c.id);
  const { data: bookings, error: bookingsError } = ids.length
    ? await supabase.from("bookings").select("customer_id, status, total_mur, pickup_at").in("customer_id", ids)
    : { data: [], error: null };
  if (bookingsError) throw bookingsError;
  const stats = statsByCustomer(bookings ?? []);

  return {
    total: count ?? 0,
    rows: (customers ?? []).map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      email: c.email,
      phone: c.phone,
      country: c.country,
      createdAt: c.created_at,
      stats: stats.get(c.id) ?? { ...EMPTY_STATS },
    })),
  };
}

export type CustomerBookingRow = {
  reference: string;
  status: string;
  source: string;
  pickup_at: string;
  return_at: string;
  total_mur: number;
  category: { name: string } | null;
  pickup_location: { name: string } | null;
};

export type CustomerDetail = {
  customer: Database["public"]["Tables"]["customers"]["Row"] & { hotel: { name: string; slug: string } | null };
  bookings: CustomerBookingRow[];
  stats: CustomerStats & { firstBookingAt: string | null };
};

export async function getCustomerDetail(supabase: Client, id: string): Promise<CustomerDetail | null> {
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*, hotel:hotels(name, slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!customer) return null;

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("reference, status, source, pickup_at, return_at, total_mur, category:vehicle_categories(name), pickup_location:locations!bookings_pickup_location_id_fkey(name)")
    .eq("customer_id", id)
    .order("pickup_at", { ascending: false });
  if (bookingsError) throw bookingsError;

  const rows = (bookings ?? []) as unknown as CustomerBookingRow[];
  const counted = rows.filter((b) => b.status !== "cancelled");
  const pickups = counted.map((b) => b.pickup_at).sort();

  return {
    customer: { ...customer, hotel: customer.hotel as { name: string; slug: string } | null },
    bookings: rows,
    stats: {
      bookings: counted.length,
      totalSpentMur: counted.reduce((sum, b) => sum + b.total_mur, 0),
      lastBookingAt: pickups.at(-1) ?? null,
      firstBookingAt: pickups[0] ?? null,
      isRepeat: counted.length > 1,
    },
  };
}
