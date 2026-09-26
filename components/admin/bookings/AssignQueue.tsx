"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, AlertTriangle, Car } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/ui/StatusPill";
import type { RankedVehicle } from "@/lib/assignment";
import { assignVehicle } from "@/app/(admin)/admin/bookings/[reference]/actions";
import {
  AssignVehicleList,
  ActionFeedback,
  useBookingAction,
  type ActionBooking,
} from "@/components/admin/bookings/BookingActions";

export type QueueRow = {
  booking: ActionBooking;
  customerName: string;
  categoryName: string;
  dateRange: string;
  days: number;
  pickupLocationName: string;
  vehicles: RankedVehicle[];
};

function QueueItem({ row, onDone }: { row: QueueRow; onDone: () => void }) {
  const { pending, result, run } = useBookingAction();
  const [choosing, setChoosing] = useState(false);
  const best = row.vehicles.find((v) => v.recommended) ?? row.vehicles[0];

  return (
    <li className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/bookings/${row.booking.reference}`}
              className="font-mono font-semibold text-text hover:text-primary hover:underline"
            >
              {row.booking.reference}
            </Link>
            <StatusPill status={row.booking.status} />
          </div>
          <p className="mt-1 text-sm text-text">
            {row.customerName} · {row.categoryName}
          </p>
          <p className="text-xs text-text-muted">
            {row.dateRange} · {row.days} day{row.days === 1 ? "" : "s"} · {row.pickupLocationName}
          </p>
        </div>
      </div>

      {best ? (
        <div className="mt-3 rounded-[var(--radius-md)] border border-admin-border bg-surface-alt p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success-deep">
                  <Sparkles className="h-3 w-3" aria-hidden="true" /> Recommended
                </span>
                <span className="font-mono font-semibold text-text">{best.code}</span>
                <span className="font-mono text-xs text-text-muted">{best.registration}</span>
              </div>
              <span className="mt-0.5 block text-xs text-text-muted">
                {best.locationName}
                {best.locationId === row.booking.pickupLocationId && " (pickup location)"} ·{" "}
                {best.mileageKm.toLocaleString("en-US")} km
              </span>
              {best.reasons.length > 0 && <p className="mt-1 text-xs text-text-muted">{best.reasons.join(" · ")}</p>}
              {best.warnings.map((w) => (
                <p key={w} className="mt-1 flex items-start gap-1 text-xs text-warning-deep">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{w}</span>
                </p>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setChoosing(true)} disabled={pending}>
                Other cars ({row.vehicles.length})
              </Button>
              <Button
                size="sm"
                loading={pending}
                disabled={pending}
                onClick={() => run(() => assignVehicle(row.booking.id, best.id), onDone)}
              >
                Assign {best.code}
              </Button>
            </div>
          </div>
          {result && !result.ok && <ActionFeedback result={result} className="mt-2" />}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-warning/10 px-3 py-2 text-sm text-warning-deep">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          No {row.categoryName} is free for these dates. Open the booking to change the dates or car.
        </p>
      )}

      <Modal
        open={choosing}
        onClose={() => setChoosing(false)}
        title={`Assign a vehicle to ${row.booking.reference}`}
        description={`Every ${row.categoryName} free for the whole rental, best fit first.`}
      >
        <AssignVehicleList
          booking={row.booking}
          vehicles={row.vehicles}
          onAssigned={() => {
            setChoosing(false);
            onDone();
          }}
        />
      </Modal>
    </li>
  );
}

export function AssignQueue({ rows }: { rows: QueueRow[] }) {
  const router = useRouter();
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const visible = useMemo(() => rows.filter((r) => !assigned.has(r.booking.id)), [rows, assigned]);

  const markDone = (id: string) => {
    setAssigned((prev) => new Set(prev).add(id));
    router.refresh();
  };

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={<Car className="h-10 w-10" strokeWidth={1.25} />}
        title="Every open booking has a vehicle"
        description="Newly confirmed bookings with no car free will appear here for assignment."
        className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {visible.map((row) => (
        <QueueItem key={row.booking.id} row={row} onDone={() => markDone(row.booking.id)} />
      ))}
    </ul>
  );
}
