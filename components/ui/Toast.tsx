"use client";

import { useEffect } from "react";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastMessage = { id: number; message: string; variant: "success" | "error" };

/** A single toast, bottom-right, dismissing itself after a few seconds. */
export function Toast({ toast, onDismiss }: { toast: ToastMessage | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const Icon = toast.variant === "success" ? CheckCircle2 : XCircle;

  return (
    <div
      role={toast.variant === "success" ? "status" : "alert"}
      className={cn(
        "fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-[var(--radius-md)] border bg-admin-surface px-4 py-3 text-sm shadow-[var(--shadow-lg)] print:hidden",
        toast.variant === "success" ? "border-success/40" : "border-error/40",
      )}
    >
      <Icon
        className={cn("h-5 w-5 shrink-0", toast.variant === "success" ? "text-success" : "text-error")}
        aria-hidden="true"
      />
      <span className="font-medium text-text">{toast.message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 text-text-muted hover:text-text" aria-label="Dismiss">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
