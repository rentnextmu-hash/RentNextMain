import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { CategoryRates } from "@/lib/pricing";
import type { AddOnPriceType, LocationType, VehicleCategoryClass } from "@/types/enums";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { getActiveAddOns } from "@/lib/queries/addOns";
import { getPartnerHotels, type PartnerHotel } from "@/lib/queries/hotels";
import { getPublicSettings, type PublicSettings } from "@/lib/queries/settings";

type Client = SupabaseClient<Database>;

export type BookingCategory = {
  id: string;
  slug: string;
  name: string;
  category: VehicleCategoryClass;
  transmission: string;
  seats: number;
  doors: number;
  fuelType: string;
  airConditioning: boolean;
  luggageCapacity: number | null;
  imagePath: string | null;
  rates: CategoryRates;
};

export type BookingLocation = {
  id: string;
  slug: string;
  name: string;
  type: LocationType;
  address: string | null;
  isPickupPoint: boolean;
};

export type BookingAddOn = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceMur: number;
  priceType: AddOnPriceType;
  maxQuantity: number;
};

/** Everything the booking flow's client components need, fetched once in the flow layout. */
export type BookingFlowData = {
  categories: BookingCategory[];
  locations: BookingLocation[];
  addOns: BookingAddOn[];
  hotels: PartnerHotel[];
  settings: PublicSettings;
};

/**
 * All public-readable (anon RLS or public views) — safe to serialise into
 * client components. Categories only, never vehicles.
 */
export async function getBookingFlowData(supabase: Client): Promise<BookingFlowData> {
  const [categories, locations, addOns, hotels, settings] = await Promise.all([
    getActiveCategories(supabase),
    getActiveLocations(supabase),
    getActiveAddOns(supabase),
    getPartnerHotels(supabase),
    getPublicSettings(supabase),
  ]);

  return {
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      category: c.category as VehicleCategoryClass,
      transmission: c.transmission,
      seats: c.seats,
      doors: c.doors,
      fuelType: c.fuel_type,
      airConditioning: c.air_conditioning,
      luggageCapacity: c.luggage_capacity,
      imagePath: c.image_path,
      rates: { rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur },
    })),
    locations: locations.map((l) => ({
      id: l.id,
      slug: l.slug,
      name: l.name,
      type: l.type as LocationType,
      address: l.address,
      isPickupPoint: l.is_pickup_point,
    })),
    addOns: addOns.map((a) => ({
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      priceMur: a.price_mur,
      priceType: a.price_type as AddOnPriceType,
      maxQuantity: a.max_quantity,
    })),
    hotels,
    settings,
  };
}
