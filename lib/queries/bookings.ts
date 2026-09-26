import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BookingSource, BookingStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];
export type Booking = Tables["bookings"]["Row"];

export type BookingWithRelations = Booking & {
  customer: Tables["customers"]["Row"];
  category: Tables["vehicle_categories"]["Row"];
  vehicle: Tables["vehicles"]["Row"] | null;
  pickup_location: Tables["locations"]["Row"];
  return_location: Tables["locations"]["Row"];
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
  /** Bookings whose rental overlaps [from, to) — "what's on this week", not just pickups this week. */
  from?: Date | string;
  to?: Date | string;
  status?: BookingStatus | BookingStatus[];
  locationId?: string;
  source?: BookingSource;
  /** Matches reference, or the linked customer's name/email/phone. */
  search?: string;
};

// PostgREST's or() filter syntax treats , ( ) as structure — strip them
// from free text rather than letting a search for "Dubois, Marie" break
// the query.
function sanitiseSearch(search: string): string {
  return search.replace(/[,()*%\\]/g, " ").trim();
}

async function matchingCustomerIds(supabase: Client, search: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((c) => c.id);
}

// The shared filter chain for list, count and export queries. Generic over
// the query builder so it works for both select() and head-count queries.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends { lt: any; gt: any; in: any; eq: any; or: any }>(
  query: Q,
  filters: BookingFilters,
  customerIds: string[],
  { includeStatus = true } = {},
): Q {
  let q = query;
  if (filters.to) q = q.lt("pickup_at", new Date(filters.to).toISOString());
  if (filters.from) q = q.gt("return_at", new Date(filters.from).toISOString());
  if (includeStatus && filters.status) {
    q = Array.isArray(filters.status) ? q.in("status", filters.status) : q.eq("status", filters.status);
  }
  if (filters.locationId) q = q.eq("pickup_location_id", filters.locationId);
  if (filters.source) q = q.eq("source", filters.source);
  if (filters.search) {
    const customerFilter = customerIds.length > 0 ? `,customer_id.in.(${customerIds.join(",")})` : "";
    q = q.or(`reference.ilike.%${filters.search}%${customerFilter}`);
  }
  return q;
}

export async function getBookings(supabase: Client, filters: BookingFilters = {}): Promise<BookingWithRelations[]> {
  const search = filters.search ? sanitiseSearch(filters.search) : "";
  const f = { ...filters, search: search || undefined };
  const customerIds = search ? await matchingCustomerIds(supabase, search) : [];

  const query = applyFilters(
    supabase.from("bookings").select(BOOKING_RELATIONS_SELECT).order("pickup_at", { ascending: false }),
    f,
    customerIds,
  );
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as BookingWithRelations[];
}

export type BookingSort = "pickup_asc" | "pickup_desc" | "created_desc" | "total_desc";

const SORT_ORDER: Record<BookingSort, { column: string; ascending: boolean }> = {
  pickup_asc: { column: "pickup_at", ascending: true },
  pickup_desc: { column: "pickup_at", ascending: false },
  created_desc: { column: "created_at", ascending: false },
  total_desc: { column: "total_mur", ascending: false },
};

export type BookingsPage = {
  rows: BookingWithRelations[];
  total: number;
  /** Per-status counts for the same filters, ignoring the status filter itself. */
  statusCounts: Record<BookingStatus, number>;
};

/** One server-side page of the admin bookings list, plus the status tile counts. */
export async function getBookingsPage(
  supabase: Client,
  filters: BookingFilters,
  { page = 1, pageSize = 25, sort = "pickup_asc" }: { page?: number; pageSize?: number; sort?: BookingSort } = {},
): Promise<BookingsPage> {
  const search = filters.search ? sanitiseSearch(filters.search) : "";
  const f = { ...filters, search: search || undefined };
  const customerIds = search ? await matchingCustomerIds(supabase, search) : [];
  const order = SORT_ORDER[sort];
  const start = (page - 1) * pageSize;

  const statuses: BookingStatus[] = ["requested", "confirmed", "active", "completed", "cancelled"];
  const [pageRes, ...countResults] = await Promise.all([
    applyFilters(
      supabase
        .from("bookings")
        .select(BOOKING_RELATIONS_SELECT, { count: "exact" })
        .order(order.column, { ascending: order.ascending })
        .order("reference", { ascending: true })
        .range(start, start + pageSize - 1),
      f,
      customerIds,
    ),
    ...statuses.map((status) =>
      applyFilters(
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", status),
        f,
        customerIds,
        { includeStatus: false },
      ),
    ),
  ]);

  if (pageRes.error) throw pageRes.error;
  const statusCounts = {} as Record<BookingStatus, number>;
  statuses.forEach((status, i) => {
    if (countResults[i].error) throw countResults[i].error;
    statusCounts[status] = countResults[i].count ?? 0;
  });

  return {
    rows: (pageRes.data ?? []) as unknown as BookingWithRelations[],
    total: pageRes.count ?? 0,
    statusCounts,
  };
}

