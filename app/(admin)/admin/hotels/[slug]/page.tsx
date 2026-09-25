import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Mail, MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getHotelAdminDetail } from "@/lib/queries/hotels";
import { getActiveLocations } from "@/lib/queries/locations";
import { formatDate, formatDateRange, formatMUR, mauritiusMonthRange } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { HotelFormButton } from "@/components/admin/hotels/HotelForm";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5 ${className ?? ""}`}>
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

export default async function AdminHotelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const [detail, staff, locations] = await Promise.all([
    getHotelAdminDetail(supabase, slug, mauritiusMonthRange()),
    getCurrentStaff(),
    getActiveLocations(supabase),
  ]);
  if (!detail) notFound();

  const { hotel: h, bookings, thisMonth, allTime } = detail;
  const canEdit = staff?.role === "owner" || staff?.role === "manager";
  const rate = Number(h.commission_rate);
  const phoneDigits = (h.contact_phone ?? "").replace(/[^\d]/g, "");

  return (
    <div className="space-y-6">
      <Link href="/admin/hotels" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Hotel partners
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-text">{h.name}</h2>
            <StatusPill status={h.contract_status} />
            {!h.is_active && <Badge variant="warning">Partnership paused</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {h.location ? (
              <Link href={`/admin/locations/${h.location.slug}`} className="hover:text-primary hover:underline">
                Near {h.location.name}
              </Link>
            ) : (
              "No location linked"
            )}
          </p>
        </div>
        {canEdit && (
          <HotelFormButton
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
            hotel={{
              id: h.id,
              name: h.name,
              slug: h.slug,
              locationId: h.location_id,
              contactName: h.contact_name ?? "",
              contactEmail: h.contact_email ?? "",
              contactPhone: h.contact_phone ?? "",
              contractStatus: h.contract_status as "active" | "pending" | "inactive",
              contractStartDate: h.contract_start_date ?? "",
              commissionRate: rate,
              pickupNotes: h.pickup_notes ?? "",
              isActive: h.is_active,
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Contract">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <StatusPill status={h.contract_status} />
            </Field>
            <Field label="Commission">{rate}% of referred bookings</Field>
            <Field label="Started">{h.contract_start_date ? formatDate(h.contract_start_date) : "—"}</Field>
            <Field label="On the website">
              {h.is_active && h.contract_status === "active" ? "Offered for hotel delivery" : "Not offered"}
            </Field>
          </dl>
          {h.pickup_notes && (
            <div className="mt-4">
              <p className="text-xs text-text-muted">Pickup arrangements</p>
              <p className="mt-1 whitespace-pre-line text-sm text-text">{h.pickup_notes}</p>
            </div>
          )}
        </Card>

        <Card title="Contact">
          <dl className="space-y-3">
            <Field label="Name">{h.contact_name ?? "—"}</Field>
            <Field label="Email">
              {h.contact_email ? (
                <a href={`mailto:${h.contact_email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" /> {h.contact_email}
                </a>
              ) : (
                "—"
              )}
            </Field>
            <Field label="Phone">
              {h.contact_phone ? (
                <span className="flex flex-wrap gap-3">
                  <a href={`tel:+${phoneDigits}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" aria-hidden="true" /> {h.contact_phone}
                  </a>
                  <a
                    href={`https://wa.me/${phoneDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" /> WhatsApp
                  </a>
                </span>
              ) : (
                "—"
              )}
            </Field>
          </dl>
        </Card>

        <Card title="Performance">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                <th className="pb-2 text-left font-medium" />
                <th className="pb-2 text-right font-medium">This month</th>
                <th className="pb-2 text-right font-medium">All time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1 text-text-muted">Referred bookings</td>
                <td className="py-1 text-right text-text">{thisMonth.referredBookings}</td>
                <td className="py-1 text-right text-text">{allTime.referredBookings}</td>
              </tr>
              <tr>
                <td className="py-1 text-text-muted">Revenue</td>
                <td className="py-1 text-right text-text">{formatMUR(thisMonth.referredRevenueMur)}</td>
                <td className="py-1 text-right text-text">{formatMUR(allTime.referredRevenueMur)}</td>
              </tr>
              <tr className="border-t border-admin-border">
                <td className="pt-2 font-medium text-text">Commission owed</td>
                <td className="pt-2 text-right font-semibold text-text">{formatMUR(thisMonth.commissionMur)}</td>
                <td className="pt-2 text-right text-text-muted">{formatMUR(allTime.commissionMur)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-text-muted">
            Counts bookings the hotel referred (source: Hotel), by pickup date. Website guests who chose delivery here are
            listed below but earn no commission.
          </p>
        </Card>
      </div>

      <Card title="Bookings">
        {bookings.length === 0 ? (
          <p className="text-sm text-text-muted">No bookings linked to this hotel yet.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-admin-border text-text-muted">
                  <th className="pb-2 font-medium">Reference</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Car</th>
                  <th className="pb-2 font-medium">Dates</th>
                  <th className="pb-2 font-medium">Type</th>
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
                    <td className="py-2 text-text">{b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"}</td>
                    <td className="py-2 text-text-muted">{b.category?.name ?? "—"}</td>
                    <td className="whitespace-nowrap py-2 text-text-muted">{formatDateRange(b.pickup_at, b.return_at)}</td>
                    <td className="py-2">
                      <Badge variant={b.source === "hotel" ? "info" : "neutral"}>{b.source === "hotel" ? "Referred" : "Delivery only"}</Badge>
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

      <section className="rounded-[var(--radius-lg)] border border-dashed border-admin-border bg-surface-alt p-6">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-text">Partner portal</h3>
            <p className="mt-1 text-sm text-text-muted">
              Hotel partners will be able to sign in and create bookings directly in a later phase — and see their own
              referrals and commission statement here.
            </p>
            <div className="mt-4 grid max-w-md grid-cols-2 gap-3 opacity-50" aria-hidden="true">
              <div className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface p-3 text-xs text-text-muted">
                New booking for a guest
              </div>
              <div className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface p-3 text-xs text-text-muted">
                Monthly statement
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
