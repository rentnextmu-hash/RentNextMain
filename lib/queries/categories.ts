import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { checkAvailability } from "@/lib/availability";

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
    // Via the Edge Function, not getAvailableCategories() directly — this
    // runs for anonymous visitors, who can't read the vehicles table.
    checkAvailability(supabase, { locationId, from, to }),
  ]);

  const countByCategory = new Map(availability.map((a) => [a.categoryId, a.availableCount]));

  return categories.map((category) => ({
    ...category,
    availableCount: countByCategory.get(category.id) ?? 0,
  }));
}

/**
 * Fleet-wide "available now" count per category — not filtered by
 * location or date range (unlike getCategoriesWithAvailabilityCount,
 * which answers "can I book this for these exact dates at this branch").
 * Used by the fleet showcase carousel's "X available now" line, which is
 * a general signal of how much stock exists, not a live booking-window
 * check.
 *
 * Reads from the category_available_counts VIEW, not the vehicles table
 * directly — vehicles is intentionally staff-only RLS (no registration
 * plates on the public site), so an anon session querying it directly
 * gets zero rows back, silently. The view exposes only an aggregate
 * count and is explicitly grant-ed to anon (see migration 0005).
 */
export async function getCategoriesWithFleetAvailability(supabase: Client): Promise<CategoryWithAvailability[]> {
  const [categories, { data: counts, error }] = await Promise.all([
    getActiveCategories(supabase),
    supabase.from("category_available_counts").select("category_id, available_count"),
  ]);

  if (error) throw error;

  const countByCategory = new Map<string, number>();
  for (const row of counts ?? []) {
    if (row.category_id) countByCategory.set(row.category_id, row.available_count ?? 0);
  }

  return categories.map((category) => ({
    ...category,
    availableCount: countByCategory.get(category.id) ?? 0,
  }));
}
