import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
type Tables = Database["public"]["Tables"];

export type Inspection = Tables["booking_inspections"]["Row"] & {
  inspector: { full_name: string | null } | null;
};

/** Both inspections for a booking (check-out first, then check-in). */
export async function getBookingInspections(supabase: Client, bookingId: string): Promise<Inspection[]> {
  const { data, error } = await supabase
    .from("booking_inspections")
    .select("*, inspector:profiles!booking_inspections_inspected_by_fkey(full_name)")
    .eq("booking_id", bookingId)
    // 'checkin' < 'checkout' alphabetically, so order by kind desc to show
    // check-out (handover) before check-in (return).
    .order("kind", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Inspection[];
}
