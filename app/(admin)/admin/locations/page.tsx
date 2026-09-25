import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getLocationsAdmin } from "@/lib/queries/locations";
import { mauritiusMonthRange } from "@/lib/format";
import { LocationList } from "@/components/admin/locations/LocationList";
import { LocationFormButton } from "@/components/admin/locations/LocationForm";

export const metadata = { title: "Locations" };

export default async function AdminLocationsPage() {
  const supabase = await createClient();
  const [locations, staff] = await Promise.all([getLocationsAdmin(supabase, mauritiusMonthRange()), getCurrentStaff()]);
  const canEdit = staff?.role === "owner" || staff?.role === "manager";
  const totals = locations.reduce((sum, l) => sum + l.fleet.total, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text">Locations</h2>
          <p className="text-sm text-text-muted">
            {locations.length} locations · {totals} cars
            {canEdit && " · drag to change the order they appear on the website"}
          </p>
        </div>
        {canEdit && <LocationFormButton />}
      </div>
      <LocationList
        canReorder={canEdit}
        items={locations.map((l) => ({
          id: l.id,
          slug: l.slug,
          name: l.name,
          type: l.type,
          region: l.region,
          isActive: l.is_active,
          isPickupPoint: l.is_pickup_point,
          fleet: l.fleet,
          bookingsThisMonth: l.bookingsThisMonth,
        }))}
      />
    </div>
  );
}
