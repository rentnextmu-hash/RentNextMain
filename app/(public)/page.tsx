import Link from "next/link";
import { Car, Building2, ShieldCheck, Headset } from "lucide-react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveCategories, getCategoriesWithFleetAvailability } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { CarCard, CLASS_ORDER } from "@/components/public/CarCard";
import { LocationCard } from "@/components/public/LocationCard";
import { SearchWidget } from "@/components/public/SearchWidget";
import { FleetShowcase, type FleetShowcaseVehicle } from "@/components/public/FleetShowcase";
import type { VehicleCategoryClass } from "@/types/enums";

export const metadata: Metadata = {
  title: "Rent Next Car Hire — Car Rental in Mauritius",
  description: "Elevate your driving experience. Reliable car rental across Mauritius — island-wide pickup, no hidden fees.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const [categories, locations, showcaseCategories] = await Promise.all([
    getActiveCategories(supabase),
    getActiveLocations(supabase),
    getCategoriesWithFleetAvailability(supabase),
  ]);

  const fleet = [...categories].sort(
    (a, b) => CLASS_ORDER.indexOf(a.category as VehicleCategoryClass) - CLASS_ORDER.indexOf(b.category as VehicleCategoryClass),
  );

  const showcaseVehicles: FleetShowcaseVehicle[] = showcaseCategories
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category as VehicleCategoryClass,
      rateClass: c.rate_class,
      tagline: c.tagline,
      description: c.description,
      bestFor: c.best_for,
      seats: c.seats,
      doors: c.doors,
      transmission: c.transmission,
      airConditioning: c.air_conditioning,
      luggageCapacity: c.luggage_capacity,
      imagePath: c.image_path,
      rate1To2Mur: c.rate_1_2_mur,
      rate3To5Mur: c.rate_3_5_mur,
      rate6PlusMur: c.rate_6_plus_mur,
      availableCount: c.availableCount,
    }));

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[70vh] items-end overflow-hidden bg-primary sm:min-h-[80vh]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[#050c16]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,193,181,0.15),transparent_50%)]" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-28 pt-32 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">Rent Next Car Hire</p>
          <h1 className="mt-3 max-w-2xl font-[family-name:var(--font-heading)] text-4xl font-semibold text-white sm:text-5xl lg:text-display">
            Elevate Your Driving Experience
          </h1>
          <p className="mt-4 max-w-lg text-lg text-white/80">
            Reliable cars. Convenient pickup. Across Mauritius.
          </p>
        </div>
      </section>

      {/* Search widget, overlapping hero */}
      <div className="relative z-10 mx-auto -mt-16 max-w-5xl px-4 sm:px-6 lg:px-8">
        <SearchWidget locations={locations.map((l) => ({ slug: l.slug, name: l.name }))} />
      </div>

      {/* Fleet showcase — the emotional showcase, full-bleed */}
      <div className="relative z-0 mt-16">
        <FleetShowcase vehicles={showcaseVehicles} />
      </div>

      {/* Our Vehicles grid — the practical browse entry point */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">Our Fleet</h2>
            <p className="mt-2 text-text-muted">{fleet.length} models, from city runabouts to a plug-in hybrid executive sedan.</p>
          </div>
          <Link href="/cars" className="hidden text-sm font-medium text-primary hover:underline sm:block">
            View all cars &rarr;
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {fleet.map((car) => (
            <CarCard
              key={car.id}
              car={{
                name: car.name,
                category: car.category as VehicleCategoryClass,
                transmission: car.transmission,
                seats: car.seats,
                airConditioning: car.air_conditioning,
                dailyRateMur: car.daily_rate_mur ?? car.rate_6_plus_mur,
                imagePath: car.image_path,
                href: `/cars/${car.slug}`,
              }}
            />
          ))}
        </div>
      </section>

      {/* Locations */}
      <section className="bg-surface-alt py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
            Pick Up Across Mauritius
          </h2>
          <p className="mt-2 text-text-muted">Six locations, from the airport to the island&apos;s quietest beaches.</p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={{ name: location.name, region: location.region, href: `/locations/${location.slug}` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why book with us */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
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
