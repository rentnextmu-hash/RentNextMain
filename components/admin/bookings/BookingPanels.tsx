"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { formatDateTime } from "@/lib/format";
import { recordPayment, saveInternalNotes } from "@/app/(admin)/admin/bookings/[reference]/actions";
import { ActionFeedback, useBookingAction } from "@/components/admin/bookings/BookingActions";

export function RecordPaymentForm({ bookingId, outstandingMur }: { bookingId: string; outstandingMur: number }) {
  const { pending, result, run } = useBookingAction();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <div className="space-y-2 print:hidden">
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Record payment
        </Button>
        <ActionFeedback result={result} />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) =>
        run(
          () => recordPayment(bookingId, formData),
          () => setOpen(false),
        )
      }
      className="grid grid-cols-1 gap-3 rounded-[var(--radius-md)] border border-admin-border p-4 sm:grid-cols-3 print:hidden"
    >
      <Input
        name="amountMur"
        label="Amount (Rs)"
        type="number"
        inputMode="numeric"
        min={1}
        defaultValue={outstandingMur > 0 ? outstandingMur : undefined}
        required
      />
      <Select name="method" label="Method" defaultValue="cash">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="transfer">Bank transfer</option>
        <option value="online">Online</option>
      </Select>
      <Input name="reference" label="Reference" placeholder="Receipt / transaction no." />
      <div className="flex items-center gap-2 sm:col-span-3">
        <Button type="submit" size="sm" loading={pending}>
          Save payment
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <ActionFeedback result={result && !result.ok ? result : null} className="sm:col-span-3" />
    </form>
  );
}

export function InternalNotes({
  bookingId,
  initialNotes,
  updatedAt,
  updatedBy,
}: {
  bookingId: string;
  initialNotes: string;
  updatedAt: string | null;
  updatedBy: string | null;
}) {
  const { pending, result, run } = useBookingAction();
  const saved = useRef(initialNotes);
  const [notes, setNotes] = useState(initialNotes);

  // Saved on blur, and only if something actually changed.
  function save() {
    if (notes === saved.current) return;
    run(
      () => saveInternalNotes(bookingId, notes),
      () => {
        saved.current = notes;
      },
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        aria-label="Internal notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        rows={4}
        placeholder="Visible to staff only — handover details, customer calls, damage notes…"
      />
      <p className="text-xs text-text-muted" aria-live="polite">
        {pending
          ? "Saving…"
          : result && !result.ok
            ? null
            : updatedAt
              ? `Last edited ${formatDateTime(updatedAt)}${updatedBy ? ` by ${updatedBy}` : ""}`
              : "Saved automatically when you click away."}
      </p>
      <ActionFeedback result={result && !result.ok ? result : null} />
    </div>
  );
}
