import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, BookingStatus } from "@/types/database";

type Client = SupabaseClient<Database>;
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export type BookingWithRelations = Booking & {
  customer: Database["public"]["Tables"]["customers"]["Row"];
  category: Database["public"]["Tables"]["vehicle_categories"]["Row"];
  vehicle: Database["public"]["Tables"]["vehicles"]["Row"] | null;
  pickup_location: Database["public"]["Tables"]["locations"]["Row"];
  return_location: Database["public"]["Tables"]["locations"]["Row"];
};

// pickup_location/return_location both reference `locations`, so PostgREST
// needs the explicit FK constraint name to disambiguate the embed. Names
// follow Postgres's default <table>_<column>_fkey convention from 0001.
const BOOKING_RELATIONS_SELECT = `
  *,
  customer:customers(*),
  category:vehicle_categories(*),
  vehicle:vehicles(*),
  pickup_location:locations!bookings_pickup_location_id_fkey(*),
  return_location:locations!bookings_return_location_id_fkey(*)
`;

export type BookingFilters = {
  from?: Date | string;
  to?: Date | string;
  status?: BookingStatus | BookingStatus[];
  locationId?: string;
  /** Matches reference, or the linked customer's name/email/phone. */
  search?: string;
};

export async function getBookings(supabase: Client, filters: BookingFilters = {}): Promise<BookingWithRelations[]> {
  let matchingCustomerIds: string[] = [];
  if (filters.search) {
    const { data: matchingCustomers, error } = await supabase
      .from("customers")
      .select("id")
      .or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`,
      );
    if (error) throw error;
    matchingCustomerIds = (matchingCustomers ?? []).map((c) => c.id);
  }

  let query = supabase.from("bookings").select(BOOKING_RELATIONS_SELECT).order("pickup_at", { ascending: false });

  if (filters.from) query = query.gte("pickup_at", new Date(filters.from).toISOString());
  if (filters.to) query = query.lte("pickup_at", new Date(filters.to).toISOString());
  if (filters.status) {
    query = Array.isArray(filters.status)
      ? query.in("status", filters.status)
      : query.eq("status", filters.status);
  }
  if (filters.locationId) query = query.eq("pickup_location_id", filters.locationId);
  if (filters.search) {
    const customerFilter =
      matchingCustomerIds.length > 0 ? `,customer_id.in.(${matchingCustomerIds.join(",")})` : "";
    query = query.or(`reference.ilike.%${filters.search}%${customerFilter}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BookingWithRelations[];
}

export async function getBookingByReference(
  supabase: Client,
  reference: string,
): Promise<BookingWithRelations | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_RELATIONS_SELECT)
    .eq("reference", reference)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as BookingWithRelations | null;
}

export async function getBookingById(supabase: Client, id: string): Promise<BookingWithRelations | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_RELATIONS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as BookingWithRelations | null;
}

export async function updateBookingStatus(supabase: Client, id: string, status: BookingStatus): Promise<Booking> {
  const { data, error } = await supabase.from("bookings").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function assignVehicle(supabase: Client, bookingId: string, vehicleId: string): Promise<Booking> {
  const { data, error } = await supabase
    .from("bookings")
    .update({ vehicle_id: vehicleId })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
