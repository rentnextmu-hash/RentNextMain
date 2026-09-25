import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Building2, Clock, MapPin, Navigation, Phone } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { checkAvailability } from "@/lib/availability";
import { HOTEL_DELIVERY_SLUG, lowestDailyRate } from "@/lib/pricing";
import { addDaysToDateKey, formatMUR, mauritiusDateTime, toDateKey } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations, getLocationBySlug, locationSeoTitle } from "@/lib/queries/locations";
import { getActiveAddOns } from "@/lib/queries/addOns";
import { getPartnerHotels } from "@/lib/queries/hotels";
import { faqList, getPublicSettings } from "@/lib/queries/settings";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { CarCard } from "@/components/public/CarCard";
import { FAQAccordion, faqJsonLd } from "@/components/public/FAQAccordion";
import { JsonLd } from "@/components/public/JsonLd";
import { SearchWidget } from "@/components/public/SearchWidget";
import type { VehicleCategoryClass } from "@/types/enums";

// Statically generated per location, refreshed every five minutes so the
// "available" cars stay roughly current without a database hit per visit.
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const locations = await getActiveLocations(createPublicClient());
  return locations.map((l) => ({ slug: l.slug }));
}

async function fromPrice() {
  const categories = await getActiveCategories(createPublicClient());
  const lowest = lowestDailyRate(
    categories.map((c) => ({ rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur })),
  );
  return lowest === null ? null : formatMUR(lowest);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const location = await getLocationBySlug(createPublicClient(), slug);
  // See cars/[slug]: notFound() in metadata gives crawlers a real 404 status.
  if (!location) notFound();
  const title = locationSeoTitle(location, await fromPrice());
  return {
    title,
    description: location.seo_description ?? undefined,
    alternates: { canonical: `/locations/${location.slug}` },
    openGraph: { title, description: location.seo_description ?? undefined },
  };
}

