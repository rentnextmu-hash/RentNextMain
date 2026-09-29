import { Lock, CalendarCheck, Banknote, KeyRound, CarFront } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getReportsSummary } from "@/lib/queries/reports";
import { formatMUR } from "@/lib/format";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarList, type Bar } from "@/components/admin/reports/BarList";
import type { BookingStatus } from "@/types/enums";

export const metadata = { title: "Reports" };

// Compact money for chart labels: "Rs 1.2M" / "Rs 45k".
function compactMUR(mur: number): string {
  if (mur >= 1_000_000) return `Rs ${(mur / 1_000_000).toFixed(1)}M`;
  if (mur >= 10_000) return `Rs ${Math.round(mur / 1000)}k`;
  return formatMUR(mur);
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      {hint && <p className="mb-3 mt-0.5 text-xs text-text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-4"}>{children}</div>
    </section>
  );
}

export default async function ReportsPage() {
  const staff = await getCurrentStaff();
  if (staff?.role !== "owner" && staff?.role !== "manager") {
    return (
      <div>
        <h2 className="text-xl font-semibold text-text">Reports</h2>
        <EmptyState
          icon={<Lock className="h-10 w-10" strokeWidth={1.25} />}
          title="Owner and manager access only"
          description="Business reports are visible to the owner and managers. Ask them if you need a figure."
          className="mt-4 rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      </div>
    );
  }

  const supabase = await createClient();
  const r = await getReportsSummary(supabase);

  const onRent = r.fleet.booked;
  const operable = r.fleet.available + r.fleet.booked;
  const utilisation = operable > 0 ? Math.round((onRent / operable) * 100) : 0;

  const monthBars: Bar[] = r.byMonth.map((m) => ({
    label: m.label,
    value: m.revenueMur,
    valueLabel: m.revenueMur > 0 ? compactMUR(m.revenueMur) : "—",
  }));
  const sourceBars: Bar[] = r.bySource.map((s) => ({
    label: s.label,
    value: s.count,
    valueLabel: `${s.count} · ${compactMUR(s.revenueMur)}`,
  }));
  const categoryBars: Bar[] = r.topCategories.map((c) => ({
    label: c.label,
    value: c.revenueMur,
    valueLabel: compactMUR(c.revenueMur),
  }));
  const locationBars: Bar[] = r.byLocation.map((l) => ({
    label: l.label,
    value: l.count,
    valueLabel: `${l.count} · ${compactMUR(l.revenueMur)}`,
  }));

  const maxStatus = Math.max(1, ...r.byStatus.map((s) => s.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-text">Reports</h2>
        <p className="text-sm text-text-muted">
          Booked revenue counts confirmed, active and completed rentals — requests and cancellations are excluded.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Booked revenue" value={formatMUR(r.bookedRevenueMur)} supporting="Confirmed + active + completed" icon={Banknote} accent="success" />
        <StatCard label="Bookings" value={r.totalBookings} supporting={`Avg ${formatMUR(r.avgBookingValueMur)} each`} icon={CalendarCheck} />
        <StatCard label="Active rentals" value={r.activeRentals} supporting={`${r.upcomingPickups} upcoming pickup${r.upcomingPickups === 1 ? "" : "s"}`} icon={KeyRound} accent="info" />
        <StatCard
          label="Fleet on rent"
          value={`${onRent}/${operable}`}
          supporting={`${utilisation}% utilisation · ${r.fleet.maintenance} in maintenance`}
          icon={CarFront}
          accent={r.fleet.maintenance > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Revenue by month" hint="Booked revenue, by pickup month, last 6 months">
          <BarList bars={monthBars} />
        </Panel>

        <Panel title="Bookings by status" hint="All bookings, all time">
          <ul className="space-y-2.5">
            {r.byStatus.map((s) => (
              <li key={s.status} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
                <StatusPill status={s.status as BookingStatus} />
                <span className="h-2.5 rounded-full bg-surface-alt" aria-hidden="true">
                  <span className="block h-2.5 rounded-full bg-primary" style={{ width: `${Math.max(s.count === 0 ? 0 : 4, (s.count / maxStatus) * 100)}%` }} />
                </span>
                <span className="tabular-nums font-medium text-text">{s.count}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Top categories" hint="By booked revenue">
          <BarList bars={categoryBars} />
        </Panel>

        <Panel title="Bookings by source" hint="Count · booked revenue">
          <BarList bars={sourceBars} />
        </Panel>

        <Panel title="Pickups by location" hint="Count · booked revenue">
          <BarList bars={locationBars} />
        </Panel>

        <Panel title="Fleet status" hint="Every vehicle, right now">
          <BarList
            bars={[
              { label: "Available", value: r.fleet.available, valueLabel: String(r.fleet.available) },
              { label: "On rent", value: r.fleet.booked, valueLabel: String(r.fleet.booked) },
              { label: "Maintenance", value: r.fleet.maintenance, valueLabel: String(r.fleet.maintenance) },
              { label: "Inactive", value: r.fleet.inactive, valueLabel: String(r.fleet.inactive) },
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
