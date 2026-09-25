import Link from "next/link";
import { UserX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function CustomerNotFound() {
  return (
    <EmptyState
      icon={<UserX className="h-10 w-10" strokeWidth={1.25} />}
      title="Customer not found"
      description="They may have been removed, or the link is wrong."
      action={
        <Link href="/admin/customers" className="text-sm font-medium text-primary hover:underline">
          Back to customers
        </Link>
      }
      className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
    />
  );
}