type DriveTime = { place: string; minutes: number };
function driveTimes(value: unknown): DriveTime[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((d) =>
    d && typeof d.place === "string" && typeof d.minutes === "number" ? [{ place: d.place, minutes: d.minutes }] : [],
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "Daily, 08:00 – 18:00" -> schema.org "Mo-Su 08:00-18:00", when it's in that shape. */
function openingHoursSchema(text: string | null) {
  const match = text?.match(/daily.*?(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/i);
  return match ? `Mo-Su ${match[1]}-${match[2]}` : undefined;
}

export default async function LocationPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const location = await getLocationBySlug(supabase, slug);
  if (!location) notFound();

  const [locations, categories, addOns, hotels, settings, from] = await Promise.all([
    getActiveLocations(supabase),
    getActiveCategories(supabase),
    getActiveAddOns(supabase),
    getPartnerHotels(supabase),
    getPublicSettings(supabase),
    fromPrice(),
  ]);

  // What's free here for a typical short trip starting tomorrow.
  const tomorrow = addDaysToDateKey(toDateKey(), 1);
  const returnDay = addDaysToDateKey(tomorrow, Math.max(3, settings.minimumRentalDays));
  const availability = location.is_pickup_point
    ? await checkAvailability(supabase, {
        locationId: location.id,
        from: mauritiusDateTime(tomorrow, settings.defaultPickupTime),
        to: mauritiusDateTime(returnDay, settings.defaultReturnTime),
      }).catch(() => [])
    : [];
  const counts = new Map(availability.map((a) => [a.categoryId, a.availableCount]));
  const availableHere = categories.filter((c) => (counts.get(c.id) ?? 0) > 0);

  const localHotels = hotels.filter((h) => h.locationId === location.id);
  const hotelDelivery = addOns.find((a) => a.slug === HOTEL_DELIVERY_SLUG);
  const drives = driveTimes(location.drive_times);
  const faqs = faqList(location.faqs);
  const preposition = location.type === "airport" ? "at" : "in";
  const others = locations.filter((l) => l.id !== location.id);
  const base = siteUrl();
  const rates = categories.flatMap((c) => [c.rate_1_2_mur, c.rate_3_5_mur, c.rate_6_plus_mur]);

  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-primary-deep text-white">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <div className="[&_a]:text-white/70 [&_a:hover]:text-white [&_span]:text-white [&_svg]:text-white/50">
            <Breadcrumbs
              items={[
                { name: "Home", href: "/" },
                { name: "Locations", href: "/locations" },
                { name: location.name, href: `/locations/${location.slug}` },
              ]}
            />
          </div>
          <h1 className="mt-8 font-[family-name:var(--font-heading)] text-display font-semibold">
            Car Rental {preposition} {location.name}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-white/80">
            <MapPin className="h-4 w-4" aria-hidden="true" /> {location.region}, Mauritius
            {from && <span className="ml-2 rounded-full bg-accent px-3 py-0.5 text-sm font-medium text-primary">from {from}/day</span>}
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-14 max-w-7xl px-4 sm:px-6 lg:px-8">
        <SearchWidget
          locations={locations.filter((l) => l.is_pickup_point).map((l) => ({ slug: l.slug, name: l.name }))}
          initial={{ location: location.slug }}
        />
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
        {availableHere.length > 0 && (
          <section>
            <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
              Available {preposition} {location.name}
            </h2>
            <p className="mt-1 text-text-muted">Free for a pickup tomorrow. Search your own dates above.</p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {availableHere.map((c) => (
                <CarCard
                  key={c.id}
                  car={{
                    name: c.name,
                    category: c.category as VehicleCategoryClass,
                    transmission: c.transmission,
                    seats: c.seats,
                    airConditioning: c.air_conditioning,
                    dailyRateMur: c.daily_rate_mur ?? c.rate_6_plus_mur,
                    imagePath: c.image_path,
                    availableCount: counts.get(c.id),
                    href: `/cars/${c.slug}`,
                    bookHref: `/booking/trip?${new URLSearchParams({ category: c.slug, location: location.slug }).toString()}`,
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
            Pickup options {preposition} {location.name}
          </h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
              <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-text">Our {location.type === "airport" ? "counter" : "office"}</h3>
              {location.address && <p className="mt-2 text-sm text-text-muted">{location.address}</p>}
              {location.opening_hours && (
                <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
                  <Clock className="h-4 w-4" aria-hidden="true" /> {location.opening_hours}
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
              <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-text">Hotel delivery</h3>
              <p className="mt-2 text-sm text-text-muted">
                We bring the car to your hotel and collect it when you leave
                {hotelDelivery ? ` — ${formatMUR(hotelDelivery.price_mur)} per booking` : ""}.
              </p>
              {localHotels.length > 0 && (
                <p className="mt-2 text-sm text-text">
                  Partner hotels nearby: {localHotels.map((h) => h.name).join(", ")}.
                </p>
              )}
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
              <Navigation className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-text">Somewhere else?</h3>
              <p className="mt-2 text-sm text-text-muted">
                Staying in a villa or guesthouse nearby? Tell us where in the special requests when you book, or call
                us to arrange it.
              </p>
              {settings.companyPhone && (
                <p className="mt-2 flex items-center gap-2 text-sm font-medium text-text">
                  <Phone className="h-4 w-4" aria-hidden="true" /> {settings.companyPhone}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {location.intro_content && (
            <section>
              <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
                Renting a car {preposition} {location.name}
              </h2>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-text">{location.intro_content}</p>
            </section>
          )}
          {drives.length > 0 && (
            <section>
              <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
                Getting around from {location.name}
              </h2>
              <ul className="mt-4 divide-y divide-border rounded-[var(--radius-lg)] border border-border bg-surface">
                {drives.map((d) => (
                  <li key={d.place} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                    <span className="text-text">{d.place}</span>
                    <span className="whitespace-nowrap text-text-muted">about {formatMinutes(d.minutes)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-text-muted">Approximate driving times in light traffic.</p>
            </section>
          )}
        </div>

        {faqs.length > 0 && (
          <section className="max-w-3xl">
            <h2 className="mb-4 font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
              {location.name}: common questions
            </h2>
            <FAQAccordion items={faqs} />
          </section>
        )}

        <section>
          <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">Other pickup locations</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {others.map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/locations/${l.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-primary"
                >
                  <MapPin className="h-4 w-4 text-primary" aria-hidden="true" /> {l.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AutoRental",
          name: `${settings.companyName} — ${location.name}`,
          url: `${base}/locations/${location.slug}`,
          telephone: settings.companyPhone || undefined,
          address: {
            "@type": "PostalAddress",
            streetAddress: location.address ?? undefined,
            addressLocality: location.name,
            addressRegion: location.region ?? undefined,
            addressCountry: "MU",
          },
          geo:
            location.latitude !== null && location.longitude !== null
              ? { "@type": "GeoCoordinates", latitude: Number(location.latitude), longitude: Number(location.longitude) }
              : undefined,
          priceRange: rates.length ? `${formatMUR(Math.min(...rates))} – ${formatMUR(Math.max(...rates))} per day` : undefined,
          openingHours: openingHoursSchema(location.opening_hours),
        }}
      />
      {faqs.length > 0 && <JsonLd data={faqJsonLd(faqs)} />}
    </div>
  );
}
