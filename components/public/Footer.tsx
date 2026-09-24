import Link from "next/link";
import Image from "next/image";

const VEHICLE_LINKS = [
  { href: "/cars?category=mini", label: "Mini" },
  { href: "/cars?category=economy", label: "Economy" },
  { href: "/cars?category=standard", label: "Standard" },
  { href: "/cars?category=intermediate", label: "Intermediate" },
  { href: "/cars?category=luxury", label: "Luxury" },
];

const LOCATION_LINKS = [
  { href: "/locations/grand-baie", label: "Grand Baie" },
  { href: "/locations/flic-en-flac", label: "Flic-en-Flac" },
  { href: "/locations/belle-mare", label: "Belle Mare" },
  { href: "/locations/trou-aux-biches", label: "Trou-aux-Biches" },
  { href: "/locations/le-morne", label: "Le Morne" },
  { href: "/locations/ssr-airport", label: "SSR Airport" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-alt print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image src="/logo-mark.png" alt="Rent Next Car Hire" width={140} height={77} className="h-9 w-auto" />
            <p className="mt-3 text-sm text-text-muted">
              Elevate your driving experience — reliable car rental across Mauritius, island-wide pickup, no hidden fees.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Vehicles</p>
            <ul className="mt-3 space-y-2">
              {VEHICLE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Locations</p>
            <ul className="mt-3 space-y-2">
              {LOCATION_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-text-muted hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-semibold text-text">Contact</p>
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              <li>+230 5500 1415</li>
              <li>booking@rentnext.net</li>
              <li>www.rentnext.net</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 text-sm text-text-muted sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Rent Next Car Hire. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/terms" className="hover:text-primary">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-primary">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
