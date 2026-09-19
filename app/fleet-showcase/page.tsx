// Temporary isolated preview route for tuning FleetShowcase's palettes and
// drag feel before it's mounted on the homepage. Remove this whole
// app/fleet-showcase/ directory once approved.
import { createClient } from "@/lib/supabase/server";
import { getCategoriesWithFleetAvailability } from "@/lib/queries/categories";
import { FleetShowcase, type FleetShowcaseVehicle } from "@/components/public/FleetShowcase";
import type { VehicleCategoryClass } from "@/types/enums";

export default async function FleetShowcasePreviewPage() {
  const supabase = await createClient();
  const categories = await getCategoriesWithFleetAvailability(supabase);

  const vehicles: FleetShowcaseVehicle[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    category: c.category as VehicleCategoryClass,
    rateClass: c.rate_class,
    tagline: c.tagline,
    description: c.description,
    bestFor: c.best_for,
    seats: c.seats,
    doors: c.doors,
    transmission: c.transmission,
    airConditioning: c.air_conditioning,
    luggageCapacity: c.luggage_capacity,
    imagePath: c.image_path,
    rate1To2Mur: c.rate_1_2_mur,
    rate3To5Mur: c.rate_3_5_mur,
    rate6PlusMur: c.rate_6_plus_mur,
    availableCount: c.availableCount,
  }));

  return (
    <div className="min-h-screen bg-black">
      <FleetShowcase vehicles={vehicles} />
    </div>
  );
}
