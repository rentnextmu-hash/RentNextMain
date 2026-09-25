import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Briefcase, Car, Check, Cog, DoorOpen, Fuel, Snowflake, Users } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveCategories, getCategoryBySlug } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { getPublicSettings } from "@/lib/queries/settings";
import { formatMUR } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { CarCard, CLASS_LABEL, CLASS_ORDER } from "@/components/public/CarCard";
import { FAQAccordion, faqJsonLd } from "@/components/public/FAQAccordion";
import { JsonLd } from "@/components/public/JsonLd";
import { CarBookingCard } from "@/components/public/car/CarBookingCard";
import type { VehicleCategoryClass } from "@/types/enums";

// Same content for every visitor: statically generated, refreshed every
// five minutes so rate changes in the admin reach the page quickly.
export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getActiveCategories(createPublicClient());
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const car = await getCategoryBySlug(createPublicClient(), slug);
  // notFound() here, not just in the page: metadata is resolved before the
  // response starts streaming for crawlers, so they get a real 404 status
  // rather than a 200 "soft 404" (the (public) loading.tsx streams a shell).
  if (!car) notFound();

  const from = formatMUR(Math.min(car.rate_1_2_mur, car.rate_3_5_mur, car.rate_6_plus_mur));
  const title = `${car.name} Rental in Mauritius from ${from}/day | Rent Next Car Hire`;
  const description =
    car.tagline && car.description
      ? `${car.tagline} ${car.description}`.slice(0, 160)
      : `Rent a ${car.name} in Mauritius from ${from} per day, with pickup across the island.`;
  return {
    title,
    description,
    alternates: { canonical: `/cars/${car.slug}` },
    openGraph: { title, description, images: car.image_path ? [car.image_path] : undefined },
  };
}

const TRANSMISSION: Record<string, string> = { automatic: "Automatic", manual: "Manual" };
const FUEL: Record<string, string> = { petrol: "Petrol", diesel: "Diesel", hybrid: "Hybrid", electric: "Electric" };

export default async function CarDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const [car, categories, locations, settings] = await Promise.all([
    getCategoryBySlug(supabase, slug),
    getActiveCategories(supabase),
    getActiveLocations(supabase),
    getPublicSettings(supabase),
  ]);
  if (!car) notFound();

  const carClass = car.category as VehicleCategoryClass;
  const rates = { rate1To2Mur: car.rate_1_2_mur, rate3To5Mur: car.rate_3_5_mur, rate6PlusMur: car.rate_6_plus_mur };
  const features = Array.isArray(car.features) ? car.features.filter((f): f is string => typeof f === "string") : [];

  // "Similar vehicles": same class first, then the nearest classes on the
  // rate card — most classes hold a single model, so class alone is thin.
  const classRank = (c: string) => CLASS_ORDER.indexOf(c as VehicleCategoryClass);
  const similar = categories
    .filter((c) => c.id !== car.id)
    .sort(
      (a, b) =>
        Math.abs(classRank(a.category) - classRank(carClass)) - Math.abs(classRank(b.category) - classRank(carClass)) ||
        Math.abs(a.rate_6_plus_mur - car.rate_6_plus_mur) - Math.abs(b.rate_6_plus_mur - car.rate_6_plus_mur),
    )
    .slice(0, 3);

  const specs = [
    { icon: Cog, label: "Transmission", value: TRANSMISSION[car.transmission] ?? car.transmission },
    { icon: Users, label: "Seats", value: String(car.seats) },
    { icon: DoorOpen, label: "Doors", value: String(car.doors) },
    { icon: Fuel, label: "Fuel", value: FUEL[car.fuel_type] ?? car.fuel_type },
    { icon: Snowflake, label: "Air conditioning", value: car.air_conditioning ? "Yes" : "No" },
    ...(car.luggage_capacity ? [{ icon: Briefcase, label: "Luggage", value: `${car.luggage_capacity} bags` }] : []),
  ];

  const tiers = [
    { label: "1–2 days", rate: car.rate_1_2_mur },
    { label: "3–5 days", rate: car.rate_3_5_mur },
    { label: "6+ days", rate: car.rate_6_plus_mur },
  ];

  const base = siteUrl();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Cars", href: "/cars" },
          { name: car.name, href: `/cars/${car.slug}` },
        ]}
      />

      <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-10">
          <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[var(--radius-lg)] bg-surface-alt">
            {car.image_path ? (
              <Image
                src={car.image_path}
                alt={`${car.name} rental car`}
                fill
                priority
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-contain p-8"
              />
            ) : (
              <Car className="h-24 w-24 text-primary/30" strokeWidth={1.25} aria-hidden="true" />
            )}
          </div>

          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">{car.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{CLASS_LABEL[carClass] ?? car.category}</Badge>
              {car.best_for && <span className="text-sm text-text-muted">Best for {car.best_for.toLowerCase()}</span>}
            </div>
            {car.tagline && <p className="mt-4 text-lg text-text">{car.tagline}</p>}
          </div>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {specs.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
                <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <dt className="text-xs text-text-muted">{label}</dt>
                  <dd className="text-sm font-medium text-text">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          {car.description && <p className="leading-relaxed text-text">{car.description}</p>}

          <section>
            <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">Daily rates</h2>
            <p className="mt-1 text-sm text-text-muted">The longer you rent, the less you pay per day.</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {tiers.map((t) => (
                <div key={t.label} className="rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 text-center">
                  <p className="text-xs text-text-muted">{t.label}</p>
                  <p className="mt-1 font-semibold text-text">{formatMUR(t.rate)}</p>
                  <p className="text-xs text-text-muted">per day</p>
                </div>
              ))}
            </div>
          </section>

          {features.length > 0 && (
            <section>
              <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">What&apos;s included</h2>
              <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-text">
                    <Check className="h-4 w-4 shrink-0 text-success" aria-hidden="true" /> {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {settings.rentalFaqs.length > 0 && (
            <section>
              <h2 className="mb-4 font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">
                Renting a {car.name}: common questions
              </h2>
              <FAQAccordion items={settings.rentalFaqs} />
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CarBookingCard
            car={{ id: car.id, slug: car.slug, name: car.name, rates }}
            locations={locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name, isPickupPoint: l.is_pickup_point }))}
            otherCars={categories.filter((c) => c.id !== car.id).map((c) => ({ id: c.id, slug: c.slug, name: c.name }))}
            pickupTime={settings.defaultPickupTime}
            returnTime={settings.defaultReturnTime}
            minimumRentalDays={settings.minimumRentalDays}
          />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">Similar cars</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((c) => (
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
                  href: `/cars/${c.slug}`,
                  bookHref: `/booking/trip?category=${c.slug}`,
                }}
              />
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${car.name} rental`,
          description: car.description ?? undefined,
          image: car.image_path ? `${base}${car.image_path}` : undefined,
          brand: car.make ? { "@type": "Brand", name: car.make } : undefined,
          category: "Car rental",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "MUR",
            lowPrice: Math.min(...tiers.map((t) => t.rate)),
            highPrice: Math.max(...tiers.map((t) => t.rate)),
            offerCount: tiers.length,
            availability: "https://schema.org/InStock",
            url: `${base}/cars/${car.slug}`,
          },
        }}
      />
      {settings.rentalFaqs.length > 0 && <JsonLd data={faqJsonLd(settings.rentalFaqs)} />}
    </div>
  );
}
