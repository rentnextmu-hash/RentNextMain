import Link from "next/link";
import { CalendarX, Download, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingsPage } from "@/lib/queries/bookings";
import { getActiveLocations } from "@/lib/queries/locations";
import { ATTENTION_LABEL, attentionReason } from "@/lib/bookingStatus";
import { formatDateRange, formatDateTime, formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import { BookingFilters } from "@/components/admin/bookings/BookingFilters";
import {
  SOURCES,
  STATUSES,
  bookingListHref,
  parseBookingListParams,
  toBookingFilters,
  type RawSearchParams,
} from "@/components/admin/bookings/listParams";

export const metadata = { title: "Bookings" };

const PAGE_SIZE = 25;

const STATUS_TILE_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = parseBookingListParams(await searchParams);
  const supabase = await createClient();
  const locations = await getActiveLocations(supabase);
  const location = locations.find((l) => l.slug === params.location);

  const { rows, total, statusCounts } = await getBookingsPage(supabase, toBookingFilters(params, location?.id), {
    page: params.page,
    pageSize: PAGE_SIZE,
    sort: params.sort,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const now = new Date();
  const exportHref = bookingListHref(params, { page: 1 }).replace("/admin/bookings", "/admin/bookings/export");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text">Bookings</h2>
          <p className="text-sm text-text-muted">
            {total} booking{total === 1 ? "" : "s"} match these filters
          </p>
        </div>
        <div className="flex items-center gap-2">
        <a
          href={exportHref}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 text-sm font-medium text-text hover:bg-surface-alt"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </a>
        <Link
          href="/admin/bookings/new"
          className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New booking
        </Link>
        </div>
      </div>

      <nav aria-label="Filter by status" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STATUSES.map((status) => {
          const active = params.status === status;
          return (
            <Link
              key={status}
              href={bookingListHref(params, { status: active ? "" : status, page: 1 })}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded-[var(--radius-md)] border bg-admin-surface px-4 py-3 transition-colors",
                active ? "border-primary ring-1 ring-primary" : "border-admin-border hover:border-primary/50",
              )}
            >
              <span className="block text-xs font-medium uppercase tracking-wide text-text-muted">
                {STATUS_TILE_LABEL[status]}
              </span>
              <span className="text-xl font-semibold text-text">{statusCounts[status]}</span>
            </Link>
          );
        })}
      </nav>

      <BookingFilters params={params} locations={locations.map((l) => ({ slug: l.slug, name: l.name }))} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarX className="h-10 w-10" strokeWidth={1.25} />}
          title="No bookings match these filters"
          description="Try a wider date range or clear the filters."
          action={
            <Link href="/admin/bookings?range=all" className="text-sm font-medium text-primary hover:underline">
              Show all bookings
            </Link>
          }
          className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      ) : (
        <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-surface-alt text-text-muted">
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Dates</th>
                <th className="px-4 py-3 font-medium">Pickup</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const reason = attentionReason(b, now);
                const href = `/admin/bookings/${b.reference}`;
                return (
                  <tr
                    key={b.id}
                    className={cn(
                      "border-b border-admin-border last:border-b-0 hover:bg-surface-alt",
                      // Inset shadow rather than a border so the row doesn't shift.
                      reason && "shadow-[inset_3px_0_0_var(--color-warning)]",
                    )}
                    title={reason ? ATTENTION_LABEL[reason] : undefined}
                  >
                    <td className="px-4 py-3">
                      <Link href={href} className="whitespace-nowrap font-mono font-semibold text-text hover:text-primary hover:underline">
                        {b.reference}
                      </Link>
                      {reason && <span className="block whitespace-nowrap text-xs text-warning-deep">{ATTENTION_LABEL[reason]}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-text">
                        {b.customer.first_name} {b.customer.last_name}
                      </span>
                      <span className="block whitespace-nowrap text-xs text-text-muted">{b.customer.phone}</span>
                    </td>
                    <td className="px-4 py-3 text-text">{b.category.name}</td>
                    <td className="px-4 py-3">
                      {b.vehicle ? (
                        <span className="whitespace-nowrap font-mono text-text">{b.vehicle.code}</span>
                      ) : (
                        <span className="font-medium text-warning-deep">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block whitespace-nowrap text-text" title={`${formatDateTime(b.pickup_at)} → ${formatDateTime(b.return_at)}`}>
                        {formatDateRange(b.pickup_at, b.return_at)}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {b.days} day{b.days === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-muted">{b.pickup_location.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">{formatMUR(b.total_mur)}</td>
                    <td className="px-4 py-3">
                      <Badge>{SOURCES.find((s) => s.value === b.source)?.label ?? b.source}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={href} className="text-sm font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {params.page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {params.page > 1 ? (
              <Link
                href={bookingListHref(params, { page: params.page - 1 })}
                className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt"
              >
                Previous
              </Link>
            ) : null}
            {params.page < pageCount ? (
              <Link
                href={bookingListHref(params, { page: params.page + 1 })}
                className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      )}
    </div>
  );
}
