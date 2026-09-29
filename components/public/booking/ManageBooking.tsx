"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTimeLong } from "@/lib/format";

type Props = {
  reference: string;
  bookingKey: string;
  status: string;
  cancellationRequestedAt: string | null;
};

export function ManageBooking({ reference, bookingKey, status, cancellationRequestedAt }: Props) {
  const [requestedAt, setRequestedAt] = useState<string | null>(cancellationRequestedAt);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCancelOnline = status === "requested" || status === "confirmed";

  if (status === "cancelled") {
    return (
      <p className="text-sm text-text-muted">
        This booking has been cancelled. If that&apos;s a surprise, please contact us using the details above.
      </p>
    );
  }

  if (requestedAt) {
    return (
      <p className="flex items-start gap-2 text-sm text-text">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
        <span>
          You requested to cancel this booking on {formatDateTimeLong(requestedAt)}. Our team will be in touch to
          confirm and handle any refund under our cancellation policy.
        </span>
      </p>
    );
  }

  if (!canCancelOnline) {
    return (
      <p className="text-sm text-text-muted">
        Your rental is already under way or complete. To make a change, please contact us using the details above.
      </p>
    );
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await createClient().functions.invoke<{ cancellationRequestedAt: string | null }>(
        "request-cancellation",
        { body: { reference, key: bookingKey, reason: reason.trim() || undefined } },
      );
      if (fnError || !data) throw new Error("We couldn't submit that. Please try again or contact us.");
      setRequestedAt(data.cancellationRequestedAt ?? new Date().toISOString());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please contact us.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="text-sm">
        <p className="text-text-muted">Need to cancel? Let us know and we&apos;ll take care of it.</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-2 font-medium text-error hover:underline"
        >
          Request cancellation
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm">
      <p className="text-text">Tell us briefly why you&apos;re cancelling (optional):</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Change of plans, flight cancelled…"
        className="mt-2 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
      />
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-error">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-[var(--radius-md)] bg-error px-4 py-2 font-medium text-white hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Submitting…" : "Request cancellation"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-[var(--radius-md)] px-4 py-2 font-medium text-text-muted hover:text-text"
        >
          Keep my booking
        </button>
      </div>
    </div>
  );
}
