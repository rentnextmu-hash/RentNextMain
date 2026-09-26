"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Car, KeyRound, Flag, XCircle, Printer, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { canTransition } from "@/lib/bookingStatus";
import type { RankedVehicle } from "@/lib/assignment";
import {
  assignVehicle,
  cancelBooking,
  completeBooking,
  confirmBooking,
  markPickedUp,
  type ActionResult,
} from "@/app/(admin)/admin/bookings/[reference]/actions";
import { cn } from "@/lib/utils";

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
  const [dialog, setDialog] = useState<null | "assign" | "complete" | "cancel">(null);
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
            loading={isBusy("pickup")}
            disabled={pending || !booking.vehicleId}
            title={booking.vehicleId ? undefined : "Assign a vehicle first"}
            onClick={() => run(() => markPickedUp(booking.id), undefined, "pickup")}
          >
            Mark picked up
          </Button>
        )}
        {canTransition(booking.status, "completed") && (
          <Button icon={<Flag className="h-4 w-4" aria-hidden="true" />} onClick={() => setDialog("complete")}>
            Complete rental
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

      <Modal
        open={dialog === "complete"}
        onClose={close}
        title="Complete rental"
        description={
          <>
            Record the odometer reading for <span className="font-mono">{booking.vehicleCode}</span>. The car goes back to
            available.
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            run(() => completeBooking(booking.id, formData), close, "complete");
          }}
          className="space-y-4"
        >
          <Input
            name="returnMileageKm"
            label="Mileage on return (km)"
            type="number"
            inputMode="numeric"
            min={booking.vehicleMileageKm ?? 0}
            defaultValue={booking.vehicleMileageKm ?? undefined}
            hint={booking.vehicleMileageKm !== null ? `Last recorded: ${booking.vehicleMileageKm.toLocaleString("en-US")} km` : undefined}
            required
            autoFocus
          />
          {result && !result.ok && <ActionFeedback result={result} />}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Back
            </Button>
            <Button type="submit" loading={isBusy("complete")}>
              Complete rental
            </Button>
          </div>
        </form>
      </Modal>

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
