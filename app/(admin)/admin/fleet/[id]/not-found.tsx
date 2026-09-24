import Link from "next/link";
import { Car } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function VehicleNotFound() {
  return (
    <EmptyState
      icon={<Car className="h-10 w-10" strokeWidth={1.25} />}
      title="Vehicle not found"
      description="It may have been removed, or the link is wrong."
      action={
        <Link href="/admin/fleet" className="text-sm font-medium text-primary hover:underline">
          Back to the fleet
        </Link>
      }
      className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
    />
  );
}
