// request-cancellation — a customer asking to cancel, from their signed
// booking link. Verifies the reference + key exactly like get-booking, then
// flags the booking (cancellation_requested_at) rather than cancelling it:
// staff cancel and handle any refund per the real policy. Only open bookings
// that haven't started (requested / confirmed) can be cancelled online; once
// the car is out (active) or the rental is over, the customer must call.
//
// Idempotent: asking twice keeps the first request time. Notifies staff by
// email (fire-and-forget) the first time.
import { requestCancellationSchema } from "@/lib/validation";
import { createAdminClient } from "../_shared/admin.ts";
import { verifyBookingKey } from "../_shared/bookingKey.ts";
import { apiError, json, serve } from "../_shared/http.ts";

// Supabase Edge Runtime global (keeps the worker alive for a fire-and-forget).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

serve(async (body) => {
  const parsed = requestCancellationSchema.safeParse(body);
  if (!parsed.success || !(await verifyBookingKey(parsed.data.reference, parsed.data.key))) {
    return apiError(404, "not_found", "We couldn't find that booking.");
  }

  const supabase = createAdminClient();
  const { data: b, error } = await supabase
    .from("bookings")
    .select("id, status, cancellation_requested_at")
    .eq("reference", parsed.data.reference)
    .maybeSingle();
  if (error) throw error;
  if (!b) return apiError(404, "not_found", "We couldn't find that booking.");

  if (b.status === "cancelled") {
    return json({ status: b.status, cancellationRequestedAt: b.cancellation_requested_at });
  }
  if (b.status !== "requested" && b.status !== "confirmed") {
    return apiError(409, "unavailable", "This booking can no longer be cancelled online — please call or WhatsApp us.");
  }

  // Idempotent: keep the first request; only write + notify once.
  if (!b.cancellation_requested_at) {
    const { data: upd, error: updErr } = await supabase
      .from("bookings")
      .update({ cancellation_requested_at: new Date().toISOString(), cancellation_reason: parsed.data.reason ?? null })
      .eq("id", b.id)
      .select("cancellation_requested_at")
      .single();
    if (updErr) throw updErr;

    EdgeRuntime.waitUntil(
      fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference: parsed.data.reference, type: "cancellation_requested" }),
      })
        .then(async (res) => {
          if (!res.ok) console.error("send-booking-email failed", res.status, await res.text());
        })
        .catch((err) => console.error("send-booking-email unreachable", err)),
    );

    return json({ status: b.status, cancellationRequestedAt: upd.cancellation_requested_at });
  }

  return json({ status: b.status, cancellationRequestedAt: b.cancellation_requested_at });
});
