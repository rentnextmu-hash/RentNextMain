"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { AlertTriangle, Car } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTimeLong, formatMUR } from "@/lib/format";
import { calculateAddOnTotal } from "@/lib/pricing";
import type { BookingApiError, CreateBookingRequest } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { CLASS_LABEL } from "@/components/public/CarCard";
import { useBooking, useStepGuard } from "@/components/public/booking/BookingProvider";
import { addOnLineLabel } from "@/components/public/booking/BookingSummary";
import { StepHeader, StepLoading } from "@/components/public/booking/StepHeader";

function ReviewBlock({ title, editHref, children }: { title: string; editHref: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-text">{title}</h2>
        <Link
          href={editHref}
          className="text-sm font-medium text-primary hover:underline"
          aria-label={`Edit ${title.toLowerCase()}`}
        >
          Edit
        </Link>
      </div>
      {children}
    </section>
  );
}

type SubmitError = { message: string; unavailable: boolean };

async function readApiError(error: unknown): Promise<SubmitError> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as BookingApiError;
      return { message: body.error.message, unavailable: body.error.code === "unavailable" };
    } catch {
      // Non-JSON error body — fall through to the generic message.
    }
  }
  return {
    message: "We couldn't reach our booking system. Check your connection and try again — nothing has been booked yet.",
    unavailable: false,
  };
}

export function SummaryStep() {
  const ready = useStepGuard("summary");
  const router = useRouter();
  const booking = useBooking();
  const { state, category, pickupLocation, returnLocation, hotel, pickupAt, returnAt, pricing, selectedAddOns } =
    booking;
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<SubmitError | null>(null);

  if (!ready || !category || !pricing || !pickupLocation || !returnLocation) return <StepLoading />;

  const c = state.customer;
  const isAirport = pickupLocation.type === "airport";

  async function handleConfirm() {
    if (!category || !pickupLocation || !returnLocation) return;
    setSubmitting(true);
    setError(null);

    // No prices in the payload: create-booking recalculates everything
    // from the database.
    const payload: CreateBookingRequest = {
      categoryId: category.id,
      pickupLocationId: pickupLocation.id,
      returnLocationId: returnLocation.id,
      pickupAt,
      returnAt,
      hotelId: hotel?.id ?? null,
      addOns: selectedAddOns.map((s) => ({ addOnId: s.addOn.id, quantity: s.quantity })),
      customer: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        country: c.country,
        hotelName: hotel ? undefined : c.hotelName,
        flightNumber: isAirport ? c.flightNumber : "",
        specialRequests: c.specialRequests,
        acceptTerms: true,
        marketingConsent: c.marketingConsent,
      },
    };

    const { data, error: invokeError } = await createClient().functions.invoke<{ reference: string; key: string }>(
      "create-booking",
      { body: payload },
    );

    if (invokeError || !data) {
      setError(await readApiError(invokeError));
      setSubmitting(false);
      return;
    }

    booking.finish();
    router.replace(`/booking/confirmation/${data.reference}?key=${encodeURIComponent(data.key)}`);
  }

  return (
    <div>
      <StepHeader title="Review your booking" description="Check everything below, then confirm your request." />

      <div className="space-y-4">
        <ReviewBlock title="Car" editHref="/booking/car">
          <div className="flex items-center gap-4">
            <div className="relative flex h-20 w-32 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-alt">
              {category.imagePath ? (
                <Image src={category.imagePath} alt={category.name} fill sizes="128px" className="object-contain p-2" />
              ) : (
                <Car className="h-10 w-10 text-primary/30" aria-hidden="true" />
              )}
            </div>
            <div>
              <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text">
                {category.name} <span className="text-sm font-normal text-text-muted">or similar</span>
              </p>
              <p className="text-sm text-text-muted">
                {CLASS_LABEL[category.category]} · {category.transmission === "automatic" ? "Automatic" : "Manual"} ·{" "}
                {category.seats} seats · {category.doors} doors{category.airConditioning ? " · AC" : ""}
              </p>
            </div>
          </div>
        </ReviewBlock>

        <ReviewBlock title="Trip" editHref="/booking/trip">
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-text-muted">Pickup</dt>
              <dd className="font-medium text-text">{pickupLocation.name}</dd>
              {hotel && <dd className="text-text-muted">Delivered to {hotel.name}</dd>}
              <dd className="text-text-muted">{formatDateTimeLong(pickupAt)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Return</dt>
              <dd className="font-medium text-text">{returnLocation.name}</dd>
              <dd className="text-text-muted">{formatDateTimeLong(returnAt)}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Duration</dt>
              <dd className="font-medium text-text">
                {pricing.days} day{pricing.days === 1 ? "" : "s"}
              </dd>
            </div>
          </dl>
        </ReviewBlock>

        <ReviewBlock title="Price" editHref="/booking/extras">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1.5 text-text">
                  Car hire — {pricing.days} day{pricing.days === 1 ? "" : "s"} × {formatMUR(pricing.dailyRateMur)}
                </td>
                <td className="py-1.5 text-right text-text">{formatMUR(pricing.carTotalMur)}</td>
              </tr>
              {selectedAddOns.map(({ addOn, quantity }) => (
                <tr key={addOn.id}>
                  <td className="py-1.5 text-text">
                    {addOnLineLabel(addOn.name, quantity)}
                    <span className="text-text-muted">
                      {" "}
                      — {formatMUR(addOn.priceMur)}
                      {addOn.priceType === "per_day" ? ` × ${pricing.days} days` : " one-off"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-text">
                    {formatMUR(
                      calculateAddOnTotal(
                        [{ priceMur: addOn.priceMur, priceType: addOn.priceType, quantity }],
                        pricing.days,
                      ),
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="pt-3 font-semibold text-text">Total</td>
                <td className="pt-3 text-right text-xl font-semibold text-text">{formatMUR(pricing.totalMur)}</td>
              </tr>
            </tbody>
          </table>
        </ReviewBlock>

        <ReviewBlock title="Your details" editHref="/booking/details">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-muted">Name</dt>
              <dd className="font-medium text-text">
                {c.firstName} {c.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-text-muted">Email</dt>
              <dd className="break-all font-medium text-text">{c.email}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Phone</dt>
              <dd className="font-medium text-text">{c.phone}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Country</dt>
              <dd className="font-medium text-text">{c.country}</dd>
            </div>
            {isAirport && c.flightNumber && (
              <div>
                <dt className="text-text-muted">Flight</dt>
                <dd className="font-medium text-text">{c.flightNumber}</dd>
              </div>
            )}
            {!hotel && c.hotelName && (
              <div>
                <dt className="text-text-muted">Hotel</dt>
                <dd className="font-medium text-text">{c.hotelName}</dd>
              </div>
            )}
            {c.specialRequests && (
              <div className="sm:col-span-2">
                <dt className="text-text-muted">Special requests</dt>
                <dd className="whitespace-pre-line text-text">{c.specialRequests}</dd>
              </div>
            )}
          </dl>
        </ReviewBlock>

        {error && (
          <div role="alert" className="rounded-[var(--radius-lg)] border border-error/40 bg-error/10 p-5">
            <p className="flex items-center gap-2 font-medium text-error">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {error.message}
            </p>
            {error.unavailable && (
              <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => router.push("/booking/car")}>
                Choose another car
              </Button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-surface-alt p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-text-muted">
            This sends a booking request. Our team confirms it by email — you pay nothing now.
          </p>
          <Button type="button" size="lg" onClick={handleConfirm} loading={submitting} className="shrink-0">
            {submitting ? "Confirming…" : "Confirm booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
