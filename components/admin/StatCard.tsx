import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCENT: Record<"neutral" | "success" | "info" | "warning", string> = {
  neutral: "bg-surface-alt text-text",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning-deep",
};

export function StatCard({
  label,
  value,
  supporting,
  icon: Icon,
  accent = "neutral",
}: {
  label: string;
  value: string | number;
  supporting?: string;
  icon: LucideIcon;
  accent?: "neutral" | "success" | "info" | "warning";
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", ACCENT[accent])}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold text-text">{value}</p>
      {supporting && <p className="mt-1 text-sm text-text-muted">{supporting}</p>}
    </div>
  );
}
