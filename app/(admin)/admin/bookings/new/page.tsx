import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { getActiveAddOns } from "@/lib/queries/addOns";
import { getHotels } from "@/lib/queries/hotels";
import { getPublicSettings } from "@/lib/queries/settings";
import { getVehicleById } from "@/lib/queries/vehicles";
import { addDaysToDateKey, toDateKey } from "@/lib/format";
import { StaffBookingForm, type StaffBookingPrefill } from "@/components/admin/bookings/StaffBookingForm";
import type { AddOnPriceType, LocationType } from "@/types/enums";

export const metadata = { title: "New booking" };

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; from?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [categories, locations, addOns, hotels, settings, vehicle] = await Promise.all([
    getActiveCategories(supabase),
    getActiveLocations(supabase),
    getActiveAddOns(supabase),
    getHotels(supabase),
    getPublicSettings(supabase),
    params.vehicle && UUID.test(params.vehicle) ? getVehicleById(supabase, params.vehicle) : Promise.resolve(null),
  ]);

  // Pre-fill from the calendar ("click an empty day on a car's row"), else
  // tomorrow for the website's default length.
  const pickupDate = params.from && DATE_KEY.test(params.from) ? params.from : addDaysToDateKey(toDateKey(), 1);
  const prefill: StaffBookingPrefill = {
    categoryId: vehicle?.category_id ?? "",
    vehicleId: vehicle?.id ?? null,
    locationId: vehicle?.location_id ?? locations.find((l) => l.is_pickup_point)?.id ?? "",
    pickupDate,
    returnDate: addDaysToDateKey(pickupDate, Math.max(settings.minimumRentalDays, 3)),
    pickupTime: settings.defaultPickupTime,
    returnTime: settings.defaultReturnTime,
  };

  return (
    <div className="space-y-4 pb-24">
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Bookings
      </Link>
      <div>
        <h2 className="text-xl font-semibold text-text">New booking</h2>
        <p className="text-sm text-text-muted">
          For bookings taken by phone, at the counter or through a hotel. Prices use the same rules as the website.
        </p>
      </div>
      <StaffBookingForm
        prefill={prefill}
        minimumRentalDays={settings.minimumRentalDays}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          rates: { rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur },
        }))}
        locations={locations.map((l) => ({ id: l.id, name: l.name, type: l.type as LocationType }))}
        addOns={addOns.map((a) => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          priceMur: a.price_mur,
          priceType: a.price_type as AddOnPriceType,
          maxQuantity: a.max_quantity,
        }))}
        hotels={hotels
          .filter((h) => h.is_active)
          .map((h) => ({ id: h.id, name: h.name, locationId: h.location_id }))}
      />
    </div>
  );
}
