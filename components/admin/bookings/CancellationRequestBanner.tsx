"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";
import { dismissCancellationRequest } from "@/app/(admin)/admin/bookings/[reference]/actions";
import { ActionFeedback, useBookingAction } from "@/components/admin/bookings/bookingActionUtils";

export function CancellationRequestBanner({
  bookingId,
  requestedAt,
  reason,
}: {
  bookingId: string;
  requestedAt: string;
  reason: string | null;
}) {
  const { pending, result, run } = useBookingAction();

  return (
    <div className="rounded-[var(--radius-md)] border border-warning/40 bg-warning/10 p-4 print:hidden">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning-deep" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-warning-deep">
            Customer requested cancellation · {formatDateTime(requestedAt)}
          </p>
          {reason && <p className="mt-1 text-sm text-text">“{reason}”</p>}
          <p className="mt-1 text-sm text-text-muted">
            Cancel the booking below to action it (applying the cancellation policy), or dismiss to keep it.
          </p>
          <div className="mt-3">
            <Button size="sm" variant="secondary" loading={pending} disabled={pending} onClick={() => run(() => dismissCancellationRequest(bookingId))}>
              Dismiss request
            </Button>
          </div>
          <ActionFeedback result={result} className="mt-2" />
        </div>
      </div>
    </div>
  );
}
