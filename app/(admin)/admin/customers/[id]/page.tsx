import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, Plane } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCustomerDetail } from "@/lib/queries/customers";
import { formatDate, formatDateRange, formatMUR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { SOURCES } from "@/components/admin/bookings/listParams";
import { CalendarCheck, Repeat, Wallet } from "lucide-react";

export const metadata = { title: "Customer" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="text-sm text-text">{children}</dd>
    </div>
  );
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const supabase = await createClient();
  const detail = await getCustomerDetail(supabase, id);
  if (!detail) notFound();

  const { customer: c, bookings, stats } = detail;
  const phoneDigits = c.phone.replace(/[^\d]/g, "");

  return (
    <div className="space-y-6">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Customers
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-text">
          {c.first_name} {c.last_name}
        </h2>
        {stats.isRepeat && <Badge variant="info">Repeat customer</Badge>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Bookings" value={stats.bookings} icon={CalendarCheck} accent="info" />
        <StatCard label="Total spent" value={formatMUR(stats.totalSpentMur)} icon={Wallet} accent="success" />
        <StatCard
          label="Customer since"
          value={stats.firstBookingAt ? formatDate(stats.firstBookingAt) : formatDate(c.created_at)}
          supporting={stats.lastBookingAt ? `Last booking ${formatDate(stats.lastBookingAt)}` : undefined}
          icon={Repeat}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Contact">
          <dl className="space-y-3">
            <Field label="Email">
              <a href={`mailto:${c.email}`} className="break-all text-primary hover:underline">
                {c.email}
              </a>
            </Field>
            <Field label="Phone">
              <span className="flex flex-wrap gap-3">
                <a href={`tel:+${phoneDigits}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {c.phone}
                </a>
                {phoneDigits && (
                  <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                  </a>
                )}
              </span>
            </Field>
            <Field label="Country">{c.country ?? "—"}</Field>
            {c.hotel && (
              <Field label="Hotel">
                <Link href={`/admin/hotels/${c.hotel.slug}`} className="text-primary hover:underline">
                  {c.hotel.name}
                </Link>
              </Field>
            )}
            {c.flight_number && (
              <Field label="Flight">
                <span className="inline-flex items-center gap-1">
                  <Plane className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" /> {c.flight_number}
                </span>
              </Field>
            )}
          </dl>
          <a href={`mailto:${c.email}`} className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-admin-border px-3 py-2 text-sm text-text hover:bg-surface-alt">
            <Mail className="h-4 w-4" aria-hidden="true" /> Email {c.first_name}
          </a>
        </Card>

        <div className="xl:col-span-2">
          <Card title={`Bookings (${bookings.length})`}>
            {bookings.length === 0 ? (
              <p className="text-sm text-text-muted">No bookings yet.</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-admin-border text-text-muted">
                      <th className="pb-2 font-medium">Reference</th>
                      <th className="pb-2 font-medium">Car</th>
                      <th className="pb-2 font-medium">Dates</th>
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                      <th className="pb-2 pl-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.reference} className="border-b border-admin-border last:border-b-0">
                        <td className="py-2">
                          <Link href={`/admin/bookings/${b.reference}`} className="whitespace-nowrap font-mono font-semibold text-text hover:text-primary hover:underline">
                            {b.reference}
                          </Link>
                        </td>
                        <td className="py-2 text-text">{b.category?.name ?? "—"}</td>
                        <td className="whitespace-nowrap py-2 text-text-muted">{formatDateRange(b.pickup_at, b.return_at)}</td>
                        <td className="py-2">
                          <Badge>{SOURCES.find((s) => s.value === b.source)?.label ?? b.source}</Badge>
                        </td>
                        <td className="whitespace-nowrap py-2 text-right text-text">{formatMUR(b.total_mur)}</td>
                        <td className="py-2 pl-4">
                          <StatusPill status={b.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
