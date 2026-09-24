import type { ReactNode } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getBookingFlowData } from "@/lib/queries/bookingFlow";
import { BookingProvider } from "@/components/public/booking/BookingProvider";
import { BookingStepper } from "@/components/public/booking/BookingStepper";
import { BookingSummary } from "@/components/public/booking/BookingSummary";

export const metadata: Metadata = {
  title: "Book your car | Rent Next Car Hire",
  // The flow is per-visitor state, not content — keep it out of search results.
  robots: { index: false, follow: false },
};

export default async function BookingFlowLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const data = await getBookingFlowData(supabase);

  return (
    <BookingProvider data={data}>
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8 lg:pb-16">
        <BookingStepper />
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="min-w-0">{children}</div>
          <BookingSummary />
        </div>
      </div>
    </BookingProvider>
  );
}
