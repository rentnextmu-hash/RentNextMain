import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveLocations, getLocationFleetCounts } from "@/lib/queries/locations";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { LocationCard } from "@/components/public/LocationCard";
import { MauritiusMap } from "@/components/public/MauritiusMap";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Car Rental Locations Across Mauritius | Rent Next Car Hire",
  description:
    "Pick up your rental car in Grand Baie, Flic-en-Flac, Belle Mare, Trou-aux-Biches, Le Morne or at SSR International Airport — or have it delivered to your hotel.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const supabase = createPublicClient();
  const [locations, fleetCounts] = await Promise.all([getActiveLocations(supabase), getLocationFleetCounts(supabase)]);
  const mapped = locations.flatMap((l) =>
    l.latitude !== null && l.longitude !== null
      ? [{ slug: l.slug, name: l.name, latitude: Number(l.latitude), longitude: Number(l.longitude), type: l.type }]
      : [],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Locations", href: "/locations" },
        ]}
      />
      <div className="mt-6 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">
            Pick up across Mauritius
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-muted">
            With {locations.length} pickup points around the island — from the airport to the north, east, west and
            south coasts — there&apos;s always one close to where you&apos;re staying. Prefer not to travel to us? Choose
            hotel delivery when you book and we&apos;ll bring the car to you.
          </p>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-surface-alt p-6">
          <MauritiusMap locations={mapped} />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((l) => (
          <LocationCard
            key={l.id}
            location={{
              name: l.name,
              region: l.region,
              vehicleCount: fleetCounts.get(l.id) ?? 0,
              href: `/locations/${l.slug}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
