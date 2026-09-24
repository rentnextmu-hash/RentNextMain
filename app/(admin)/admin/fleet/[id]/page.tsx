import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVehicleBookings, getVehicleById, vehicleStats } from "@/lib/queries/vehicles";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { isOpenBooking } from "@/lib/bookingStatus";
import { formatDate, formatDateRange, formatDateTime, formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/ui/StatusPill";
import { ChangeStatusButton, VehicleFormButton } from "@/components/admin/fleet/VehicleForm";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5", className)}>
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const [vehicle, bookings, categories, locations] = await Promise.all([
    getVehicleById(supabase, id),
    getVehicleBookings(supabase, id),
    getActiveCategories(supabase),
    getActiveLocations(supabase),
  ]);
  if (!vehicle) notFound();

  const stats = vehicleStats(bookings, vehicle.acquired_at);
  const current = bookings.find((b) => b.status === "active") ?? null;
  const nextUp =
    [...bookings]
      .filter((b) => b.status === "confirmed" && new Date(b.return_at) > new Date())
      .sort((a, b) => a.pickup_at.localeCompare(b.pickup_at))[0] ?? null;
  const openBooking = bookings.find((b) => isOpenBooking(b.status) && b.status !== "requested") ?? null;

  return (
    <div className="space-y-6">
      <Link href="/admin/fleet" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Fleet
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-2xl font-semibold text-text">{vehicle.code}</h2>
            <StatusPill status={vehicle.status} />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {vehicle.category.name} · <span className="font-mono">{vehicle.registration}</span> ·{" "}
            {vehicle.location.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <VehicleFormButton
            vehicle={{
              id: vehicle.id,
              categoryId: vehicle.category_id,
              code: vehicle.code,
              registration: vehicle.registration,
              locationId: vehicle.location_id,
              status: vehicle.status,
              mileageKm: vehicle.mileage_km,
              year: vehicle.year,
              colour: vehicle.colour,
              acquiredAt: vehicle.acquired_at,
              notes: vehicle.notes,
            }}
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            locations={locations.map((l) => ({ id: l.id, name: l.name }))}
          />
          <ChangeStatusButton
            vehicleId={vehicle.id}
            code={vehicle.code}
            currentStatus={vehicle.status}
            openBookingReference={openBooking?.reference ?? null}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6">
          <Card title="Details">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Registration">
                <span className="font-mono">{vehicle.registration}</span>
              </Field>
              <Field label="Category">{vehicle.category.name}</Field>
              <Field label="Location">{vehicle.location.name}</Field>
              <Field label="Mileage">{vehicle.mileage_km.toLocaleString("en-US")} km</Field>
              <Field label="Year">{vehicle.year ?? "—"}</Field>
              <Field label="Colour">{vehicle.colour ?? "—"}</Field>
              <Field label="Acquired">{vehicle.acquired_at ? formatDate(vehicle.acquired_at) : "—"}</Field>
            </dl>
            {vehicle.notes && (
              <p className="mt-4 whitespace-pre-line rounded-[var(--radius-md)] bg-surface-alt px-3 py-2 text-sm text-text">
                {vehicle.notes}
              </p>
            )}
          </Card>

          <Card title={current ? "On rent now" : "Next booking"}>
            {current ?? nextUp ? (
              (() => {
                const b = (current ?? nextUp)!;
                return (
                  <dl className="space-y-3">
                    <Field label="Booking">
                      <Link
                        href={`/admin/bookings/${b.reference}`}
                        className="font-mono font-semibold hover:text-primary hover:underline"
                      >
                        {b.reference}
                      </Link>
                    </Field>
                    <Field label="Customer">
                      {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"}
                    </Field>
                    <Field label="Dates">
                      {formatDateTime(b.pickup_at)} → {formatDateTime(b.return_at)}
                    </Field>
                    <Field label="Pickup / return">
                      {b.pickup_location?.name} → {b.return_location?.name}
                    </Field>
                  </dl>
                );
              })()
            ) : (
              <p className="text-sm text-text-muted">Not on rent, and nothing confirmed ahead.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "Bookings", value: String(stats.totalBookings) },
              { label: "Days rented this year", value: String(stats.daysRentedThisYear) },
              { label: "Utilisation", value: `${stats.utilisationPct}%` },
              { label: "Revenue", value: formatMUR(stats.revenueMur) },
            ].map((s) => (
              <div key={s.label} className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{s.label}</p>
                <p className="mt-1 text-xl font-semibold text-text">{s.value}</p>
              </div>
            ))}
          </div>

          <Card title="Booking history">
            {bookings.length === 0 ? (
              <p className="text-sm text-text-muted">No bookings yet.</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-admin-border text-text-muted">
                      <th className="pb-2 font-medium">Reference</th>
                      <th className="pb-2 font-medium">Customer</th>
                      <th className="pb-2 font-medium">Dates</th>
                      <th className="pb-2 text-right font-medium">Total</th>
                      <th className="pb-2 pl-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-admin-border last:border-b-0">
                        <td className="py-2">
                          <Link
                            href={`/admin/bookings/${b.reference}`}
                            className="whitespace-nowrap font-mono font-semibold text-text hover:text-primary hover:underline"
                          >
                            {b.reference}
                          </Link>
                        </td>
                        <td className="py-2 text-text">
                          {b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "—"}
                        </td>
                        <td className="whitespace-nowrap py-2 text-text-muted">{formatDateRange(b.pickup_at, b.return_at)}</td>
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

          <Card title="Maintenance history">
            <div className="flex items-start gap-3 text-sm">
              <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              <div>
                <p className="text-text">Maintenance scheduling arrives in a later phase.</p>
                <p className="mt-1 text-text-muted">
                  {vehicle.status === "maintenance"
                    ? "This vehicle is currently marked as in maintenance and won't be offered for bookings."
                    : "Use Change status → Maintenance to take this vehicle off the road for now."}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
