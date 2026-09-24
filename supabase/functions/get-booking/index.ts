// get-booking — one booking, by reference plus its signed key, for the
// public confirmation page. No listing and no lookup by reference alone:
// references are sequential and guessable, so without the key (see
// _shared/bookingKey.ts) a stranger could read other customers' bookings.
// Unknown reference and wrong key return the same 404, so the response
// doesn't reveal which references exist.
import { getBookingRequestSchema, type PublicBookingView } from "@/lib/validation";
import { createAdminClient } from "../_shared/admin.ts";
import { verifyBookingKey } from "../_shared/bookingKey.ts";
import { apiError, json, serve } from "../_shared/http.ts";

serve(async (body) => {
  const parsed = getBookingRequestSchema.safeParse(body);
  if (!parsed.success || !(await verifyBookingKey(parsed.data.reference, parsed.data.key))) {
    return apiError(404, "not_found", "We couldn't find that booking.");
  }

  const { data: b, error } = await createAdminClient()
    .from("bookings")
    .select(
      `reference, status, created_at, pickup_at, return_at, days, car_total_mur, addons_total_mur, total_mur,
       customer:customers(first_name, last_name, email),
       category:vehicle_categories(name, slug, category, image_path, transmission, seats),
       pickup_location:locations!bookings_pickup_location_id_fkey(name, address),
       return_location:locations!bookings_return_location_id_fkey(name, address),
       hotel:hotels(name),
       booking_add_ons(quantity, unit_price_mur, total_mur, add_on:add_ons(name, price_type))`,
    )
    .eq("reference", parsed.data.reference)
    .maybeSingle();

  if (error) throw error;
  if (!b) return apiError(404, "not_found", "We couldn't find that booking.");

  const view: PublicBookingView = {
    reference: b.reference,
    status: b.status,
    createdAt: b.created_at,
    pickupAt: b.pickup_at,
    returnAt: b.return_at,
    days: b.days,
    carTotalMur: b.car_total_mur,
    addonsTotalMur: b.addons_total_mur,
    totalMur: b.total_mur,
    customer: { firstName: b.customer.first_name, lastName: b.customer.last_name, email: b.customer.email },
    category: {
      name: b.category.name,
      slug: b.category.slug,
      category: b.category.category,
      imagePath: b.category.image_path,
      transmission: b.category.transmission,
      seats: b.category.seats,
    },
    pickupLocation: { name: b.pickup_location.name, address: b.pickup_location.address },
    returnLocation: { name: b.return_location.name, address: b.return_location.address },
    hotelName: b.hotel?.name ?? null,
    addOns: b.booking_add_ons.map((a) => ({
      name: a.add_on.name,
      quantity: a.quantity,
      unitPriceMur: a.unit_price_mur,
      totalMur: a.total_mur,
      priceType: a.add_on.price_type,
    })),
  };

  return json(view);
});
