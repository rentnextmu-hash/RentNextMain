"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Car,
  CalendarDays,
  MapPin,
  Building2,
  Users,
  Banknote,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, enabled: false },
  { href: "/admin/fleet", label: "Fleet", icon: Car, enabled: true },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays, enabled: true },
  { href: "/admin/locations", label: "Locations", icon: MapPin, enabled: false },
  { href: "/admin/hotels", label: "Hotels", icon: Building2, enabled: false },
  { href: "/admin/customers", label: "Customers", icon: Users, enabled: false },
  { href: "/admin/payments", label: "Payments", icon: Banknote, enabled: false },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, enabled: false },
  { href: "/admin/settings", label: "Settings", icon: Settings, enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col bg-admin-sidebar text-white md:flex">
      <div className="flex h-16 items-center px-6">
        <Image src="/logo-mark.png" alt="Rent Next Car Hire" width={140} height={77} className="h-8 w-auto" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
          const Icon = item.icon;

          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 text-sm text-white/40"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  Soon
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
