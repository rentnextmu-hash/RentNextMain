"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { customerDetailsSchema } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useBooking, useStepGuard, type CustomerDraft } from "@/components/public/booking/BookingProvider";
import { StepHeader, StepLoading } from "@/components/public/booking/StepHeader";
import { OTHER_COUNTRIES, TOP_COUNTRIES } from "@/components/public/booking/countries";

type FieldErrors = Partial<Record<keyof CustomerDraft, string>>;

function validate(customer: CustomerDraft, isAirport: boolean): FieldErrors {
  const result = customerDetailsSchema.safeParse({
    ...customer,
    // Only asked for at the airport; don't let a stale value block the form elsewhere.
    flightNumber: isAirport ? customer.flightNumber : "",
  });
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof CustomerDraft;
    errors[key] ??= issue.message;
  }
  return errors;
}

export function DetailsStep() {
  const ready = useStepGuard("details");
  const router = useRouter();
  const { state, update, confirmStep, pickupLocation, hotel } = useBooking();
  // Errors appear once the customer has tried to continue, then update live
  // as they fix things — not while they're typing for the first time.
  const [submitted, setSubmitted] = useState(false);

  if (!ready) return <StepLoading />;

  const c = state.customer;
  const isAirport = pickupLocation?.type === "airport";
  const errors = submitted ? validate(c, isAirport) : {};
  const set = <K extends keyof CustomerDraft>(key: K, value: CustomerDraft[K]) =>
    update((s) => ({ customer: { ...s.customer, [key]: value } }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(c, isAirport)).length > 0) {
      // Move focus to the first problem, once the errors have rendered, so
      // keyboard and screen-reader users land on it.
      const form = e.currentTarget;
      requestAnimationFrame(() => form.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return;
    }
    confirmStep("details");
    router.push("/booking/summary");
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <StepHeader title="Your details" description="We'll use these to confirm your booking. No account needed." />

      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:grid-cols-2">
          <Input
            label="First name *"
            autoComplete="given-name"
            value={c.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            error={errors.firstName}
            required
          />
          <Input
            label="Last name *"
            autoComplete="family-name"
            value={c.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            error={errors.lastName}
            required
          />
          <Input
            label="Email *"
            type="email"
            autoComplete="email"
            value={c.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
            required
          />
          <Input
            label="Phone *"
            type="tel"
            autoComplete="tel"
            value={c.phone}
            onChange={(e) => set("phone", e.target.value)}
            error={errors.phone}
            hint="With your country code, e.g. +33 6 12 34 56 78"
            required
          />
          <Select
            label="Country"
            autoComplete="country-name"
            value={c.country}
            onChange={(e) => set("country", e.target.value)}
            error={errors.country}
          >
            <optgroup label="Most common">
              {TOP_COUNTRIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
            <optgroup label="All countries">
              {OTHER_COUNTRIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </optgroup>
          </Select>
          {isAirport && (
            <Input
              label="Flight number"
              value={c.flightNumber}
              onChange={(e) => set("flightNumber", e.target.value.toUpperCase())}
              error={errors.flightNumber}
              hint="So we can track delays and be there when you land."
              placeholder="MK 015"
            />
          )}
          {!hotel && (
            <Input
              label="Hotel name"
              value={c.hotelName}
              onChange={(e) => set("hotelName", e.target.value)}
              error={errors.hotelName}
              hint="Where you're staying, if you know."
            />
          )}
          <div className="sm:col-span-2">
            <Textarea
              label="Special requests"
              value={c.specialRequests}
              onChange={(e) => set("specialRequests", e.target.value)}
              error={errors.specialRequests}
              rows={3}
              placeholder="Late arrival, car seat fitting, anything we should know."
            />
          </div>
        </section>

        <section className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
          <Checkbox
            label="I accept the rental terms and conditions, and confirm the main driver holds a valid driving licence. *"
            checked={c.acceptTerms}
            onChange={(e) => set("acceptTerms", e.target.checked)}
            error={errors.acceptTerms}
          />
          <Checkbox
            label="Send me occasional offers and island driving tips by email."
            checked={c.marketingConsent}
            onChange={(e) => set("marketingConsent", e.target.checked)}
          />
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => router.push("/booking/extras")}>
            Back to extras
          </Button>
          <Button type="submit" size="lg">
            Review booking
          </Button>
        </div>
      </div>
    </form>
  );
}
