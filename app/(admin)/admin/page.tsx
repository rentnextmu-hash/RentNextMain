import Link from "next/link";
import { Car, CheckCircle2, Wrench, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFleetStats, getTodayActivity, getRecentBookings, getUpcomingReturns } from "@/lib/queries/dashboard";
import { getActiveCategories } from "@/lib/queries/categories";
import { StatCard } from "@/components/admin/StatCard";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatMUR, formatDate } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [fleet, activity, recentBookings, upcomingReturns, categories] = await Promise.all([
    getFleetStats(supabase),
    getTodayActivity(supabase),
    getRecentBookings(supabase, 8),
    getUpcomingReturns(supabase, 7),
    getActiveCategories(supabase),
  ]);

  const availablePct = fleet.total > 0 ? Math.round((fleet.available / fleet.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total fleet"
          value={fleet.total}
          supporting={`${categories.length} categories`}
          icon={Car}
        />
        <StatCard
          label="Available now"
          value={fleet.available}
          supporting={`${availablePct}% of fleet`}
          icon={CheckCircle2}
          accent="success"
        />
        <StatCard
          label="On rent"
          value={fleet.booked}
          supporting={`${activity.pickups.length} pickups today`}
          icon={Clock}
          accent="info"
        />
        <StatCard
          label="In maintenance"
          value={fleet.maintenance}
          icon={Wrench}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
          <h2 className="font-semibold text-text">Today&apos;s Activity</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-muted">Pickups today</p>
              <p className="text-2xl font-semibold text-text">{activity.pickups.length}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">Returns today</p>
              <p className="text-2xl font-semibold text-text">{activity.returns.length}</p>
            </div>
          </div>

          {activity.pickups.length + activity.returns.length === 0 ? (
            <EmptyState title="Nothing scheduled today" className="py-8" />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {(activity.pickups as unknown as { id: string; pickup_at: string; customer: { first_name: string; last_name: string } | null; vehicle: { code: string } | null }[]).map((b) => (
                <li key={`pickup-${b.id}`} className="flex items-center justify-between border-t border-admin-border pt-2 first:border-t-0 first:pt-0">
                  <span className="text-text">
                    {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"}
                  </span>
                  <span className="font-mono text-text-muted">{b.vehicle?.code ?? "Unassigned"}</span>
                </li>
              ))}
              {(activity.returns as unknown as { id: string; return_at: string; customer: { first_name: string; last_name: string } | null; vehicle: { code: string } | null }[]).map((b) => (
                <li key={`return-${b.id}`} className="flex items-center justify-between border-t border-admin-border pt-2">
                  <span className="text-text">
                    {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"} (return)
                  </span>
                  <span className="font-mono text-text-muted">{b.vehicle?.code ?? "Unassigned"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
          <h2 className="font-semibold text-text">Recent Bookings</h2>
          {recentBookings.length === 0 ? (
            <EmptyState title="No bookings yet" className="py-8" />
          ) : (
            <ul className="mt-4 space-y-3">
              {(recentBookings as unknown as {
                id: string;
                reference: string;
                total_mur: number;
                status: string;
                source: string;
                pickup_at: string;
                customer: { first_name: string; last_name: string } | null;
                category: { name: string } | null;
              }[]).map((b) => (
                <li key={b.id} className="flex items-center justify-between border-t border-admin-border pt-3 first:border-t-0 first:pt-0">
                  <div>
                    <Link href={`/admin/bookings/${b.reference}`} className="font-mono text-sm font-semibold text-text hover:text-primary hover:underline">
                      {b.reference}
                    </Link>
                    <p className="text-sm text-text-muted">
                      {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"} &middot; {b.category?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusPill status={b.status} />
                    <p className="mt-1 text-sm font-medium text-text">{formatMUR(b.total_mur)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
        <h2 className="font-semibold text-text">Upcoming Returns (next 7 days)</h2>
        {upcomingReturns.length === 0 ? (
          <EmptyState title="No returns due in the next 7 days" className="py-8" />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-admin-border text-text-muted">
                  <th className="pb-2 font-medium">Vehicle</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Return date</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(upcomingReturns as unknown as {
                  id: string;
                  return_at: string;
                  status: string;
                  vehicle: { code: string } | null;
                  customer: { first_name: string; last_name: string } | null;
                  category: { name: string } | null;
                }[]).map((b) => (
                  <tr key={b.id} className="border-b border-admin-border last:border-b-0">
                    <td className="py-2.5 font-mono">{b.vehicle?.code ?? "Unassigned"}</td>
                    <td className="py-2.5">
                      {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"}
                    </td>
                    <td className="py-2.5 text-text-muted">{b.category?.name}</td>
                    <td className="py-2.5">{formatDate(b.return_at)}</td>
                    <td className="py-2.5">
                      <StatusPill status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
