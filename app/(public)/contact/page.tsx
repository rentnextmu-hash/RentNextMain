import Link from "next/link";
import type { Metadata } from "next";
import { Clock, Globe, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveLocations } from "@/lib/queries/locations";
import { getPublicSettings } from "@/lib/queries/settings";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";

// Deliberately no contact form: there's nowhere yet for a submission to go
// (no enquiries table, no email provider), and a form that silently drops
// messages is worse than none. Phone, WhatsApp and email all reach a person.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Contact Us | Rent Next Car Hire",
  description: "Call, WhatsApp or email Rent Next Car Hire, or visit one of our pickup points around Mauritius.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const supabase = createPublicClient();
  const [locations, settings] = await Promise.all([getActiveLocations(supabase), getPublicSettings(supabase)]);
  const phoneDigits = settings.companyPhone.replace(/[^\d]/g, "");
  const whatsapp = encodeURIComponent("Hello Rent Next, I have a question about renting a car.");

  const channels = [
    settings.companyPhone && {
      icon: Phone,
      title: "Call us",
      detail: settings.companyPhone,
      href: `tel:+${phoneDigits}`,
      note: "The quickest way to change or check a booking.",
    },
    phoneDigits && {
      icon: MessageCircle,
      title: "WhatsApp",
      detail: settings.companyPhone,
      href: `https://wa.me/${phoneDigits}?text=${whatsapp}`,
      note: "Message us any time — handy once you've landed.",
    },
    settings.bookingEmail && {
      icon: Mail,
      title: "Email",
      detail: settings.bookingEmail,
      href: `mailto:${settings.bookingEmail}`,
      note: "For quotes, longer rentals and anything with details.",
    },
  ].filter(Boolean) as { icon: typeof Phone; title: string; detail: string; href: string; note: string }[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Contact", href: "/contact" },
        ]}
      />
      <h1 className="mt-6 font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">Get in touch</h1>
      <p className="mt-2 max-w-2xl text-lg text-text-muted">
        Questions about a car, a booking or where to meet us? Our team is on the island and happy to help.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {channels.map(({ icon: Icon, title, detail, href, note }) => (
          <a
            key={title}
            href={href}
            {...(href.startsWith("https") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 transition-shadow hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-text">{title}</h2>
            <p className="mt-1 font-medium text-primary">{detail}</p>
            <p className="mt-2 text-sm text-text-muted">{note}</p>
          </a>
        ))}
      </div>

      <section className="mt-16">
        <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">Our pickup points</h2>
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((l) => (
            <li key={l.id} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
              <Link href={`/locations/${l.slug}`} className="font-semibold text-text hover:text-primary hover:underline">
                {l.name}
              </Link>
              {l.address && (
                <p className="mt-2 flex gap-2 text-sm text-text-muted">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {l.address}
                </p>
              )}
              {l.opening_hours && (
                <p className="mt-1 flex gap-2 text-sm text-text-muted">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {l.opening_hours}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {settings.companyWebsite && (
        <p className="mt-10 flex items-center gap-2 text-sm text-text-muted">
          <Globe className="h-4 w-4" aria-hidden="true" /> {settings.companyWebsite}
        </p>
      )}
    </div>
  );
}
