// create-booking — the only way a website booking gets into the database.
// Bookings are never inserted from the browser with the anon key; the
// booking flow's summary step posts here instead, and this function:
//   1. validates the payload with the shared zod schema (lib/validation.ts)
//   2. re-checks availability server-side (lib/availability.ts)
//   3. recalculates every price from database rates (lib/pricing.ts) —
//      the browser never sends a price, so there's none to tamper with
//   4. upserts the customer, generates the reference and inserts the
//      booking + add-ons in one transaction (create_booking_request(),
//      migration 0006)
//   5. fires the confirmation emails without waiting on them
//   6. returns { reference, key } — the key unlocks the confirmation page
import { getAvailableVehicleCount } from "@/lib/availability";
import {
  calculateAddOnTotal,
  calculateBookingTotal,
  calculateRentalDays,
  lockedAddOnSlugs,
  type AddOnLine,
} from "@/lib/pricing";
import { createBookingSchema } from "@/lib/validation";
import type { AddOnPriceType } from "@/types/enums";
import { createAdminClient } from "../_shared/admin.ts";
import { signBookingReference } from "../_shared/bookingKey.ts";
import { apiError, json, serve } from "../_shared/http.ts";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

serve(async (body) => {
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      (fields[key] ??= []).push(issue.message);
    }
    return apiError(400, "invalid_request", "Some booking details need another look.", fields);
  }

  const req = parsed.data;
  const supabase = createAdminClient();

  const [categoryRes, locationsRes, addOnsRes, hotelRes, minDaysRes] = await Promise.all([
    supabase
      .from("vehicle_categories")
      .select("id, name, rate_1_2_mur, rate_3_5_mur, rate_6_plus_mur")
      .eq("id", req.categoryId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("locations")
      .select("id, type, is_pickup_point")
      .in("id", [req.pickupLocationId, req.returnLocationId])
      .eq("is_active", true),
    supabase.from("add_ons").select("id, slug, price_mur, price_type, max_quantity").eq("is_active", true),
    req.hotelId
      ? supabase.from("public_partner_hotels").select("id").eq("id", req.hotelId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("settings").select("value").eq("key", "minimum_rental_days").maybeSingle(),
  ]);

  for (const res of [categoryRes, locationsRes, addOnsRes, hotelRes, minDaysRes]) {
    if (res.error) throw res.error;
  }

  const category = categoryRes.data;
  if (!category) return apiError(400, "invalid_request", "That car is no longer offered.");

  const pickupLocation = locationsRes.data?.find((l) => l.id === req.pickupLocationId);
  const returnLocation = locationsRes.data?.find((l) => l.id === req.returnLocationId);
  if (!pickupLocation?.is_pickup_point || !returnLocation) {
    return apiError(400, "invalid_request", "Choose a valid pickup and return location.");
  }

  if (req.hotelId && !hotelRes.data) {
    return apiError(400, "invalid_request", "That hotel isn't one of our delivery partners.");
  }

  if (new Date(req.pickupAt) <= new Date()) {
    return apiError(400, "invalid_request", "That pickup time has already passed. Choose a later time.");
  }

  const minDays = typeof minDaysRes.data?.value === "number" ? minDaysRes.data.value : 1;
  const days = calculateRentalDays(req.pickupAt, req.returnAt);
  if (days < minDays) {
    return apiError(400, "invalid_request", `The minimum rental is ${minDays} days.`);
  }

  // Build add-on lines from database prices. Locked add-ons (airport /
  // hotel delivery) are forced in here, whatever the browser sent.
  const addOnsById = new Map((addOnsRes.data ?? []).map((a) => [a.id, a]));
  const requested = new Map(req.addOns.map((a) => [a.addOnId, a.quantity]));
  for (const slug of lockedAddOnSlugs({ pickupLocationType: pickupLocation.type, hotelDelivery: !!req.hotelId })) {
    const locked = addOnsRes.data?.find((a) => a.slug === slug);
    if (locked && !requested.has(locked.id)) requested.set(locked.id, 1);
  }

  const addOnRows: { add_on_id: string; quantity: number; unit_price_mur: number; total_mur: number }[] = [];
  const addOnLines: AddOnLine[] = [];
  for (const [addOnId, quantity] of requested) {
    const addOn = addOnsById.get(addOnId);
    if (!addOn) return apiError(400, "invalid_request", "One of the selected extras is no longer available.");
    if (quantity > addOn.max_quantity) {
      return apiError(400, "invalid_request", `You can add at most ${addOn.max_quantity} of one extra.`);
    }
    const line: AddOnLine = { priceMur: addOn.price_mur, priceType: addOn.price_type as AddOnPriceType, quantity };
    addOnLines.push(line);
    addOnRows.push({
      add_on_id: addOnId,
      quantity,
      unit_price_mur: addOn.price_mur,
      total_mur: calculateAddOnTotal([line], days),
    });
  }

  const available = await getAvailableVehicleCount(
    supabase,
    req.categoryId,
    req.pickupLocationId,
    req.pickupAt,
    req.returnAt,
  );
  if (available === 0) {
    return apiError(
      409,
      "unavailable",
      `Sorry — the ${category.name} is no longer available at that location for those dates. Please choose another car or different dates.`,
    );
  }

  const totals = calculateBookingTotal({
    rates: {
      rate1To2Mur: category.rate_1_2_mur,
      rate3To5Mur: category.rate_3_5_mur,
      rate6PlusMur: category.rate_6_plus_mur,
    },
    pickupAt: req.pickupAt,
    returnAt: req.returnAt,
    addOns: addOnLines,
  });

  const c = req.customer;
  const notes = [
    c.hotelName && !req.hotelId ? `Staying at: ${c.hotelName}` : null,
    c.specialRequests || null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const { data: created, error: createError } = await supabase
    .rpc("create_booking_request", {
      p_customer: {
        first_name: c.firstName,
        last_name: c.lastName,
        email: c.email,
        phone: c.phone,
        country: c.country,
        hotel_id: req.hotelId,
        flight_number: c.flightNumber || null,
        marketing_consent: c.marketingConsent,
      },
      p_category_id: req.categoryId,
      p_pickup_location_id: req.pickupLocationId,
      p_return_location_id: req.returnLocationId,
      p_pickup_at: req.pickupAt,
      p_return_at: req.returnAt,
      p_days: totals.days,
      p_car_total_mur: totals.carTotalMur,
      p_addons_total_mur: totals.addonsTotalMur,
      p_total_mur: totals.totalMur,
      // The generated types mark nullable function args as non-null; the
      // SQL function accepts null for both.
      p_hotel_id: req.hotelId as string,
      p_notes: notes,
      p_add_ons: addOnRows,
    })
    .single();

  if (createError) throw createError;

  const reference = created.reference;
  const key = await signBookingReference(reference);

  // Never let an email failure fail the booking: fire and forget, keeping
  // the worker alive until the call settles.
  EdgeRuntime.waitUntil(
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reference }),
    })
      .then(async (res) => {
        if (!res.ok) console.error("send-booking-email failed", res.status, await res.text());
      })
      .catch((err) => console.error("send-booking-email unreachable", err)),
  );

  return json({ reference, key, totalMur: totals.totalMur });
});
