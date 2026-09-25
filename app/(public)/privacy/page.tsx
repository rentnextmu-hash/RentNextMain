import Link from "next/link";
import type { Metadata } from "next";

// PLACEHOLDER — real legal text must come from the client. This page only
// states what the site already does; it deliberately invents no terms.

export const metadata: Metadata = {
  title: "Privacy | Rent Next Car Hire",
  description: "How Rent Next Car Hire handles your personal information.",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">Privacy</h1>
      <p className="mt-6 leading-relaxed text-text">Our full privacy notice is being finalised and will be published here. We only use the details you give us to manage your booking and contact you about it, and we don&apos;t sell your information.</p>
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
