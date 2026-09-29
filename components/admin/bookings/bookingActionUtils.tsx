"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/app/(admin)/admin/bookings/[reference]/actions";

/** The subset of a booking the action components need. */
export type ActionBooking = {
  id: string;
  reference: string;
  status: string;
  vehicleId: string | null;
  vehicleCode: string | null;
  vehicleMileageKm: number | null;
  categoryName: string;
  pickupLocationId: string;
};

/** Runs a server action with a pending state and remembers the outcome for a status line. */
export function useBookingAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  // Which button started the pending action, so only that one shows a spinner.
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const run = (action: () => Promise<ActionResult>, onSuccess?: () => void, key = "default") => {
    setBusyKey(key);
    startTransition(async () => {
      const r = await action();
      setResult(r);
      if (r.ok) onSuccess?.();
    });
  };
  const isBusy = (key: string) => pending && busyKey === key;
  return { pending, result, run, isBusy, clear: () => setResult(null) };
}

export function ActionFeedback({ result, className }: { result: ActionResult | null; className?: string }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn(
        "rounded-[var(--radius-md)] px-3 py-2 text-sm",
        result.ok ? "bg-success/10 text-success" : "bg-error/10 text-error",
        className,
      )}
    >
      {result.ok ? result.message : result.error}
    </p>
  );
}
