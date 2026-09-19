import Link from "next/link";

const NAV_LINKS = [
  { href: "/cars", label: "Cars" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-[family-name:var(--font-heading)] text-xl font-semibold text-primary">
          RentNext
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-text transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cars"
          className="inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-accent px-4 text-sm font-medium text-text transition-colors hover:bg-accent-hover"
        >
          Book Now
        </Link>
      </div>
    </header>
  );
}
