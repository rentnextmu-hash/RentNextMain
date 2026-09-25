import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getActiveCategories } from "@/lib/queries/categories";
import { getLocationAdminDetail, locationSeoTitle } from "@/lib/queries/locations";
import { faqList } from "@/lib/queries/settings";
import { lowestDailyRate } from "@/lib/pricing";
import { formatDate, formatDateTime, formatMUR } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { StatusPill } from "@/components/ui/StatusPill";
import { StatCard } from "@/components/admin/StatCard";
import { LocationFormButton } from "@/components/admin/locations/LocationForm";
import { Car, CheckCircle2, Clock, Wrench } from "lucide-react";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const TYPE_LABEL: Record<string, string> = { branch: "Branch", airport: "Airport", hotel: "Hotel", custom: "Other" };

export default async function AdminLocationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const [detail, staff, categories] = await Promise.all([
    getLocationAdminDetail(supabase, slug),
    getCurrentStaff(),
    getActiveCategories(supabase),
  ]);
  if (!detail) notFound();

  const { location: l, fleet, vehicles, movements, hotels } = detail;
  const canEdit = staff?.role === "owner" || staff?.role === "manager";
  const from = lowestDailyRate(
    categories.map((c) => ({ rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur })),
  );
  const driveTimes = Array.isArray(l.drive_times) ? (l.drive_times as { place: string; minutes: number }[]) : [];
  const faqs = faqList(l.faqs);

  return (
    <div className="space-y-6">
      <Link href="/admin/locations" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Locations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-text">{l.name}</h2>
            <Badge>{TYPE_LABEL[l.type] ?? l.type}</Badge>
            {!l.is_active && <Badge variant="warning">Hidden from website</Badge>}
            {l.is_active && !l.is_pickup_point && <Badge variant="info">No pickups</Badge>}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {[l.region, l.address, l.opening_hours].filter(Boolean).join(" · ")}
          </p>
        </div>
        {canEdit && (
          <LocationFormButton
            location={{
              id: l.id,
              name: l.name,
              slug: l.slug,
              type: l.type as "branch" | "airport" | "hotel" | "custom",
              region: l.region ?? "",
              address: l.address ?? "",
              latitude: l.latitude === null ? null : Number(l.latitude),
              longitude: l.longitude === null ? null : Number(l.longitude),
              isPickupPoint: l.is_pickup_point,
              isActive: l.is_active,
              openingHours: l.opening_hours ?? "",
              seoTitle: l.seo_title ?? "",
              seoDescription: l.seo_description ?? "",
              introContent: l.intro_content ?? "",
              driveTimes,
              faqs,
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Cars based here" value={fleet.total} icon={Car} />
        <StatCard label="Available" value={fleet.available} icon={CheckCircle2} accent="success" />
        <StatCard label="Booked" value={fleet.booked} icon={Clock} accent="info" />
        <StatCard label="Maintenance" value={fleet.maintenance} icon={Wrench} accent="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Cars based here">
            {vehicles.length === 0 ? (
              <p className="text-sm text-text-muted">No cars are based here.</p>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-admin-border text-text-muted">
                      <th className="pb-2 font-medium">Code</th>
                      <th className="pb-2 font-medium">Category</th>
                      <th className="pb-2 font-medium">Registration</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">On rent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id} className="border-b border-admin-border last:border-b-0">
                        <td className="py-2">
                          <Link href={`/admin/fleet/${v.id}`} className="whitespace-nowrap font-mono font-semibold text-text hover:text-primary hover:underline">
                            {v.code}
                          </Link>
                        </td>
                        <td className="py-2 text-text">{v.categoryName}</td>
                        <td className="whitespace-nowrap py-2 font-mono text-text-muted">{v.registration}</td>
                        <td className="py-2">
                          <StatusPill status={v.status} />
                        </td>
                        <td className="py-2 text-text-muted">
                          {v.currentBooking ? (
                            <Link href={`/admin/bookings/${v.currentBooking.reference}`} className="hover:text-primary hover:underline">
                              {v.currentBooking.customerName} · back {formatDate(v.currentBooking.returnAt)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Next 7 days here">
            {movements.length === 0 ? (
              <p className="text-sm text-text-muted">No pickups or returns here in the next week.</p>
            ) : (
              <ul className="divide-y divide-admin-border">
                {movements.map((m) => (
                  <li key={`${m.kind}-${m.reference}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="flex items-center gap-3">
                      <Badge variant={m.kind === "pickup" ? "info" : "neutral"}>{m.kind === "pickup" ? "Pickup" : "Return"}</Badge>
                      <span className="whitespace-nowrap text-text">{formatDateTime(m.at)}</span>
                      <span className="text-text-muted">
                        {m.customerName} · {m.categoryName}
                        {m.vehicleCode && <span className="font-mono"> · {m.vehicleCode}</span>}
                      </span>
                    </span>
                    <Link href={`/admin/bookings/${m.reference}`} className="font-mono text-xs text-primary hover:underline">
                      {m.reference}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card
            title="Public page"
            action={
              l.is_active ? (
                <a
                  href={`/locations/${l.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  View live <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : undefined
            }
          >
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-text-muted">Search result title</dt>
                <dd className="font-medium text-info">{locationSeoTitle(l, from ? formatMUR(from) : null)}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">
                  Description ({(l.seo_description ?? "").length} characters)
                </dt>
                <dd className="text-text">{l.seo_description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Intro</dt>
                <dd className="line-clamp-4 text-text-muted">{l.intro_content ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Also on the page</dt>
                <dd className="text-text">
                  {driveTimes.length} drive time{driveTimes.length === 1 ? "" : "s"} · {faqs.length} question
                  {faqs.length === 1 ? "" : "s"}
                </dd>
              </div>
            </dl>
            {canEdit && <p className="mt-4 text-xs text-text-muted">Edit changes the website within seconds.</p>}
          </Card>

          <Card title="Partner hotels">
            {hotels.length === 0 ? (
              <p className="text-sm text-text-muted">No partner hotels linked to this location.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {hotels.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/hotels/${h.slug}`} className="text-text hover:text-primary hover:underline">
                      {h.name}
                    </Link>
                    <StatusPill status={h.isActive ? h.contractStatus : "inactive"} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
