"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Car, Check } from "lucide-react";
import { addDaysToDateKey, formatMUR, toDateKey } from "@/lib/format";
import { calculateBookingTotal } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CLASS_LABEL } from "@/components/public/CarCard";
import { useBooking } from "@/components/public/booking/BookingProvider";
import { StepHeader, StepLoading } from "@/components/public/booking/StepHeader";
import { useAvailability } from "@/components/public/booking/useAvailability";

export function CarStep() {
  const router = useRouter();
  const { data, state, hydrated, update, confirmStep, pickupAt, returnAt, tripErrors } = useBooking();
  const datesValid = !tripErrors.pickupAt && !tripErrors.returnAt && !tripErrors.pickupLocation;
  const availability = useAvailability(state.pickupLocationId, pickupAt, returnAt, hydrated && datesValid);

  if (!hydrated) return <StepLoading />;

  const minDays = data.settings.minimumRentalDays;
  const pickupLocations = data.locations.filter((l) => l.isPickupPoint);

  const cars = data.categories
    .map((category) => {
      const count = availability.status === "ready" ? (availability.counts.get(category.id) ?? 0) : null;
      const total = datesValid ? calculateBookingTotal({ rates: category.rates, pickupAt, returnAt }) : null;
      return { category, count, total };
    })
    // Available first, keeping the fleet's own display order within each group.
    .sort((a, b) => Number(b.count !== 0) - Number(a.count !== 0));

  function choose(categoryId: string) {
    update({ categoryId });
    confirmStep("car");
    router.push("/booking/trip");
  }

  return (
    <div>
      <StepHeader title="Choose your car" description="Prices are for your whole rental, including all taxes." />

      <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:grid-cols-3">
        <Select
          label="Pickup location"
          value={state.pickupLocationId ?? ""}
          onChange={(e) =>
            update((s) => ({
              pickupLocationId: e.target.value,
              returnLocationId: s.differentReturn ? s.returnLocationId : e.target.value,
              hotelId: null,
              hotelDelivery: false,
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
          label="Pickup date"
          type="date"
          value={state.pickupDate}
          min={toDateKey()}
          onChange={(e) => {
            const pickupDate = e.target.value;
            if (!pickupDate) return;
            update((s) => ({
              pickupDate,
              // Keep the return date valid rather than making the customer fix it.
              returnDate:
                s.returnDate < addDaysToDateKey(pickupDate, minDays) ? addDaysToDateKey(pickupDate, minDays) : s.returnDate,
            }));
          }}
          error={tripErrors.pickupAt}
        />
        <Input
          label="Return date"
          type="date"
          value={state.returnDate}
          min={addDaysToDateKey(state.pickupDate, minDays)}
          onChange={(e) => e.target.value && update({ returnDate: e.target.value })}
          error={tripErrors.returnAt}
        />
      </div>

      {availability.status === "error" && (
        <p className="mt-4 rounded-[var(--radius-md)] bg-warning/10 px-4 py-3 text-sm text-warning">
          We couldn&apos;t check live availability just now. You can still choose a car — we&apos;ll confirm it&apos;s
          free before your booking is placed.
        </p>
      )}

      <ul className="mt-6 space-y-4">
        {cars.map(({ category, count, total }) => {
          const unavailable = count === 0;
          const selected = state.categoryId === category.id;
          return (
            <li key={category.id}>
              <div
                className={cn(
                  "flex flex-col gap-4 rounded-[var(--radius-lg)] border bg-surface p-4 transition-shadow sm:flex-row sm:items-center",
                  selected ? "border-primary ring-1 ring-primary" : "border-border",
                  unavailable ? "opacity-60" : "hover:shadow-[var(--shadow-md)]",
                )}
              >
                <div className="relative flex h-28 w-full shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-alt sm:w-44">
                  {category.imagePath ? (
                    <Image
                      src={category.imagePath}
                      alt={category.name}
                      fill
                      sizes="(min-width: 640px) 176px, 100vw"
                      className="object-contain p-2"
                    />
                  ) : (
                    <Car className="h-12 w-12 text-primary/30" aria-hidden="true" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text">
                      {category.name}
                    </p>
                    <Badge>{CLASS_LABEL[category.category]}</Badge>
                    {count !== null && (
                      <Badge variant={unavailable ? "error" : "success"}>
                        {unavailable ? "Not available" : `${count} available`}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-text-muted">
                    {category.transmission === "automatic" ? "Automatic" : "Manual"} · {category.seats} seats
                    {category.luggageCapacity ? ` · ${category.luggageCapacity} bags` : ""}
                    {category.airConditioning ? " · AC" : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                  {total && (
                    <div className="sm:text-right">
                      <p className="text-xl font-semibold text-text">{formatMUR(total.totalMur)}</p>
                      <p className="text-xs text-text-muted">
                        {formatMUR(total.dailyRateMur)}/day · {total.days} day{total.days === 1 ? "" : "s"}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => choose(category.id)}
                    disabled={unavailable || !datesValid || availability.status === "loading"}
                    className={cn(
                      "inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-md)] px-5 text-sm font-medium transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "bg-accent text-primary hover:bg-accent-hover" : "bg-primary text-white hover:bg-primary-hover",
                    )}
                  >
                    {selected && <Check className="h-4 w-4" aria-hidden="true" />}
                    {selected ? "Selected" : "Select"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
