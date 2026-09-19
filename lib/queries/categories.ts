import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getAvailableCategories } from "@/lib/availability";

type Client = SupabaseClient<Database>;
export type VehicleCategory = Database["public"]["Tables"]["vehicle_categories"]["Row"];

export async function getActiveCategories(supabase: Client): Promise<VehicleCategory[]> {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCategoryBySlug(supabase: Client, slug: string): Promise<VehicleCategory | null> {
  const { data, error } = await supabase
    .from("vehicle_categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export type CategoryWithAvailability = VehicleCategory & { availableCount: number };

export async function getCategoriesWithAvailabilityCount(
  supabase: Client,
  locationId: string,
  from: Date | string,
  to: Date | string,
): Promise<CategoryWithAvailability[]> {
  const [categories, availability] = await Promise.all([
    getActiveCategories(supabase),
    getAvailableCategories(supabase, locationId, from, to),
  ]);

  const countByCategory = new Map(availability.map((a) => [a.categoryId, a.availableCount]));

  return categories.map((category) => ({
    ...category,
    availableCount: countByCategory.get(category.id) ?? 0,
  }));
}
