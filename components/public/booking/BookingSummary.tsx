"use client";

import Image from "next/image";
import { useState } from "react";
import { Car, ChevronUp } from "lucide-react";
import { formatDateTimeLong, formatMUR } from "@/lib/format";
import { calculateAddOnTotal } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { CLASS_LABEL } from "@/components/public/CarCard";
import { useBooking } from "@/components/public/booking/BookingProvider";

export function addOnLineLabel(name: string, quantity: number) {
  return quantity > 1 ? `${name} × ${quantity}` : name;
}

function SummaryBody() {
  const { category, pickupLocation, returnLocation, pickupAt, returnAt, pricing, selectedAddOns, hotel, tripErrors } =
    useBooking();
  const datesValid = !tripErrors.pickupAt && !tripErrors.returnAt;

  return (
    <div className="space-y-5">
      {category ? (
        <div className="flex items-center gap-4">
          <div className="relative flex h-16 w-24 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-alt">
            {category.imagePath ? (
              <Image src={category.imagePath} alt="" fill sizes="96px" className="object-contain p-1.5" />
            ) : (
              <Car className="h-8 w-8 text-primary/30" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-[family-name:var(--font-heading)] text-lg font-semibold leading-tight text-text">
              {category.name}
            </p>
            <p className="text-sm text-text-muted">{CLASS_LABEL[category.category]} · or similar</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">No car chosen yet.</p>
      )}

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-text-muted">Pickup</dt>
          <dd className="font-medium text-text">
            {pickupLocation?.name ?? "—"}
            {hotel && <span className="block font-normal text-text-muted">Delivered to {hotel.name}</span>}
            {datesValid && <span className="block font-normal text-text-muted">{formatDateTimeLong(pickupAt)}</span>}
          </dd>
        </div>
        <div>
          <dt className="text-text-muted">Return</dt>
          <dd className="font-medium text-text">
            {returnLocation?.name ?? "—"}
            {datesValid && <span className="block font-normal text-text-muted">{formatDateTimeLong(returnAt)}</span>}
          </dd>
        </div>
      </dl>

      {pricing && datesValid && (
        <div className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-text-muted">
              {pricing.days} day{pricing.days === 1 ? "" : "s"} × {formatMUR(pricing.dailyRateMur)}
            </span>
            <span className="text-text">{formatMUR(pricing.carTotalMur)}</span>
          </div>
          {selectedAddOns.map(({ addOn, quantity }) => (
            <div key={addOn.id} className="flex justify-between gap-4">
              <span className="text-text-muted">{addOnLineLabel(addOn.name, quantity)}</span>
              <span className="text-text">
                {formatMUR(
                  calculateAddOnTotal([{ priceMur: addOn.priceMur, priceType: addOn.priceType, quantity }], pricing.days),
                )}
              </span>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <span className="font-semibold text-text">Total</span>
            <span className="text-xl font-semibold text-text">{formatMUR(pricing.totalMur)}</span>
          </div>
          <p className="text-xs text-text-muted">Nothing to pay now. We confirm your booking by email.</p>
        </div>
      )}
    </div>
  );
}

/**
 * The running booking summary: a sticky card beside the step on desktop,
 * a bottom bar that expands into a sheet on mobile.
 */
export function BookingSummary() {
  const { pricing, tripErrors, hydrated } = useBooking();
  const [open, setOpen] = useState(false);
  const showTotal = hydrated && pricing && !tripErrors.pickupAt && !tripErrors.returnAt;

  return (
    <>
      <aside className="sticky top-24 hidden rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-sm)] lg:block">
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-text-muted">Your booking</h2>
        {hydrated ? <SummaryBody /> : <div className="h-48 animate-pulse rounded-[var(--radius-md)] bg-surface-alt" />}
      </aside>

      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-primary/40 lg:hidden"
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface shadow-[var(--shadow-lg)] lg:hidden">
        <div
          id="booking-summary-sheet"
          className={cn("max-h-[70vh] overflow-y-auto border-b border-border px-4 py-5", !open && "hidden")}
        >
          {hydrated && <SummaryBody />}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="booking-summary-sheet"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span>
            <span className="block text-xs text-text-muted">{open ? "Hide details" : "Booking summary"}</span>
            <span className="text-lg font-semibold text-text">{showTotal ? formatMUR(pricing.totalMur) : "—"}</span>
          </span>
          <ChevronUp
            className={cn("h-5 w-5 text-text-muted transition-transform", open && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      </div>
    </>
  );
}
