import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getActiveCategories, getCategoriesWithAvailabilityCount } from "@/lib/queries/categories";
import { getLocationBySlug } from "@/lib/queries/locations";
import { CarCard, CLASS_LABEL, CLASS_ORDER } from "@/components/public/CarCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { formatDateRange } from "@/lib/format";
import type { VehicleCategoryClass } from "@/types/enums";
import { Car } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Vehicles | Rent Next Car Hire",
  description: "Browse the full Rent Next Car Hire fleet — from the Suzuki Celerio to the BMW 330e, across Mauritius.",
};

type SearchParams = {
  category?: string;
  location?: string;
  from?: string;
  to?: string;
};

// Straight to the trip step with the car chosen; location and dates from
// the search (if any) are carried over rather than asked for again.
function bookingHref(slug: string, params: SearchParams): string {
  const qs = new URLSearchParams({ category: slug });
  if (params.location) qs.set("location", params.location);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  return `/booking/trip?${qs.toString()}`;
}

export default async function CarsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = await createClient();

  const activeClass = (params.category ?? "all") as VehicleCategoryClass | "all";
  const hasSearch = Boolean(params.location && params.from && params.to);

  const searchedLocation = params.location ? await getLocationBySlug(supabase, params.location) : null;

  const categories =
    hasSearch && searchedLocation
      ? await getCategoriesWithAvailabilityCount(supabase, searchedLocation.id, params.from!, params.to!)
      : (await getActiveCategories(supabase)).map((c) => ({ ...c, availableCount: undefined as number | undefined }));

  // Filter pills reflect whichever classes actually exist in the data,
  // in canonical cheapest-to-priciest order, rather than a hardcoded list
  // that could drift from the real fleet.
  const presentClasses = CLASS_ORDER.filter((cls) => categories.some((c) => c.category === cls));
  const classFilters: { value: VehicleCategoryClass | "all"; label: string }[] = [
    { value: "all", label: "All" },
    ...presentClasses.map((cls) => ({ value: cls, label: CLASS_LABEL[cls] })),
  ];

  const filtered = activeClass === "all" ? categories : categories.filter((c) => c.category === activeClass);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">Our Vehicles</h1>
        <p className="mt-2 text-text-muted">
          {categories.length} model{categories.length === 1 ? "" : "s"} available across the fleet.
        </p>
      </div>

      {hasSearch && searchedLocation && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] bg-surface-alt px-4 py-3 text-sm text-text">
          Showing availability for <span className="font-medium">{searchedLocation.name}</span>,{" "}
          <span className="font-medium">{formatDateRange(params.from!, params.to!)}</span>
          <Link href="/cars" className="ml-2 text-primary hover:underline">
            Change
          </Link>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2">
        {classFilters.map((filter) => {
          const href = (() => {
            const qs = new URLSearchParams();
            if (filter.value !== "all") qs.set("category", filter.value);
            if (params.location) qs.set("location", params.location);
            if (params.from) qs.set("from", params.from);
            if (params.to) qs.set("to", params.to);
            const query = qs.toString();
            return query ? `/cars?${query}` : "/cars";
          })();

          return (
            <Link
              key={filter.value}
              href={href}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                activeClass === filter.value
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-surface text-text hover:border-primary",
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((car) => (
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
                availableCount: car.availableCount,
                bookHref: bookingHref(car.slug, params),
              }}
              className={car.availableCount === 0 ? "opacity-50" : undefined}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Car className="h-10 w-10" strokeWidth={1.25} />}
          title="No vehicles match these filters"
          description="Try a different class, or clear filters to see the full fleet."
          action={
            <Link href="/cars" className="text-sm font-medium text-primary hover:underline">
              Clear filters
            </Link>
          }
          className="mt-8"
        />
      )}
    </div>
  );
}
