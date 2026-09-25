import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarSearch, MapPin } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { checkAvailability } from "@/lib/availability";
import { calculateBookingTotal } from "@/lib/pricing";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { getPublicSettings } from "@/lib/queries/settings";
import { addDaysToDateKey, daysBetween, formatDateRange, formatMUR, mauritiusDateTime, toDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/EmptyState";
import { CarCard, CLASS_LABEL, CLASS_ORDER } from "@/components/public/CarCard";
import { SearchWidget } from "@/components/public/SearchWidget";
import type { VehicleCategoryClass } from "@/types/enums";

export const metadata: Metadata = {
  title: "Available cars | Rent Next Car Hire",
  // Per-visitor results: keep them out of search engines.
  robots: { index: false, follow: true },
};

type SearchParams = { location?: string; from?: string; to?: string; category?: string; sort?: string };

const SORTS = [
  { value: "price", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "seats", label: "Largest first" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const supabase = createPublicClient();
  const [locations, categories, settings] = await Promise.all([
    getActiveLocations(supabase),
    getActiveCategories(supabase),
    getPublicSettings(supabase),
  ]);

  // Invalid or missing search: fall back to the full catalogue rather than erroring.
  const location = locations.find((l) => l.slug === params.location && l.is_pickup_point);
  const from = params.from && DATE_KEY.test(params.from) ? params.from : null;
  const to = params.to && DATE_KEY.test(params.to) ? params.to : null;
  if (!location || !from || !to || to <= from || from < toDateKey()) redirect("/cars");

  const tripWindow = (start: string, end: string) => ({
    from: mauritiusDateTime(start, settings.defaultPickupTime),
    to: mauritiusDateTime(end, settings.defaultReturnTime),
  });
  const { from: pickupAt, to: returnAt } = tripWindow(from, to);
  const counts = new Map(
    (await checkAvailability(supabase, { locationId: location.id, from: pickupAt, to: returnAt })).map((c) => [
      c.categoryId,
      c.availableCount,
    ]),
  );

  const available = categories
    .filter((c) => (counts.get(c.id) ?? 0) > 0)
    .map((c) => ({
      category: c,
      count: counts.get(c.id)!,
      total: calculateBookingTotal({
        rates: { rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur },
        pickupAt,
        returnAt,
      }),
    }));

  const activeClass = CLASS_ORDER.includes(params.category as VehicleCategoryClass) ? params.category : "all";
  const sort: Sort = SORTS.some((s) => s.value === params.sort) ? (params.sort as Sort) : "price";
  const shown = available
    .filter((a) => activeClass === "all" || a.category.category === activeClass)
    .sort((a, b) =>
      sort === "price_desc"
        ? b.total.totalMur - a.total.totalMur
        : sort === "seats"
          ? b.category.seats - a.category.seats || a.total.totalMur - b.total.totalMur
          : a.total.totalMur - b.total.totalMur,
    );
  const presentClasses = CLASS_ORDER.filter((cls) => available.some((a) => a.category.category === cls));

  const days = daysBetween(pickupAt, returnAt);
  const href = (overrides: Partial<SearchParams>) => {
    const next = { location: location.slug, from, to, category: activeClass, sort, ...overrides };
    const qs = new URLSearchParams({ location: next.location!, from: next.from!, to: next.to! });
    if (next.category && next.category !== "all") qs.set("category", next.category);
    if (next.sort && next.sort !== "price") qs.set("sort", next.sort);
    return `/search?${qs.toString()}`;
  };
  const bookingHref = (slug: string) =>
    `/booking/trip?${new URLSearchParams({ category: slug, location: location.slug, from, to }).toString()}`;

  // Nothing free here: look for the same dates elsewhere, and nearby dates here.
  let otherLocations: { slug: string; name: string; count: number }[] = [];
  let shiftedDates: { from: string; to: string; count: number }[] = [];
  if (available.length === 0) {
    const others = locations.filter((l) => l.is_pickup_point && l.id !== location.id);
    const shifts = [1, 2, 3, 7].map((n) => ({ from: addDaysToDateKey(from, n), to: addDaysToDateKey(to, n) }));
    const [otherResults, shiftResults] = await Promise.all([
      Promise.all(others.map((l) => checkAvailability(supabase, { locationId: l.id, from: pickupAt, to: returnAt }))),
      Promise.all(shifts.map((s) => checkAvailability(supabase, { locationId: location.id, ...tripWindow(s.from, s.to) }))),
    ]);
    const total = (rows: { availableCount: number }[]) => rows.reduce((sum, r) => sum + r.availableCount, 0);
    otherLocations = others
      .map((l, i) => ({ slug: l.slug, name: l.name, count: total(otherResults[i]) }))
      .filter((l) => l.count > 0);
    shiftedDates = shifts.map((s, i) => ({ ...s, count: total(shiftResults[i]) })).filter((s) => s.count > 0);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-alt px-5 py-4">
        <p className="text-text">
          <span className="font-semibold">{location.name}</span> · {formatDateRange(pickupAt, returnAt)} ·{" "}
          {days} day{days === 1 ? "" : "s"}
        </p>
        <details className="group w-full sm:w-auto">
          <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline [&::-webkit-details-marker]:hidden">
            Change search
          </summary>
          <SearchWidget
            className="mt-4 shadow-none sm:min-w-[40rem]"
            locations={locations.filter((l) => l.is_pickup_point).map((l) => ({ slug: l.slug, name: l.name }))}
            initial={{ location: location.slug, from, to }}
          />
        </details>
      </div>

      <h1 className="mt-8 font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">
        {available.length > 0
          ? `${available.length} car${available.length === 1 ? "" : "s"} available`
          : "Nothing available for these dates"}
      </h1>

      {available.length > 0 ? (
        <>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[{ value: "all", label: "All" }, ...presentClasses.map((c) => ({ value: c, label: CLASS_LABEL[c] }))].map((f) => (
                <Link
                  key={f.value}
                  href={href({ category: f.value })}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    activeClass === f.value
                      ? "border-primary bg-primary text-white"
                      : "border-border bg-surface text-text hover:border-primary",
                  )}
                >
                  {f.label}
                </Link>
              ))}
            </div>
            <nav aria-label="Sort" className="flex flex-wrap gap-3 text-sm">
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={href({ sort: s.value })}
                  aria-current={sort === s.value ? "true" : undefined}
                  className={sort === s.value ? "font-semibold text-text" : "text-text-muted hover:text-primary"}
                >
                  {s.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map(({ category: c, count, total }) => (
              <CarCard
                key={c.id}
                car={{
                  name: c.name,
                  category: c.category as VehicleCategoryClass,
                  transmission: c.transmission,
                  seats: c.seats,
                  airConditioning: c.air_conditioning,
                  dailyRateMur: total.dailyRateMur,
                  imagePath: c.image_path,
                  availableCount: count,
                  href: `/cars/${c.slug}`,
                  bookHref: bookingHref(c.slug),
                  priceNote: `${formatMUR(total.totalMur)} total for ${total.days} day${total.days === 1 ? "" : "s"}`,
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-6 space-y-8">
          <EmptyState
            icon={<CalendarSearch className="h-10 w-10" strokeWidth={1.25} />}
            title={`Every car at ${location.name} is taken for those dates`}
            description="Try one of these instead, or change your search above."
            className="rounded-[var(--radius-lg)] border border-border bg-surface py-10"
          />
          {otherLocations.length > 0 && (
            <section>
              <h2 className="font-semibold text-text">Same dates, another pickup point</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {otherLocations.map((l) => (
                  <li key={l.slug}>
                    <Link
                      href={`/search?${new URLSearchParams({ location: l.slug, from, to }).toString()}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-primary"
                    >
                      <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                      {l.name} <span className="text-text-muted">· {l.count} available</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {shiftedDates.length > 0 && (
            <section>
              <h2 className="font-semibold text-text">{location.name}, slightly later dates</h2>
              <ul className="mt-3 flex flex-wrap gap-3">
                {shiftedDates.map((s) => (
                  <li key={s.from}>
                    <Link
                      href={`/search?${new URLSearchParams({ location: location.slug, from: s.from, to: s.to }).toString()}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm hover:border-primary"
                    >
                      {formatDateRange(mauritiusDateTime(s.from, "12:00"), mauritiusDateTime(s.to, "12:00"))}
                      <span className="text-text-muted">· {s.count} available</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
