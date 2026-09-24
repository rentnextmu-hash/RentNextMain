"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOOKING_STEPS, useBooking } from "@/components/public/booking/BookingProvider";

/**
 * All five steps, the current one active, completed ones ticked and
 * clickable, future ones inert. On mobile only the numbers show, plus the
 * current step's label beneath.
 */
export function BookingStepper() {
  const pathname = usePathname();
  const { isStepComplete, hydrated } = useBooking();
  const currentIndex = BOOKING_STEPS.findIndex((s) => pathname.startsWith(s.href));
  const current = BOOKING_STEPS[currentIndex];

  return (
    <nav aria-label="Booking progress">
      <ol className="flex items-center">
        {BOOKING_STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const done = hydrated && !isCurrent && isStepComplete(step.key);
          const content = (
            <>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isCurrent && "border-primary bg-primary text-white",
                  done && "border-accent bg-accent text-primary",
                  !isCurrent && !done && "border-border bg-surface text-text-muted",
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium md:inline",
                  isCurrent ? "text-text" : done ? "text-text" : "text-text-muted",
                )}
              >
                {step.label}
              </span>
            </>
          );

          return (
            <li key={step.key} className={cn("flex items-center", index < BOOKING_STEPS.length - 1 && "flex-1")}>
              {done ? (
                <Link
                  href={step.href}
                  className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label={`${step.label} (completed) — edit`}
                >
                  {content}
                </Link>
              ) : (
                <span className="flex items-center gap-2" aria-current={isCurrent ? "step" : undefined}>
                  {content}
                </span>
              )}
              {index < BOOKING_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn("mx-2 h-px flex-1 md:mx-3", done ? "bg-accent" : "bg-border")}
                />
              )}
            </li>
          );
        })}
      </ol>
      {current && (
        <p className="mt-2 text-sm font-medium text-text md:hidden">
          Step {currentIndex + 1} of {BOOKING_STEPS.length}: {current.label}
        </p>
      )}
    </nav>
  );
}
