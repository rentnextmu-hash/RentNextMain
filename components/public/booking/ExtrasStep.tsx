"use client";

import { useRouter } from "next/navigation";
import { Check, Lock, Minus, Plus } from "lucide-react";
import { formatMUR } from "@/lib/format";
import { AIRPORT_DELIVERY_SLUG, HOTEL_DELIVERY_SLUG, calculateAddOnTotal } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useBooking, useStepGuard } from "@/components/public/booking/BookingProvider";
import { StepHeader, StepLoading } from "@/components/public/booking/StepHeader";
import type { BookingAddOn } from "@/lib/queries/bookingFlow";

function priceBasis(addOn: BookingAddOn) {
  return addOn.priceType === "per_day" ? `${formatMUR(addOn.priceMur)} per day` : `${formatMUR(addOn.priceMur)} one-off`;
}

export function ExtrasStep() {
  const ready = useStepGuard("extras");
  const router = useRouter();
  const { data, state, update, confirmStep, lockedAddOnIds, pricing, pickupLocation, hotel } = useBooking();

  if (!ready || !pricing) return <StepLoading />;

  const days = pricing.days;
  const setQuantity = (addOn: BookingAddOn, quantity: number) =>
    update((s) => {
      const addOns = { ...s.addOns };
      if (quantity <= 0) delete addOns[addOn.id];
      else addOns[addOn.id] = Math.min(quantity, addOn.maxQuantity);
      return { addOns };
    });

  const lockReason = (addOn: BookingAddOn) =>
    addOn.slug === AIRPORT_DELIVERY_SLUG
      ? `Included because you're picking up at ${pickupLocation?.name ?? "the airport"}.`
      : addOn.slug === HOTEL_DELIVERY_SLUG
        ? `Included because you chose delivery to ${hotel?.name ?? "your hotel"}. Turn it off in the Trip step.`
        : "Included with your trip.";

  const optionalChosen = Object.keys(state.addOns).some((id) => !lockedAddOnIds.has(id) && state.addOns[id] > 0);

  function handleContinue() {
    confirmStep("extras");
    router.push("/booking/details");
  }

  return (
    <div>
      <StepHeader title="Extras" description="Everything here is optional. Prices are added to your total straight away." />

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data.addOns.map((addOn) => {
          const locked = lockedAddOnIds.has(addOn.id);
          const quantity = locked ? 1 : (state.addOns[addOn.id] ?? 0);
          const selected = quantity > 0;
          const stackable = addOn.maxQuantity > 1 && !locked;
          // Hotel delivery only makes sense with a hotel chosen in the Trip step.
          const needsHotel = addOn.slug === HOTEL_DELIVERY_SLUG && !locked;
          const lineTotal = calculateAddOnTotal(
            [{ priceMur: addOn.priceMur, priceType: addOn.priceType, quantity: Math.max(quantity, 1) }],
            days,
          );

          return (
            <li
              key={addOn.id}
              className={cn(
                "flex flex-col rounded-[var(--radius-lg)] border bg-surface p-5 transition-colors",
                selected ? "border-primary ring-1 ring-primary" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-text">{addOn.name}</p>
                  <p className="text-sm text-text-muted">{priceBasis(addOn)}</p>
                </div>
                {locked && <Lock className="h-4 w-4 shrink-0 text-text-muted" aria-label="Included automatically" />}
              </div>
              {addOn.description && <p className="mt-2 text-sm text-text-muted">{addOn.description}</p>}

              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                <span className="text-sm text-text">
                  {selected ? (
                    <>
                      <span className="font-semibold">{formatMUR(lineTotal)}</span>
                      {addOn.priceType === "per_day" && <span className="text-text-muted"> for {days} days</span>}
                    </>
                  ) : addOn.priceType === "per_day" ? (
                    <span className="text-text-muted">{formatMUR(lineTotal)} for {days} days</span>
                  ) : null}
                </span>

                {locked ? (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                    <Check className="h-4 w-4" aria-hidden="true" /> Included
                  </span>
                ) : needsHotel ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/booking/trip")}>
                    Choose hotel
                  </Button>
                ) : stackable && selected ? (
                  <div className="flex items-center gap-2" role="group" aria-label={`${addOn.name} quantity`}>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-8 px-0"
                      onClick={() => setQuantity(addOn, quantity - 1)}
                      aria-label={`Remove one ${addOn.name.toLowerCase()}`}
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span className="w-5 text-center text-sm font-semibold text-text" aria-live="polite">
                      {quantity}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="w-8 px-0"
                      onClick={() => setQuantity(addOn, quantity + 1)}
                      disabled={quantity >= addOn.maxQuantity}
                      aria-label={`Add another ${addOn.name.toLowerCase()}`}
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "primary" : "secondary"}
                    onClick={() => setQuantity(addOn, selected ? 0 : 1)}
                    aria-pressed={selected}
                  >
                    {selected ? (
                      <>
                        <Check className="h-4 w-4" aria-hidden="true" /> Added
                      </>
                    ) : (
                      "Add"
                    )}
                  </Button>
                )}
              </div>
              {locked && <p className="mt-3 text-xs text-text-muted">{lockReason(addOn)}</p>}
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={() => router.push("/booking/trip")}>
          Back to trip
        </Button>
        <Button type="button" size="lg" onClick={handleContinue}>
          {optionalChosen ? "Continue" : "Continue without extras"}
        </Button>
      </div>
    </div>
  );
}
