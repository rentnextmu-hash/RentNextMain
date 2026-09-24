import type { ReactNode } from "react";
import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/Topbar";
import { getCurrentStaff } from "@/lib/auth";

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
