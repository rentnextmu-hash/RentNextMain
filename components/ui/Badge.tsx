import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "success" | "warning" | "error" | "info";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-surface-alt text-text",
  success: "bg-success/10 text-success-deep",
  warning: "bg-warning/10 text-warning-deep",
  error: "bg-error/10 text-error-deep",
  info: "bg-info/10 text-info-deep",
};

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
