import Link from "next/link";
import { Car, Building2, ShieldCheck, Headset } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { CarCard } from "@/components/public/CarCard";
import { LocationCard } from "@/components/public/LocationCard";
import { SearchWidget } from "@/components/public/SearchWidget";
import { formatMUR } from "@/lib/format";
import type { VehicleCategoryClass } from "@/types/enums";

export const metadata: Metadata = {
  title: "RentNext — Car Rental in Mauritius",
  description: "Reliable car rental across Mauritius. Island-wide pickup, hotel delivery, no hidden fees.",
};

const CLASS_ORDER: VehicleCategoryClass[] = ["economy", "comfort", "suv", "premium"];
const CLASS_LABEL: Record<VehicleCategoryClass, string> = {
  economy: "Economy",
  comfort: "Comfort",
  suv: "SUV",
  premium: "Premium",
};

export default async function HomePage() {
  const supabase = await createClient();
  const [categories, locations] = await Promise.all([
    getActiveCategories(supabase),
    getActiveLocations(supabase),
  ]);

  const tiles = CLASS_ORDER.map((cls) => {
    const inClass = categories.filter((c) => c.category === cls);
    const fromRate = inClass.length > 0 ? Math.min(...inClass.map((c) => c.daily_rate_mur)) : null;
    return { cls, count: inClass.length, fromRate };
  }).filter((t) => t.count > 0);

  const featured = [...categories].sort((a, b) => a.display_order - b.display_order).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-primary sm:min-h-[80vh]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#0a2a40]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(232,163,61,0.15),transparent_50%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-32 sm:px-6 lg:px-8">
          <h1 className="max-w-2xl font-[family-name:var(--font-heading)] text-4xl font-semibold text-white sm:text-5xl lg:text-display">
            Explore Mauritius Your Way
          </h1>
          <p className="mt-4 max-w-lg text-lg text-white/80">
            Reliable cars. Convenient pickup. Across the island.
          </p>
        </div>
      </section>

      {/* Search widget, overlapping hero */}
      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
        <SearchWidget locations={locations.map((l) => ({ slug: l.slug, name: l.name }))} />
      </div>

      {/* Our vehicles */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">Our Vehicles</h2>
        <p className="mt-2 text-text-muted">Four classes, eight models, one flat daily rate.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.cls}
              href={`/cars?category=${tile.cls}`}
              className="group rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <Car className="mx-auto h-10 w-10 text-primary/40 transition-colors group-hover:text-primary" strokeWidth={1.25} />
              <p className="mt-3 font-semibold text-text">{CLASS_LABEL[tile.cls]}</p>
              <p className="text-sm text-text-muted">{tile.count} models</p>
              {tile.fromRate && (
                <p className="mt-1 text-sm font-medium text-primary">from {formatMUR(tile.fromRate)}/day</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured vehicles */}
      <section className="bg-surface-alt py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
                Featured Vehicles
              </h2>
              <p className="mt-2 text-text-muted">A closer look at what&apos;s in the fleet.</p>
            </div>
            <Link href="/cars" className="hidden text-sm font-medium text-primary hover:underline sm:block">
              View all cars &rarr;
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((car) => (
              <CarCard
                key={car.id}
                car={{
                  name: car.name,
                  category: car.category as VehicleCategoryClass,
                  transmission: car.transmission,
                  seats: car.seats,
                  airConditioning: car.air_conditioning,
                  dailyRateMur: car.daily_rate_mur,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Locations */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
          Pick Up Across Mauritius
        </h2>
        <p className="mt-2 text-text-muted">Six locations, from the airport to the island&apos;s quietest beaches.</p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {locations.map((location) => (
            <LocationCard key={location.id} location={{ name: location.name, region: location.region }} />
          ))}
        </div>
      </section>

      {/* Why book with us */}
      <section className="bg-surface-alt py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
            Why Book With Us
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Car, title: "Island-wide delivery", body: "Pickup at any of our six locations, or have your car delivered." },
              { icon: Building2, title: "Hotel pickup", body: "Partnered with hotels across the north, west and east coasts." },
              { icon: ShieldCheck, title: "No hidden fees", body: "The price you see is the price you pay — no surprises at pickup." },
              { icon: Headset, title: "Local support", body: "A Mauritian team, reachable by phone or WhatsApp throughout your trip." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <Icon className="h-8 w-8 text-primary" strokeWidth={1.5} />
                <p className="mt-3 font-semibold text-text">{title}</p>
                <p className="mt-1 text-sm text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-primary py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-white">
            Ready to explore the island?
          </h2>
          <p className="mt-2 text-white/80">Search availability across all six locations in seconds.</p>
          <Link
            href="/cars"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-md)] bg-accent px-8 text-sm font-medium text-text transition-colors hover:bg-accent-hover"
          >
            Browse the fleet
          </Link>
        </div>
      </section>
    </>
  );
}
