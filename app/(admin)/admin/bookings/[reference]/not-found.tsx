import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function AdminBookingNotFound() {
  return (
    <EmptyState
      icon={<SearchX className="h-10 w-10" strokeWidth={1.25} />}
      title="No booking with that reference"
      description="Check the reference, or search for the customer on the bookings list."
      action={
        <Link href="/admin/bookings?range=all" className="text-sm font-medium text-primary hover:underline">
          Go to all bookings
        </Link>
      }
      className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
    />
  );
}
