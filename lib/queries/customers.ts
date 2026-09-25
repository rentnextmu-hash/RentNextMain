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
