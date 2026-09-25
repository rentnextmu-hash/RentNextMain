"use client";

import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { formatDate } from "@/lib/format";

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/bookings": "Bookings",
  "/admin/locations": "Locations",
  "/admin/hotels": "Hotel partners",
  "/admin/settings": "Settings",
  "/admin/fleet": "Fleet",
  "/admin/calendar": "Calendar",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.keys(TITLES).find((key) => key !== "/admin" && pathname.startsWith(key));
  return match ? TITLES[match] : "RentNext";
}

export function Topbar({ staffName }: { staffName: string | null }) {
  const pathname = usePathname();

  return (
    <header className="flex h-16 shrink-0 print:hidden items-center justify-between border-b border-admin-border bg-admin-surface px-6">
      <h1 className="text-lg font-semibold text-text">{titleFor(pathname ?? "/admin")}</h1>

      <div className="flex items-center gap-6">
        <span className="text-sm text-text-muted">{formatDate(new Date())}</span>
        {staffName && <span className="text-sm font-medium text-text">{staffName}</span>}
        <SignOutButton />
      </div>
    </header>
  );
}
