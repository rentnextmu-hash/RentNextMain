import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCustomersPage } from "@/lib/queries/customers";
import { formatDate, formatMUR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CustomerSearch } from "@/components/admin/customers/CustomerSearch";

export const metadata = { title: "Customers" };

const PAGE_SIZE = 25;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const search = (params.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const supabase = await createClient();
  const { rows, total } = await getCustomersPage(supabase, { search, page, pageSize: PAGE_SIZE });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const href = (p: number) => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (p > 1) qs.set("page", String(p));
    return qs.toString() ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text">Customers</h2>
        <p className="text-sm text-text-muted">
          {total} customer{total === 1 ? "" : "s"}
          {search && " matching your search"}
        </p>
      </div>

      <CustomerSearch initial={search} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users className="h-10 w-10" strokeWidth={1.25} />}
          title={search ? "No customers match your search" : "No customers yet"}
          description={search ? "Try a different name, email or phone." : "Customers appear here once bookings are made."}
          className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      ) : (
        <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-admin-border bg-surface-alt text-text-muted">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 text-right font-medium">Bookings</th>
                <th className="px-4 py-3 text-right font-medium">Total spent</th>
                <th className="px-4 py-3 font-medium">Last booking</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-admin-border last:border-b-0 hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-text hover:text-primary hover:underline">
                      {c.firstName} {c.lastName}
                    </Link>
                    {c.stats.isRepeat && (
                      <Badge variant="info" className="ml-2 align-middle">
                        Repeat
                      </Badge>
                    )}
                    <span className="block text-xs text-text-muted">
                      {c.email} · {c.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{c.country ?? "—"}</td>
                  <td className="px-4 py-3 text-right text-text">{c.stats.bookings}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-text">{formatMUR(c.stats.totalSpentMur)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                    {c.stats.lastBookingAt ? formatDate(c.stats.lastBookingAt) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/customers/${c.id}`} className="text-sm font-medium text-primary hover:underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={href(page - 1)} className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt">
                Previous
              </Link>
            )}
            {page < pageCount && (
              <Link href={href(page + 1)} className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt">
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
