"use client";

import { useState } from "react";
import { CheckCircle2, Car, KeyRound, Flag, XCircle, Printer, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { canTransition } from "@/lib/bookingStatus";
import type { RankedVehicle } from "@/lib/assignment";
import { assignVehicle, cancelBooking, confirmBooking } from "@/app/(admin)/admin/bookings/[reference]/actions";
import { InspectionDialog } from "@/components/admin/bookings/InspectionDialog";
import {
  ActionFeedback,
  useBookingAction,
  type ActionBooking,
} from "@/components/admin/bookings/bookingActionUtils";
import { cn } from "@/lib/utils";

// Re-exported so existing importers (AssignQueue, InspectionDialog) can keep
// pulling these from here; the definitions live in bookingActionUtils.
export { ActionFeedback, useBookingAction } from "@/components/admin/bookings/bookingActionUtils";
export type { ActionBooking } from "@/components/admin/bookings/bookingActionUtils";

export function AssignVehicleList({
  booking,
  vehicles,
  onAssigned,
}: {
  booking: ActionBooking;
  vehicles: RankedVehicle[];
  onAssigned?: () => void;
}) {
  const { pending, result, run } = useBookingAction();
  const [choosing, setChoosing] = useState<string | null>(null);
  const candidates = vehicles.filter((v) => v.id !== booking.vehicleId);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No other {booking.categoryName} is free for this booking&apos;s dates.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-96 divide-y divide-admin-border overflow-y-auto rounded-[var(--radius-md)] border border-admin-border">
        {candidates.map((v) => (
          <li
            key={v.id}
            className={cn("flex items-start justify-between gap-3 px-3 py-2.5", v.recommended && "bg-success/5")}
          >
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold text-text">{v.code}</span>
                <span className="font-mono text-xs text-text-muted">{v.registration}</span>
                {v.recommended && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success-deep">
                    <Sparkles className="h-3 w-3" aria-hidden="true" /> Recommended
                  </span>
                )}
              </div>
              <span className="mt-0.5 block text-xs text-text-muted">
                {v.locationName}
                {v.locationId === booking.pickupLocationId && " (pickup location)"} ·{" "}
                {v.mileageKm.toLocaleString("en-US")} km
              </span>
              {v.reasons.length > 0 && <p className="mt-1 text-xs text-text-muted">{v.reasons.join(" · ")}</p>}
              {v.warnings.map((w) => (
                <p key={w} className="mt-1 flex items-start gap-1 text-xs text-warning-deep">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
            <Button
              size="sm"
              variant={v.recommended ? "primary" : "secondary"}
              loading={pending && choosing === v.id}
              disabled={pending}
              onClick={() => {
                setChoosing(v.id);
                run(() => assignVehicle(booking.id, v.id), onAssigned);
              }}
            >
              Assign
            </Button>
          </li>
        ))}
      </ul>
      <ActionFeedback result={result} />
    </div>
  );
}

export function BookingActions({ booking, vehicles }: { booking: ActionBooking; vehicles: RankedVehicle[] }) {
  const { pending, result, run, isBusy } = useBookingAction();
  const [dialog, setDialog] = useState<null | "assign" | "checkout" | "checkin" | "cancel">(null);
  const close = () => setDialog(null);
  const canAssign = booking.status === "requested" || booking.status === "confirmed";

  return (
    <div className="print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        {canTransition(booking.status, "confirmed") && (
          <Button
            icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
            loading={isBusy("confirm")}
            disabled={pending}
            onClick={() => run(() => confirmBooking(booking.id), undefined, "confirm")}
          >
            Confirm
          </Button>
        )}
        {canAssign && (
          <Button variant="secondary" icon={<Car className="h-4 w-4" aria-hidden="true" />} onClick={() => setDialog("assign")}>
            {booking.vehicleId ? "Change vehicle" : "Assign vehicle"}
          </Button>
        )}
        {canTransition(booking.status, "active") && (
          <Button
            icon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
            disabled={!booking.vehicleId}
            title={booking.vehicleId ? undefined : "Assign a vehicle first"}
            onClick={() => setDialog("checkout")}
          >
            Check out
          </Button>
        )}
        {canTransition(booking.status, "completed") && (
          <Button icon={<Flag className="h-4 w-4" aria-hidden="true" />} onClick={() => setDialog("checkin")}>
            Check in &amp; complete
          </Button>
        )}
        {canTransition(booking.status, "cancelled") && (
          <Button variant="ghost" icon={<XCircle className="h-4 w-4" aria-hidden="true" />} onClick={() => setDialog("cancel")}>
            Cancel
          </Button>
        )}
        <Button variant="ghost" icon={<Printer className="h-4 w-4" aria-hidden="true" />} onClick={() => window.print()}>
          Print
        </Button>
      </div>
      <ActionFeedback result={result} className="mt-3" />

      <Modal
        open={dialog === "assign"}
        onClose={close}
        title={booking.vehicleId ? `Change vehicle for ${booking.reference}` : `Assign a vehicle to ${booking.reference}`}
        description={`Only ${booking.categoryName} vehicles that are free for the whole rental are listed.`}
      >
        <AssignVehicleList booking={booking} vehicles={vehicles} onAssigned={close} />
      </Modal>

      <InspectionDialog booking={booking} kind="checkout" open={dialog === "checkout"} onClose={close} onDone={close} />
      <InspectionDialog booking={booking} kind="checkin" open={dialog === "checkin"} onClose={close} onDone={close} />

      <Modal
        open={dialog === "cancel"}
        onClose={close}
        title={`Cancel ${booking.reference}?`}
        description="The customer isn't notified automatically — let them know yourself. This can't be undone."
      >
        {result && !result.ok && <ActionFeedback result={result} className="mb-4" />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Keep booking
          </Button>
          <Button variant="danger" loading={isBusy("cancel")} onClick={() => run(() => cancelBooking(booking.id), close, "cancel")}>
            Cancel booking
          </Button>
        </div>
      </Modal>
    </div>
  );
}
