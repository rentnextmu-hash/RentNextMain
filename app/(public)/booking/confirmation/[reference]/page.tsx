import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Car, CheckCircle2, CreditCard, IdCard, MessageCircle, Phone, Mail, BookUser } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPublicSettings } from "@/lib/queries/settings";
import { formatDateTimeLong, formatMUR } from "@/lib/format";
import type { PublicBookingView } from "@/lib/validation";
import { CLASS_LABEL } from "@/components/public/CarCard";
import { CopyReferenceButton, PrintButton } from "@/components/public/booking/ConfirmationActions";
import type { VehicleCategoryClass } from "@/types/enums";

export const metadata: Metadata = {
  title: "Booking request received | Rent Next Car Hire",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ key?: string }>;
};

export default async function BookingConfirmationPage({ params, searchParams }: Props) {
  const [{ reference }, { key }] = await Promise.all([params, searchParams]);
  if (!key) notFound();

  const supabase = await createClient();
  // Through the get-booking Edge Function, not a direct query: anon has no
  // read access to bookings, and the function checks the signed key.
  const [{ data: booking, error }, settings] = await Promise.all([
    supabase.functions.invoke<PublicBookingView>("get-booking", { body: { reference, key } }),
    getPublicSettings(supabase),
  ]);
  if (error || !booking) notFound();

  const whatsappNumber = settings.companyPhone.replace(/[^\d]/g, "");
  const whatsappText = encodeURIComponent(`Hello, I have a question about my booking ${booking.reference}.`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 print:py-0">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">
          Booking request received
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-text">
          Thank you, {booking.customer.firstName}. Our team will check your request and confirm it by email to{" "}
          <span className="font-medium">{booking.customer.email}</span> within two hours. Nothing is charged until
          then.
        </p>

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-4">
          <div className="text-left">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Booking reference</p>
            <p className="font-[family-name:var(--font-mono)] text-2xl font-semibold tracking-wide text-text">
              {booking.reference}
            </p>
          </div>
          <CopyReferenceButton reference={booking.reference} />
        </div>
      </div>

      <section className="mt-10 rounded-[var(--radius-lg)] border border-border bg-surface p-6 print:break-inside-avoid">
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-32 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-surface-alt">
            {booking.category.imagePath ? (
              <Image
                src={booking.category.imagePath}
                alt={booking.category.name}
                fill
                sizes="128px"
                className="object-contain p-2"
              />
            ) : (
              <Car className="h-10 w-10 text-primary/30" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="font-[family-name:var(--font-heading)] text-xl font-semibold text-text">
              {booking.category.name} <span className="text-sm font-normal text-text-muted">or similar</span>
            </p>
            <p className="text-sm text-text-muted">
              {CLASS_LABEL[booking.category.category as VehicleCategoryClass] ?? booking.category.category} ·{" "}
              {booking.category.transmission === "automatic" ? "Automatic" : "Manual"} · {booking.category.seats} seats
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-border pt-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-text-muted">Pickup</dt>
            <dd className="font-medium text-text">{booking.pickupLocation.name}</dd>
            {booking.hotelName && <dd className="text-text-muted">Delivered to {booking.hotelName}</dd>}
            <dd className="text-text-muted">{formatDateTimeLong(booking.pickupAt)}</dd>
          </div>
          <div>
            <dt className="text-text-muted">Return</dt>
            <dd className="font-medium text-text">{booking.returnLocation.name}</dd>
            <dd className="text-text-muted">{formatDateTimeLong(booking.returnAt)}</dd>
          </div>
        </dl>

        <table className="mt-6 w-full border-t border-border text-sm">
          <tbody>
            <tr>
              <td className="pt-4 pb-1.5 text-text">
                Car hire — {booking.days} day{booking.days === 1 ? "" : "s"}
              </td>
              <td className="pt-4 pb-1.5 text-right text-text">{formatMUR(booking.carTotalMur)}</td>
            </tr>
            {booking.addOns.map((a) => (
              <tr key={a.name}>
                <td className="py-1.5 text-text">
                  {a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name}
                </td>
                <td className="py-1.5 text-right text-text">{formatMUR(a.totalMur)}</td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="pt-3 font-semibold text-text">Total</td>
              <td className="pt-3 text-right text-xl font-semibold text-text">{formatMUR(booking.totalMur)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 print:break-inside-avoid">
        <section>
          <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">What happens next</h2>
          <ol className="mt-4 space-y-4">
            {[
              "We check your request and reserve a car for your dates.",
              "You receive a confirmation email, usually within two hours.",
              `We hand over the car at ${booking.hotelName ?? booking.pickupLocation.name} at your pickup time.`,
            ].map((text, i) => (
              <li key={text} className="flex gap-3 text-sm text-text">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                  {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">What to bring</h2>
          <ul className="mt-4 space-y-3 text-sm text-text">
            <li className="flex gap-3">
              <IdCard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Your driving licence
            </li>
            <li className="flex gap-3">
              <BookUser className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> Your passport
            </li>
            <li className="flex gap-3">
              <CreditCard className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" /> A credit card for the deposit
            </li>
          </ul>
        </section>
      </div>

      <section className="mt-8 rounded-[var(--radius-lg)] bg-surface-alt p-6 print:break-inside-avoid">
        <h2 className="font-semibold text-text">Questions about your booking?</h2>
        <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:gap-6">
          {settings.companyPhone && (
            <a href={`tel:${settings.companyPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-text hover:text-primary">
              <Phone className="h-4 w-4" aria-hidden="true" /> {settings.companyPhone}
            </a>
          )}
          {whatsappNumber && (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-text hover:text-primary print:hidden"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" /> WhatsApp us
            </a>
          )}
          {settings.bookingEmail && (
            <a href={`mailto:${settings.bookingEmail}`} className="inline-flex items-center gap-2 text-text hover:text-primary">
              <Mail className="h-4 w-4" aria-hidden="true" /> {settings.bookingEmail}
            </a>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row print:hidden">
        <PrintButton />
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Back to the homepage
        </Link>
      </div>
    </div>
  );
}
