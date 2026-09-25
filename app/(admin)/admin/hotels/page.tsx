import Link from "next/link";
import { Building2, CalendarCheck, Banknote } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getHotelsAdmin } from "@/lib/queries/hotels";
import { getActiveLocations } from "@/lib/queries/locations";
import { formatMUR, mauritiusMonthRange } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { HotelFormButton } from "@/components/admin/hotels/HotelForm";
import type { ContractStatus } from "@/types/enums";

const STATUSES: ContractStatus[] = ["active", "pending", "inactive"];

export default async function AdminHotelsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; location?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as ContractStatus) ? (params.status as ContractStatus) : undefined;
  const supabase = await createClient();
  const [locations, staff] = await Promise.all([getActiveLocations(supabase), getCurrentStaff()]);
  const location = locations.find((l) => l.slug === params.location);
  const month = mauritiusMonthRange();

  // Stat cards cover every partner; the table honours the filters.
  const [all, hotels] = await Promise.all([
    getHotelsAdmin(supabase, month),
    getHotelsAdmin(supabase, month, { contractStatus: status, locationId: location?.id }),
  ]);
  const canEdit = staff?.role === "owner" || staff?.role === "manager";
  const activePartners = all.filter((h) => h.is_active && h.contract_status === "active").length;
  const referred = all.reduce((sum, h) => sum + h.thisMonth.referredBookings, 0);
  const revenue = all.reduce((sum, h) => sum + h.thisMonth.referredRevenueMur, 0);
  const commission = all.reduce((sum, h) => sum + h.thisMonth.commissionMur, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text">Hotel partners</h2>
          <p className="text-sm text-text-muted">{all.length} hotels · figures are for bookings picked up this month</p>
        </div>
        {canEdit && <HotelFormButton locations={locations.map((l) => ({ id: l.id, name: l.name }))} />}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active partners" value={activePartners} icon={Building2} accent="success" />
        <StatCard label="Referred bookings this month" value={referred} icon={CalendarCheck} accent="info" />
        <StatCard
          label="Referred revenue this month"
          value={formatMUR(revenue)}
          supporting={`${formatMUR(commission)} commission`}
          icon={Banknote}
        />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Select name="status" label="Contract" defaultValue={status ?? ""}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
        <div className="w-48">
          <Select name="location" label="Location" defaultValue={location?.slug ?? ""}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(status || location) && (
          <Link href="/admin/hotels" className="mb-2.5 text-sm text-primary hover:underline">
            Clear
          </Link>
        )}
      </form>

      {hotels.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-10 w-10" strokeWidth={1.25} />}
          title="No hotels match these filters"
          className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      ) : (
        <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-surface-alt text-text-muted">
                <th className="px-4 py-3 font-medium">Hotel</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 text-right font-medium">Commission</th>
                <th className="px-4 py-3 text-right font-medium">Bookings this month</th>
                <th className="px-4 py-3 text-right font-medium">Revenue this month</th>
              </tr>
            </thead>
            <tbody>
              {hotels.map((h) => (
                <tr key={h.id} className="border-b border-admin-border last:border-b-0 hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <Link href={`/admin/hotels/${h.slug}`} className="font-medium text-text hover:text-primary hover:underline">
                      {h.name}
                    </Link>
                    {!h.is_active && <span className="ml-2 text-xs text-text-muted">(partnership paused)</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{h.location?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={h.contract_status} />
                  </td>
                  <td className="px-4 py-3 text-right text-text">{Number(h.commission_rate)}%</td>
                  <td className="px-4 py-3 text-right text-text">{h.thisMonth.referredBookings}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">
                    {formatMUR(h.thisMonth.referredRevenueMur)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
