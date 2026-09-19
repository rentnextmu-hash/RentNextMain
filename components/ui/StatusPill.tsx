import { Badge } from "@/components/ui/Badge";

// Single source of truth for status colour across the app. Covers every
// domain status string used on vehicles, bookings, and payments.
type DomainStatus =
  | "available"
  | "booked"
  | "maintenance"
  | "inactive"
  | "requested"
  | "confirmed"
  | "active"
  | "completed"
  | "cancelled"
  | "paid"
  | "pending"
  | "refunded"
  | "failed";

const STATUS_CONFIG: Record<DomainStatus, { label: string; variant: "neutral" | "success" | "warning" | "error" | "info" }> = {
  available: { label: "Available", variant: "success" },
  booked: { label: "Booked", variant: "info" },
  maintenance: { label: "Maintenance", variant: "warning" },
  inactive: { label: "Inactive", variant: "neutral" },
  requested: { label: "Requested", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  active: { label: "Active", variant: "info" },
  completed: { label: "Completed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "error" },
  paid: { label: "Paid", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  refunded: { label: "Refunded", variant: "neutral" },
  failed: { label: "Failed", variant: "error" },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const config = STATUS_CONFIG[status as DomainStatus] ?? { label: status, variant: "neutral" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
