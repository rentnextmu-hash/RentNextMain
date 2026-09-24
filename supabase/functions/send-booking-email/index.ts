// send-booking-email — the customer's "request received" email and the
// internal new-booking notification, sent through Resend's REST API.
//
// Internal only: called by create-booking with the service role key, never
// by the browser (that would let anyone trigger email to any booking).
// create-booking doesn't wait for it, so a failure here is logged and
// never fails a booking.
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY              required to actually send; without it the
//                               function logs and returns { skipped: true }
//   EMAIL_FROM                  e.g. "Rent Next Car Hire <bookings@rentnext.net>"
//                               — the domain must be verified in Resend
//   SITE_URL                    public site origin, for the links in both emails
//   BOOKING_NOTIFICATION_EMAIL  optional override for settings.booking_email
import { formatDateTime, formatMUR } from "@/lib/format";
import { createAdminClient } from "../_shared/admin.ts";
import { signBookingReference } from "../_shared/bookingKey.ts";
import { apiError, json, serve } from "../_shared/http.ts";

type Row = { label: string; value: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NAVY = "#0c1728";
const TEAL = "#2dc1b5";
const MUTED = "#6b7280";
const BORDER = "#e4dfd7";

/** Outlook-safe layout: nested tables, inline styles, no flexbox, no web fonts. */
function emailLayout(opts: { companyName: string; heading: string; intro: string; body: string; footer: string }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ec;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border:1px solid ${BORDER};">
    <tr><td style="background:${NAVY};padding:20px 28px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">
      ${escapeHtml(opts.companyName)}
    </td></tr>
    <tr><td style="height:4px;background:${TEAL};font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;color:#1a1f26;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:${NAVY};">${escapeHtml(opts.heading)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">${opts.intro}</p>
      ${opts.body}
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${MUTED};">
      ${opts.footer}
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function detailsTable(rows: Row[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 20px;">
${rows
  .map(
    (r) => `<tr>
  <td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${MUTED};width:40%;vertical-align:top;">${escapeHtml(r.label)}</td>
  <td style="padding:8px 0;border-bottom:1px solid ${BORDER};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1f26;vertical-align:top;">${escapeHtml(r.value)}</td>
</tr>`,
  )
  .join("\n")}
</table>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr>
<td style="background:${NAVY};padding:12px 22px;"><a href="${escapeHtml(href)}" style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a></td>
</tr></table>`;
}

async function sendEmail(apiKey: string, message: { from: string; to: string; subject: string; html: string; replyTo?: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

serve(async (body, req) => {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey || req.headers.get("Authorization") !== `Bearer ${serviceKey}`) {
    return apiError(401, "invalid_request", "Internal function.");
  }

  const reference = (body as { reference?: unknown })?.reference;
  if (typeof reference !== "string") return apiError(400, "invalid_request", "Missing reference.");

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping emails for ${reference}`);
    return json({ skipped: true });
  }

  const supabase = createAdminClient();
  const [{ data: b, error }, { data: settingsRows, error: settingsError }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `reference, pickup_at, return_at, days, car_total_mur, total_mur, notes,
         customer:customers(first_name, last_name, email, phone, country, flight_number),
         category:vehicle_categories(name),
         pickup_location:locations!bookings_pickup_location_id_fkey(name),
         return_location:locations!bookings_return_location_id_fkey(name),
         hotel:hotels(name),
         booking_add_ons(quantity, total_mur, add_on:add_ons(name))`,
      )
      .eq("reference", reference)
      .maybeSingle(),
    supabase.from("settings").select("key, value"),
  ]);
  if (error) throw error;
  if (settingsError) throw settingsError;
  if (!b) return apiError(404, "not_found", "Unknown booking.");

  const setting = (key: string) => {
    const v = settingsRows?.find((s) => s.key === key)?.value;
    return typeof v === "string" ? v : "";
  };
  const companyName = setting("company_name") || "Rent Next Car Hire";
  const companyPhone = setting("company_phone");
  const internalTo = Deno.env.get("BOOKING_NOTIFICATION_EMAIL") || setting("booking_email");
  const from = Deno.env.get("EMAIL_FROM") || `${companyName} <onboarding@resend.dev>`;
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/$/, "");

  const tripRows: Row[] = [
    { label: "Reference", value: b.reference },
    { label: "Car", value: `${b.category.name} (or similar)` },
    { label: "Pickup", value: `${formatDateTime(b.pickup_at)} — ${b.pickup_location.name}` },
    { label: "Return", value: `${formatDateTime(b.return_at)} — ${b.return_location.name}` },
    { label: "Duration", value: `${b.days} day${b.days === 1 ? "" : "s"}` },
    ...(b.hotel ? [{ label: "Hotel delivery", value: b.hotel.name }] : []),
    { label: "Car hire", value: formatMUR(b.car_total_mur) },
    ...b.booking_add_ons.map((a) => ({
      label: a.quantity > 1 ? `${a.add_on.name} × ${a.quantity}` : a.add_on.name,
      value: formatMUR(a.total_mur),
    })),
    { label: "Total", value: formatMUR(b.total_mur) },
  ];

  const results: Record<string, string> = {};

  // Customer confirmation.
  try {
    const confirmationUrl = siteUrl
      ? `${siteUrl}/booking/confirmation/${b.reference}?key=${await signBookingReference(b.reference)}`
      : null;
    await sendEmail(apiKey, {
      from,
      to: b.customer.email,
      replyTo: internalTo || undefined,
      subject: `Booking request received — ${b.reference}`,
      html: emailLayout({
        companyName,
        heading: `Thank you, ${b.customer.first_name}.`,
        intro:
          "We've received your booking request. Our team will check it and confirm by email within two hours. Nothing is charged until your booking is confirmed.",
        body: detailsTable(tripRows) + (confirmationUrl ? button(confirmationUrl, "View your booking") : ""),
        footer: `Bring your driving licence, passport and a credit card for the deposit.<br>
Questions? Reply to this email${companyPhone ? ` or call / WhatsApp ${escapeHtml(companyPhone)}` : ""}.`,
      }),
    });
    results.customer = "sent";
  } catch (err) {
    console.error("customer email failed", err);
    results.customer = "failed";
  }

  // Internal notification.
  if (internalTo) {
    try {
      const c = b.customer;
      await sendEmail(apiKey, {
        from,
        to: internalTo,
        replyTo: c.email,
        subject: `New booking request ${b.reference} — ${b.category.name}, ${formatDateTime(b.pickup_at)}`,
        html: emailLayout({
          companyName,
          heading: `New booking request ${b.reference}`,
          intro: "A new website booking is waiting to be confirmed and assigned a vehicle.",
          body:
            detailsTable([
              { label: "Customer", value: `${c.first_name} ${c.last_name}` },
              { label: "Email", value: c.email },
              { label: "Phone", value: c.phone },
              ...(c.country ? [{ label: "Country", value: c.country }] : []),
              ...(c.flight_number ? [{ label: "Flight", value: c.flight_number }] : []),
              ...(b.notes ? [{ label: "Notes", value: b.notes }] : []),
            ]) +
            detailsTable(tripRows) +
            (siteUrl ? button(`${siteUrl}/admin/bookings/${b.reference}`, "Open in dashboard") : ""),
          footer: "Sent automatically by the booking system.",
        }),
      });
      results.internal = "sent";
    } catch (err) {
      console.error("internal email failed", err);
      results.internal = "failed";
    }
  }

  return json(results);
});
