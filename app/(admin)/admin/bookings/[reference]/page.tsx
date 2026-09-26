import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Mail, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingDetail } from "@/lib/queries/bookings";
import { rankVehiclesForBooking, type RankedVehicle } from "@/lib/assignment";
import { isOpenBooking } from "@/lib/bookingStatus";
import { formatDate, formatDateTime, formatDateTimeLong, formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { CopyReferenceButton } from "@/components/public/booking/ConfirmationActions";
import { AssignVehicleList, BookingActions, type ActionBooking } from "@/components/admin/bookings/BookingActions";
import { InternalNotes, RecordPaymentForm } from "@/components/admin/bookings/BookingPanels";
import { SOURCES } from "@/components/admin/bookings/listParams";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5 print:break-inside-avoid",
        className,
      )}
    >
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

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ reference }, { created }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const booking = await getBookingDetail(supabase, decodeURIComponent(reference));
  if (!booking) notFound();

  const open = isOpenBooking(booking.status);
  const canChangeVehicle = booking.status === "requested" || booking.status === "confirmed";
  const vehicles: RankedVehicle[] = canChangeVehicle
    ? await rankVehiclesForBooking(
        supabase,
        {
          categoryId: booking.category_id,
          pickupAt: booking.pickup_at,
          returnAt: booking.return_at,
          pickupLocationId: booking.pickup_location_id,
          returnLocationId: booking.return_location_id,
        },
        { excludeBookingId: booking.id },
      )
    : [];

  const actionBooking: ActionBooking = {
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    vehicleId: booking.vehicle_id,
    vehicleCode: booking.vehicle?.code ?? null,
    vehicleMileageKm: booking.vehicle?.mileage_km ?? null,
    categoryName: booking.category.name,
    pickupLocationId: booking.pickup_location_id,
  };

  const c = booking.customer;
  const paidMur = booking.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount_mur, 0);
  const outstandingMur = Math.max(0, booking.total_mur - paidMur);
  const previousBookings = booking.customerBookingCount - 1;
  const whatsappNumber = c.phone.replace(/[^\d]/g, "");
  const whatsappText = encodeURIComponent(
    `Hello ${c.first_name}, this is Rent Next Car Hire about your booking ${booking.reference} ` +
      `(${booking.category.name}, pickup ${formatDateTime(booking.pickup_at)} at ${booking.pickup_location.name}).`,
  );

  // Where "today" falls on the rental strip, if it's inside the rental.
  const start = new Date(booking.pickup_at).getTime();
  const end = new Date(booking.return_at).getTime();
  const nowPct = ((Date.now() - start) / (end - start)) * 100;

  const timeline = [
    { label: "Request received", at: booking.created_at },
    { label: "Confirmed", at: booking.confirmed_at },
    { label: "Vehicle assigned", at: booking.vehicle_assigned_at },
    { label: "Picked up", at: booking.picked_up_at },
    { label: "Returned", at: booking.returned_at },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/bookings"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text print:hidden"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All bookings
      </Link>

      {created === "1" && (
        <p role="status" className="rounded-[var(--radius-md)] bg-success/10 px-4 py-3 text-sm font-medium text-success print:hidden">
          Booking {booking.reference} created.
        </p>
      )}

      {/* Print-only heading for the one-page rental agreement summary. */}
      <div className="hidden print:block">
        <p className="text-lg font-semibold">Rent Next Car Hire — rental agreement summary</p>
        <p className="text-sm">Printed {formatDateTime(new Date())}</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-semibold text-text">{booking.reference}</h2>
            <StatusPill status={booking.status} />
            <Badge>{SOURCES.find((s) => s.value === booking.source)?.label ?? booking.source}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {booking.category.name} · {formatDate(booking.pickup_at)} – {formatDate(booking.return_at)} · created{" "}
            {formatDateTime(booking.created_at)}
          </p>
        </div>
        <BookingActions booking={actionBooking} vehicles={vehicles} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 print:grid-cols-1">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Customer">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Name">
                {c.first_name} {c.last_name}
              </Field>
              <Field label="Email">
                <a href={`mailto:${c.email}`} className="break-all hover:text-primary hover:underline">
                  {c.email}
                </a>
              </Field>
              <Field label="Phone">{c.phone}</Field>
              <Field label="Country">{c.country ?? "—"}</Field>
              <Field label="Hotel">{booking.hotel?.name ?? "—"}</Field>
              <Field label="Flight">{c.flight_number ?? "—"}</Field>
            </dl>
            <p className="mt-4 text-sm text-text-muted">
              {previousBookings > 0
                ? `Returning customer — ${previousBookings} other booking${previousBookings === 1 ? "" : "s"} under this email.`
                : "First booking under this email."}
            </p>
            {booking.notes && (
              <div className="mt-4 rounded-[var(--radius-md)] bg-surface-alt px-4 py-3">
                <p className="text-xs font-medium text-text-muted">Customer&apos;s notes</p>
                <p className="whitespace-pre-line text-sm text-text">{booking.notes}</p>
              </div>
            )}
          </Card>

          <Card title="Rental">
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Pickup">
                <span className="block font-medium">{booking.pickup_location.name}</span>
                {booking.hotel && <span className="block text-text-muted">Deliver to {booking.hotel.name}</span>}
                <span className="block text-text-muted">{formatDateTimeLong(booking.pickup_at)}</span>
              </Field>
              <Field label="Return">
                <span className="block font-medium">{booking.return_location.name}</span>
                <span className="block text-text-muted">{formatDateTimeLong(booking.return_at)}</span>
              </Field>
              <Field label="Duration">
                {booking.days} day{booking.days === 1 ? "" : "s"}
              </Field>
            </dl>
            <div className="relative mt-5" aria-hidden="true">
              <div className="flex h-3 overflow-hidden rounded-full bg-surface-alt">
                {Array.from({ length: booking.days }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 border-r border-admin-surface last:border-r-0",
                      booking.status === "cancelled" ? "bg-error/30" : "bg-info/60",
                    )}
                  />
                ))}
              </div>
              {nowPct > 0 && nowPct < 100 && booking.status !== "cancelled" && (
                <div className="absolute -top-1 h-5 w-0.5 bg-accent" style={{ left: `${nowPct}%` }} title="Now" />
              )}
              <div className="mt-1 flex justify-between text-xs text-text-muted">
                <span>{formatDate(booking.pickup_at)}</span>
                <span>{formatDate(booking.return_at)}</span>
              </div>
            </div>
          </Card>

          <Card title="Vehicle">
            {booking.vehicle ? (
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Field label="Code">
                  <span className="font-mono font-semibold">{booking.vehicle.code}</span>
                </Field>
                <Field label="Registration">
                  <span className="font-mono">{booking.vehicle.registration}</span>
                </Field>
                <Field label="Currently at">{booking.vehicle.location?.name ?? "—"}</Field>
                <Field label="Mileage">{booking.vehicle.mileage_km.toLocaleString("en-US")} km</Field>
              </dl>
            ) : open ? (
              <div className="rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 p-4">
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-warning-deep">
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  No vehicle assigned yet. These {booking.category.name} vehicles are free for the whole rental:
                </p>
                <AssignVehicleList booking={actionBooking} vehicles={vehicles} />
              </div>
            ) : (
              <p className="text-sm text-text-muted">No vehicle was assigned.</p>
            )}
          </Card>

          <Card title="Price">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1.5 text-text">
                    {booking.category.name} — {booking.days} day{booking.days === 1 ? "" : "s"}
                  </td>
                  <td className="py-1.5 text-right text-text">{formatMUR(booking.car_total_mur)}</td>
                </tr>
                {booking.booking_add_ons.map((a) => (
                  <tr key={a.id}>
                    <td className="py-1.5 text-text">
                      {a.add_on.name}
                      {a.quantity > 1 && ` × ${a.quantity}`}
                      <span className="text-text-muted">
                        {" "}
                        — {formatMUR(a.unit_price_mur)} {a.add_on.price_type === "per_day" ? "per day" : "one-off"}
                      </span>
                    </td>
                    <td className="py-1.5 text-right text-text">{formatMUR(a.total_mur)}</td>
                  </tr>
                ))}
                {booking.original_total_mur !== null && (
                  <tr className="border-t border-admin-border">
                    <td className="pt-3 text-text-muted">Calculated total</td>
                    <td className="pt-3 text-right text-text-muted line-through">{formatMUR(booking.original_total_mur)}</td>
                  </tr>
                )}
                <tr className="border-t border-admin-border">
                  <td className="pt-3 font-semibold text-text">
                    {booking.original_total_mur !== null ? "Agreed total" : "Total"}
                  </td>
                  <td className="pt-3 text-right text-lg font-semibold text-text">{formatMUR(booking.total_mur)}</td>
                </tr>
                {booking.price_override_reason && (
                  <tr>
                    <td colSpan={2} className="pt-1 text-xs text-warning-deep">
                      Price overridden: {booking.price_override_reason}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card title="Payments">
            {booking.payments.length > 0 ? (
              <table className="mb-4 w-full text-sm">
                <tbody>
                  {booking.payments.map((p) => (
                    <tr key={p.id} className="border-b border-admin-border last:border-b-0">
                      <td className="py-2 text-text">{p.paid_at ? formatDateTime(p.paid_at) : "—"}</td>
                      <td className="py-2 capitalize text-text-muted">{p.method ?? "—"}</td>
                      <td className="py-2 font-mono text-xs text-text-muted">{p.reference ?? ""}</td>
                      <td className="py-2">
                        <StatusPill status={p.status} />
                      </td>
                      <td className="py-2 text-right text-text">{formatMUR(p.amount_mur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mb-4 text-sm text-text-muted">No payments recorded yet.</p>
            )}
            <p className="mb-4 text-sm">
              <span className="text-text-muted">Paid</span> <span className="font-medium">{formatMUR(paidMur)}</span>
              <span className="mx-2 text-text-muted">·</span>
              <span className="text-text-muted">Outstanding</span>{" "}
              <span className={cn("font-medium", outstandingMur > 0 ? "text-warning-deep" : "text-success")}>
                {formatMUR(outstandingMur)}
              </span>
            </p>
            {booking.status !== "cancelled" && (
              <RecordPaymentForm bookingId={booking.id} outstandingMur={outstandingMur} />
            )}
          </Card>

          <Card title="Internal notes" className="print:hidden">
            <InternalNotes
              bookingId={booking.id}
              initialNotes={booking.internal_notes ?? ""}
              updatedAt={booking.internal_notes_updated_at}
              updatedBy={booking.internal_notes_editor?.full_name ?? null}
            />
          </Card>

          {/* Signature block, printed only. */}
          <div className="hidden grid-cols-2 gap-12 pt-12 text-sm print:grid">
            <div className="border-t border-text pt-2">Customer signature</div>
            <div className="border-t border-text pt-2">For Rent Next Car Hire</div>
          </div>
        </div>

        <div className="space-y-6 print:hidden">
          <Card title="Status">
            <ol className="space-y-4">
              {timeline.map((step) => (
                <li key={step.label} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                      step.at ? "border-success bg-success text-white" : "border-admin-border bg-admin-surface",
                    )}
                  >
                    {step.at && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  <div>
                    <p className={cn("text-sm font-medium", step.at ? "text-text" : "text-text-muted")}>{step.label}</p>
                    {step.at && <p className="text-xs text-text-muted">{formatDateTime(step.at)}</p>}
                  </div>
                </li>
              ))}
              {booking.cancelled_at && (
                <li className="flex gap-3">
                  <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-error" />
                  <div>
                    <p className="text-sm font-medium text-error">Cancelled</p>
                    <p className="text-xs text-text-muted">{formatDateTime(booking.cancelled_at)}</p>
                  </div>
                </li>
              )}
            </ol>
          </Card>

          <Card title="Contact customer">
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${c.email}?subject=${encodeURIComponent(`Your booking ${booking.reference}`)}`}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-admin-border px-3 py-2 text-sm text-text hover:bg-surface-alt"
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Email {c.first_name}
              </a>
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-admin-border px-3 py-2 text-sm text-text hover:bg-surface-alt"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp {c.first_name}
                </a>
              )}
              <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-admin-border px-3 py-2">
                <span className="font-mono text-sm text-text">{booking.reference}</span>
                <CopyReferenceButton reference={booking.reference} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
