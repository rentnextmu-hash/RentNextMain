import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { getCurrentStaff } from "@/lib/auth";

// Admin tabs read "<Page> · Rent Next Admin"; pages set the "%s". The admin
// area is never indexed.
export const metadata: Metadata = {
  title: { template: "%s · Rent Next Admin", default: "Admin · Rent Next Car Hire" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const staff = await getCurrentStaff();

  return (
    <div className="flex min-h-screen bg-admin-bg font-[family-name:var(--font-body)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar staffName={staff?.full_name ?? null} />
        <main className="flex-1 overflow-y-auto p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
