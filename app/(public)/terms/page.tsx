import Link from "next/link";
import type { Metadata } from "next";

// PLACEHOLDER — real legal text must come from the client. This page only
// states what the site already does; it deliberately invents no terms.

export const metadata: Metadata = {
  title: "Rental terms | Rent Next Car Hire",
  description: "Rent Next Car Hire's rental terms and conditions.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">Rental terms</h1>
      <p className="mt-6 leading-relaxed text-text">Our full rental terms and conditions are being finalised and will be published here. Until then, the key points of your rental are shown when you book and confirmed in writing by our team before your booking is final.</p>
      <p className="mt-4 leading-relaxed text-text">
        Questions in the meantime?{" "}
        <Link href="/contact" className="font-medium text-primary hover:underline">
          Contact us
        </Link>
        .
      </p>
    </div>
  );
}