/**
 * Open bookings (requested or confirmed) with no vehicle yet — the work list
 * for the assignment queue. Soonest pickup first, so the most urgent gaps
 * surface at the top.
 */
export async function getUnassignedBookings(supabase: Client): Promise<BookingWithRelations[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(BOOKING_RELATIONS_SELECT)
    .is("vehicle_id", null)
    .in("status", ["requested", "confirmed"])
    .order("pickup_at", { ascending: true });

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

export type BookingDetail = BookingWithRelations & {
  vehicle: (Tables["vehicles"]["Row"] & { location: Tables["locations"]["Row"] | null }) | null;
  hotel: Tables["hotels"]["Row"] | null;
  booking_add_ons: (Tables["booking_add_ons"]["Row"] & { add_on: Tables["add_ons"]["Row"] })[];
  payments: Tables["payments"]["Row"][];
  internal_notes_editor: { full_name: string | null } | null;
  /** Bookings under the same customer email, including this one. */
  customerBookingCount: number;
};

/** Everything the admin booking detail page shows, in one round trip plus a count. */
export async function getBookingDetail(supabase: Client, reference: string): Promise<BookingDetail | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `*,
       customer:customers(*),
       category:vehicle_categories(*),
       vehicle:vehicles(*, location:locations(*)),
       pickup_location:locations!bookings_pickup_location_id_fkey(*),
       return_location:locations!bookings_return_location_id_fkey(*),
       hotel:hotels(*),
       booking_add_ons(*, add_on:add_ons(*)),
       payments(*),
       internal_notes_editor:profiles!bookings_internal_notes_updated_by_fkey(full_name)`,
    )
    .eq("reference", reference)
    .order("paid_at", { referencedTable: "payments", ascending: true })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const booking = data as unknown as Omit<BookingDetail, "customerBookingCount">;
  const { data: sameEmail, error: countError } = await supabase
    .from("customers")
    .select("bookings(count)")
    // ilike for case-insensitivity only — escape its wildcards, since
    // underscores are common in email addresses.
    .ilike("email", booking.customer.email.replace(/[\\%_]/g, (ch) => `\\${ch}`));
  if (countError) throw countError;

  const customerBookingCount = (sameEmail ?? []).reduce(
    (sum, c) => sum + ((c.bookings as unknown as { count: number }[])[0]?.count ?? 0),
    0,
  );

  return { ...booking, customerBookingCount };
}

/**
 * Assigns (or clears, with null) a booking's vehicle and updates vehicle
 * statuses, atomically — see assign_booking_vehicle() in migration 0007.
 * Check the vehicle is free with lib/availability.ts first.
 */
export async function assignBookingVehicle(supabase: Client, bookingId: string, vehicleId: string | null) {
  const { error } = await supabase.rpc("assign_booking_vehicle", {
    p_booking_id: bookingId,
    // Generated types mark function args non-null; the SQL accepts null (unassign).
    p_vehicle_id: vehicleId as string,
  });
  if (error) throw error;
}

/**
 * Moves a booking to a new status with its side effects (vehicle status,
 * return mileage) in one transaction — see transition_booking() in
 * migration 0007. The database rejects transitions lib/bookingStatus.ts
 * doesn't list.
 */
export async function transitionBooking(
  supabase: Client,
  bookingId: string,
  toStatus: BookingStatus,
  options: { vehicleId?: string; returnMileageKm?: number } = {},
) {
  const { error } = await supabase.rpc("transition_booking", {
    p_booking_id: bookingId,
    p_to_status: toStatus,
    ...(options.vehicleId ? { p_vehicle_id: options.vehicleId } : {}),
    ...(options.returnMileageKm !== undefined ? { p_return_mileage_km: options.returnMileageKm } : {}),
  });
  if (error) throw error;
}
