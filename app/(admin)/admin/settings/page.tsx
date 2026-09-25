import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getAdminSettings } from "@/lib/queries/settings";
import { getAllCategories } from "@/lib/queries/categories";
import { getAllAddOns } from "@/lib/queries/addOns";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettingsForms } from "@/components/admin/settings/SettingsForms";
import { CategorySettings } from "@/components/admin/settings/CategorySettings";
import { AddOnSettings } from "@/components/admin/settings/AddOnSettings";
import type { VehicleCategoryClass } from "@/types/enums";

export default async function AdminSettingsPage() {
  const staff = await getCurrentStaff();

  // Owner only: managers and staff can't change company settings, rates or extras.
  if (staff?.role !== "owner") {
    return (
      <div>
        <h2 className="text-xl font-semibold text-text">Settings</h2>
        <EmptyState
          icon={<Lock className="h-10 w-10" strokeWidth={1.25} />}
          title="Owner access only"
          description="Company settings, rates and extras can only be changed by the owner. Ask them if something needs updating."
          className="mt-4 rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [settings, categories, addOns] = await Promise.all([
    getAdminSettings(supabase),
    getAllCategories(supabase),
    getAllAddOns(supabase),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-text">Settings</h2>
        <p className="text-sm text-text-muted">Changes here update the public website straight away.</p>
      </div>

      <SettingsForms settings={settings} />

      <CategorySettings
        categories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          category: c.category as VehicleCategoryClass,
          tagline: c.tagline,
          bestFor: c.best_for,
          description: c.description,
          transmission: c.transmission,
          fuelType: c.fuel_type,
          seats: c.seats,
          doors: c.doors,
          luggageCapacity: c.luggage_capacity,
          airConditioning: c.air_conditioning,
          rate12: c.rate_1_2_mur,
          rate35: c.rate_3_5_mur,
          rate6: c.rate_6_plus_mur,
          isActive: c.is_active,
          imagePath: c.image_path,
        }))}
      />

      <AddOnSettings
        addOns={addOns.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          priceMur: a.price_mur,
          priceType: a.price_type as "per_day" | "per_booking",
          maxQuantity: a.max_quantity,
          isActive: a.is_active,
        }))}
      />
    </div>
  );
}
