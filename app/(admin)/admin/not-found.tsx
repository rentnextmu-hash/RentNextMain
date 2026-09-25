import Link from "next/link";
import { Compass } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminNotFound() {
  return (
    <EmptyState
      icon={<Compass className="h-10 w-10" strokeWidth={1.25} />}
      title="Page not found"
      description="That admin page doesn't exist. Use the sidebar to get back on track."
      action={
        <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
          Go to the dashboard
        </Link>
      }
      className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
    />
  );
}
