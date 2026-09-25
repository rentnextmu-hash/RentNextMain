"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createClient } from "@/lib/supabase/client";
import { checkAvailability } from "@/lib/availability";
import { addDaysToDateKey, formatMUR, mauritiusDateTime, toDateKey } from "@/lib/format";
import { calculateBookingTotal, type CategoryRates } from "@/lib/pricing";

type Result =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "available"; count: number }
  | { status: "unavailable"; alternatives: { slug: string; name: string; count: number }[] }
  | { status: "error" };

/**
 * The car page's sticky booking card: where and when, a live price
 * estimate (lib/pricing.ts), then a real availability check through the
 * check-availability Edge Function before sending the customer into the
 * booking flow with everything pre-filled.
 */
export function CarBookingCard({
  car,
  locations,
  otherCars,
  pickupTime,
  returnTime,
  minimumRentalDays,
}: {
  car: { id: string; slug: string; name: string; rates: CategoryRates };
  locations: { id: string; slug: string; name: string; isPickupPoint: boolean }[];
  otherCars: { id: string; slug: string; name: string }[];
  pickupTime: string;
  returnTime: string;
  minimumRentalDays: number;
}) {
  const pickupLocations = locations.filter((l) => l.isPickupPoint);
  const tomorrow = addDaysToDateKey(toDateKey(), 1);
  const [locationSlug, setLocationSlug] = useState(pickupLocations[0]?.slug ?? "");
  const [differentReturn, setDifferentReturn] = useState(false);
  const [returnSlug, setReturnSlug] = useState(pickupLocations[0]?.slug ?? "");
  const [from, setFrom] = useState(tomorrow);
  const [to, setTo] = useState(addDaysToDateKey(tomorrow, Math.max(5, minimumRentalDays)));
  const [result, setResult] = useState<Result>({ status: "idle" });

  const pickupAt = mauritiusDateTime(from, pickupTime);
  const returnAt = mauritiusDateTime(to, returnTime);
  const valid = !!from && !!to && new Date(returnAt) > new Date(pickupAt);
  const estimate = valid ? calculateBookingTotal({ rates: car.rates, pickupAt, returnAt }) : null;
  const tooShort = estimate !== null && estimate.days < minimumRentalDays;
  const location = pickupLocations.find((l) => l.slug === locationSlug);
  const returnLocation = differentReturn ? locations.find((l) => l.slug === returnSlug) : location;

  // Any change to the trip invalidates a previous check.
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setResult({ status: "idle" });
  };

  async function check() {
    if (!location || !valid || tooShort) return;
    setResult({ status: "checking" });
    try {
      const counts = await checkAvailability(createClient(), { locationId: location.id, from: pickupAt, to: returnAt });
      const byId = new Map(counts.map((c) => [c.categoryId, c.availableCount]));
      const count = byId.get(car.id) ?? 0;
      if (count > 0) {
        setResult({ status: "available", count });
      } else {
        setResult({
          status: "unavailable",
          alternatives: otherCars
            .filter((c) => (byId.get(c.id) ?? 0) > 0)
            .slice(0, 3)
            .map((c) => ({ ...c, count: byId.get(c.id)! })),
        });
      }
    } catch {
      setResult({ status: "error" });
    }
  }

  const bookingHref = (slug: string) => {
    const qs = new URLSearchParams({ category: slug, location: locationSlug, from, to });
    if (differentReturn && returnSlug !== locationSlug) qs.set("return", returnSlug);
    return `/booking/trip?${qs.toString()}`;
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-md)]">
      <p className="text-sm text-text-muted">From</p>
      <p className="text-text">
        <span className="font-[family-name:var(--font-heading)] text-3xl font-semibold">
          {formatMUR(Math.min(car.rates.rate1To2Mur, car.rates.rate3To5Mur, car.rates.rate6PlusMur))}
        </span>{" "}
        <span className="text-text-muted">/ day</span>
      </p>

      <div className="mt-5 space-y-4">
        <Select label="Pickup location" value={locationSlug} onChange={(e) => change(setLocationSlug)(e.target.value)}>
          {pickupLocations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Pickup date"
            type="date"
            value={from}
            min={toDateKey()}
            onChange={(e) => {
              const d = e.target.value;
              if (!d) return;
              change(setFrom)(d);
              if (to <= d) setTo(addDaysToDateKey(d, Math.max(minimumRentalDays, 1)));
            }}
          />
          <Input
            label="Return date"
            type="date"
            value={to}
            min={addDaysToDateKey(from, 1)}
            onChange={(e) => e.target.value && change(setTo)(e.target.value)}
          />
        </div>
        <Checkbox
          label="Return to a different location"
          checked={differentReturn}
          onChange={(e) => {
            change(setDifferentReturn)(e.target.checked);
            setReturnSlug(locationSlug);
          }}
        />
        {differentReturn && (
          <Select label="Return location" value={returnSlug} onChange={(e) => change(setReturnSlug)(e.target.value)}>
            {locations.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="mt-5 rounded-[var(--radius-md)] bg-surface-alt px-4 py-3 text-sm" aria-live="polite">
        {estimate ? (
          <>
            <p className="text-text">
              {estimate.days} day{estimate.days === 1 ? "" : "s"} × {formatMUR(estimate.dailyRateMur)} ={" "}
              <span className="font-semibold">{formatMUR(estimate.carTotalMur)}</span>
            </p>
            {tooShort && (
              <p className="mt-1 text-warning-deep">The minimum rental is {minimumRentalDays} days.</p>
            )}
          </>
        ) : (
          <p className="text-warning-deep">Return must be after pickup.</p>
        )}
      </div>

      {result.status === "available" ? (
        <div className="mt-5 space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-success" role="status">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {result.count} available at {location?.name}
            {returnLocation && returnLocation.slug !== location?.slug ? `, returning to ${returnLocation.name}` : ""}
          </p>
          <Link
            href={bookingHref(car.slug)}
            className="flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-primary px-6 font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Continue to booking
          </Link>
        </div>
      ) : (
        <>
          <Button
            type="button"
            size="lg"
            className="mt-5 w-full"
            onClick={check}
            loading={result.status === "checking"}
            disabled={!valid || tooShort}
          >
            Check availability
          </Button>
          {result.status === "unavailable" && (
            <div className="mt-4 text-sm" role="status">
              <p className="flex items-center gap-2 font-medium text-error">
                <XCircle className="h-4 w-4" aria-hidden="true" />
                Not available at {location?.name} for those dates.
              </p>
              {result.alternatives.length > 0 ? (
                <>
                  <p className="mt-2 text-text-muted">These are free for the same dates:</p>
                  <ul className="mt-2 space-y-1">
                    {result.alternatives.map((a) => (
                      <li key={a.slug}>
                        <Link href={bookingHref(a.slug)} className="font-medium text-primary hover:underline">
                          {a.name}
                        </Link>{" "}
                        <span className="text-text-muted">· {a.count} available</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-text-muted">Try other dates or another pickup location.</p>
              )}
            </div>
          )}
          {result.status === "error" && (
            <p className="mt-4 text-sm text-warning-deep" role="status">
              We couldn&apos;t check availability just now.{" "}
              <Link href={bookingHref(car.slug)} className="font-medium text-primary hover:underline">
                Continue anyway
              </Link>{" "}
              — we confirm before anything is booked.
            </p>
          )}
        </>
      )}
    </div>
  );
}
