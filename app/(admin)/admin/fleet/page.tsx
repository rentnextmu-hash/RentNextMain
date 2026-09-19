import { createClient } from "@/lib/supabase/server";
import { getVehicles } from "@/lib/queries/vehicles";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Car } from "lucide-react";

export default async function FleetPage() {
  const supabase = await createClient();
  const vehicles = await getVehicles(supabase);

  const summary = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "available").length,
    booked: vehicles.filter((v) => v.status === "booked").length,
    maintenance: vehicles.filter((v) => v.status === "maintenance").length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text">Fleet</h2>
          <p className="text-sm text-text-muted">
            {summary.total} vehicles &middot; {summary.available} available &middot; {summary.booked} on rent &middot;{" "}
            {summary.maintenance} in maintenance
          </p>
        </div>
      </div>

      {vehicles.length === 0 ? (
        <EmptyState
          icon={<Car className="h-10 w-10" strokeWidth={1.25} />}
          title="No vehicles yet"
          className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-surface-alt text-text-muted">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Registration</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Mileage</th>
                <th className="px-4 py-3 font-medium">Year</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="border-b border-admin-border last:border-b-0 hover:bg-surface-alt">
                  <td className="px-4 py-3 font-mono font-semibold text-text">{v.code}</td>
                  <td className="px-4 py-3 text-text">{v.category?.name}</td>
                  <td className="px-4 py-3 font-mono text-text-muted">{v.registration}</td>
                  <td className="px-4 py-3 text-text-muted">{v.location?.name}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={v.status} />
                  </td>
                  <td className="px-4 py-3 text-text-muted">{v.mileage_km.toLocaleString("en-US")} km</td>
                  <td className="px-4 py-3 text-text-muted">{v.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
