"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { addDaysToDateKey, formatMUR, toDateKey } from "@/lib/format";
import { HOTEL_DELIVERY_SLUG, calculateBookingTotal } from "@/lib/pricing";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useBooking, useStepGuard } from "@/components/public/booking/BookingProvider";
import { StepHeader, StepLoading } from "@/components/public/booking/StepHeader";
import { HANDOVER_TIMES } from "@/components/public/booking/tripOptions";
import { useAvailability } from "@/components/public/booking/useAvailability";

export function TripStep() {
  const ready = useStepGuard("trip");
  const router = useRouter();
  const { data, state, update, confirmStep, category, pickupLocation, pickupAt, returnAt, tripErrors } = useBooking();

  const datesValid = !tripErrors.pickupAt && !tripErrors.returnAt && !tripErrors.pickupLocation;
  const availability = useAvailability(state.pickupLocationId, pickupAt, returnAt, ready && datesValid);

  if (!ready || !category) return <StepLoading />;

  const minDays = data.settings.minimumRentalDays;
  const pickupLocations = data.locations.filter((l) => l.isPickupPoint);
  const hotelDeliveryAddOn = data.addOns.find((a) => a.slug === HOTEL_DELIVERY_SLUG);

  const nearbyHotels = data.hotels.filter((h) => h.locationId === state.pickupLocationId);
  const otherHotels = data.hotels.filter((h) => h.locationId !== state.pickupLocationId);

  const count = availability.status === "ready" ? (availability.counts.get(category.id) ?? 0) : null;
  const unavailable = count === 0;

  // Alternatives when the chosen car isn't free: available cars closest in
  // price for the same window.
  const categoryTotal = (rates: typeof category.rates) =>
    calculateBookingTotal({ rates, pickupAt, returnAt }).totalMur;
  const alternatives =
    unavailable && availability.status === "ready"
      ? data.categories
          .filter((c) => c.id !== category.id && (availability.counts.get(c.id) ?? 0) > 0)
          .map((c) => ({ c, total: categoryTotal(c.rates) }))
          .sort((a, b) => Math.abs(a.total - categoryTotal(category.rates)) - Math.abs(b.total - categoryTotal(category.rates)))
          .slice(0, 3)
      : [];

  const hasErrors = Object.keys(tripErrors).length > 0;
  const canContinue = !hasErrors && availability.status !== "loading" && !unavailable;

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue) return;
    confirmStep("trip");
    router.push("/booking/extras");
  }

  return (
    <form onSubmit={handleContinue} noValidate>
      <StepHeader title="Your trip" description={`Where and when you'd like your ${category.name}.`} />

      <div className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-text">Pickup</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Select
              label="Location"
              value={state.pickupLocationId ?? ""}
              onChange={(e) =>
                update((s) => ({
                  pickupLocationId: e.target.value,
                  returnLocationId: s.differentReturn ? s.returnLocationId : e.target.value,
                }))
              }
              error={tripErrors.pickupLocation}
            >
              {pickupLocations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              value={state.pickupDate}
              min={toDateKey()}
              onChange={(e) => {
                const pickupDate = e.target.value;
                if (!pickupDate) return;
                update((s) => ({
                  pickupDate,
                  returnDate:
                    s.returnDate < addDaysToDateKey(pickupDate, minDays)
                      ? addDaysToDateKey(pickupDate, minDays)
                      : s.returnDate,
                }));
              }}
              error={tripErrors.pickupAt}
            />
            <Select label="Time" value={state.pickupTime} onChange={(e) => update({ pickupTime: e.target.value })}>
              {HANDOVER_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <Checkbox
              label="Deliver the car to my hotel"
              hint={
                hotelDeliveryAddOn
                  ? `Hotel delivery adds ${formatMUR(hotelDeliveryAddOn.priceMur)} to your booking.`
                  : undefined
              }
              checked={state.hotelDelivery}
              onChange={(e) => update({ hotelDelivery: e.target.checked, hotelId: e.target.checked ? state.hotelId : null })}
            />
            {state.hotelDelivery && (
              <div className="pl-7">
                <Select
                  label="Your hotel"
                  value={state.hotelId ?? ""}
                  onChange={(e) => update({ hotelId: e.target.value || null })}
                  error={tripErrors.hotel}
                  hint="Staying somewhere not listed? Leave hotel delivery off and tell us your hotel in the next steps."
                >
                  <option value="">Choose your hotel</option>
                  {nearbyHotels.length > 0 && (
                    <optgroup label={`Near ${pickupLocation?.name ?? "your pickup"}`}>
                      {nearbyHotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {otherHotels.length > 0 && (
                    <optgroup label={nearbyHotels.length > 0 ? "Elsewhere on the island" : "Partner hotels"}>
                      {otherHotels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Select>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-text">Return</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {state.differentReturn ? (
              <Select
                label="Location"
                value={state.returnLocationId ?? ""}
                onChange={(e) => update({ returnLocationId: e.target.value })}
              >
                {data.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text">Location</span>
                <span className="flex h-10 items-center text-sm text-text">{pickupLocation?.name}</span>
              </div>
            )}
            <Input
              label="Date"
              type="date"
              value={state.returnDate}
              min={addDaysToDateKey(state.pickupDate, minDays)}
              onChange={(e) => e.target.value && update({ returnDate: e.target.value })}
              error={tripErrors.returnAt}
            />
            <Select label="Time" value={state.returnTime} onChange={(e) => update({ returnTime: e.target.value })}>
              {HANDOVER_TIMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
          <Checkbox
            className="mt-5"
            label="Return to a different location"
            checked={state.differentReturn}
            onChange={(e) =>
              update((s) => ({ differentReturn: e.target.checked, returnLocationId: s.pickupLocationId }))
            }
          />
        </section>

        {unavailable && (
          <div role="alert" className="rounded-[var(--radius-lg)] border border-warning/40 bg-warning/10 p-5">
            <p className="flex items-center gap-2 font-medium text-warning">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              The {category.name} isn&apos;t available at {pickupLocation?.name} for these dates.
            </p>
            {alternatives.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-text">These are free for the same dates:</p>
                <ul className="mt-3 space-y-2">
                  {alternatives.map(({ c, total }) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-2.5"
                    >
                      <span className="text-sm">
                        <span className="font-medium text-text">{c.name}</span>{" "}
                        <span className="text-text-muted">· {formatMUR(total)} total</span>
                      </span>
                      <Button type="button" size="sm" variant="secondary" onClick={() => update({ categoryId: c.id })}>
                        Switch
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm text-text">
                Nothing else is free here for those dates either. Try different dates or another pickup location.
              </p>
            )}
          </div>
        )}

        {availability.status === "error" && (
          <p className="rounded-[var(--radius-md)] bg-warning/10 px-4 py-3 text-sm text-warning">
            We couldn&apos;t check live availability just now. You can carry on — we&apos;ll confirm the car is free
            before your booking is placed.
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => router.push("/booking/car")}>
            Change car
          </Button>
          <Button type="submit" size="lg" disabled={!canContinue} loading={availability.status === "loading"}>
            Continue to extras
          </Button>
        </div>
      </div>
    </form>
  );
}
