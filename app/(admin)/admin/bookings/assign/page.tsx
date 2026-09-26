import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUnassignedBookings } from "@/lib/queries/bookings";
import { rankVehiclesForBooking } from "@/lib/assignment";
import { formatDateRange, daysBetween } from "@/lib/format";
import { AssignQueue, type QueueRow } from "@/components/admin/bookings/AssignQueue";

export const metadata = { title: "Assignment queue" };

export default async function AssignQueuePage() {
  const supabase = await createClient();
  const bookings = await getUnassignedBookings(supabase);

  // Rank the fleet for each gap. These read the staff-only `vehicles` table,
  // so they run server-side with the staff session; a handful of unassigned
  // bookings at a time makes the fan-out cheap.
  const rows: QueueRow[] = await Promise.all(
    bookings.map(async (b) => {
      const vehicles = await rankVehiclesForBooking(supabase, {
        categoryId: b.category_id,
        pickupAt: b.pickup_at,
        returnAt: b.return_at,
        pickupLocationId: b.pickup_location_id,
        returnLocationId: b.return_location_id,
      });
      return {
        booking: {
          id: b.id,
          reference: b.reference,
          status: b.status,
          vehicleId: null,
          vehicleCode: null,
          vehicleMileageKm: null,
          categoryName: b.category.name,
          pickupLocationId: b.pickup_location_id,
        },
        customerName: `${b.customer.first_name} ${b.customer.last_name}`,
        categoryName: b.category.name,
        dateRange: formatDateRange(b.pickup_at, b.return_at),
        days: daysBetween(b.pickup_at, b.return_at),
        pickupLocationName: b.pickup_location.name,
        vehicles,
      };
    }),
  );

  return (
    <div className="space-y-4">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All bookings
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-text">Assignment queue</h2>
        <p className="text-sm text-text-muted">
          Open bookings with no vehicle yet, soonest pickup first. The engine ranks every free car by location, fleet
          load and mileage — assign the recommendation or pick another.
        </p>
      </div>
      <AssignQueue rows={rows} />
    </div>
  );
}
