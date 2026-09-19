import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { VehicleStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type VehicleInsert = Database["public"]["Tables"]["vehicles"]["Insert"];
export type VehicleUpdate = Database["public"]["Tables"]["vehicles"]["Update"];

export type VehicleWithRelations = Vehicle & {
  category: Database["public"]["Tables"]["vehicle_categories"]["Row"];
  location: Database["public"]["Tables"]["locations"]["Row"];
};

const VEHICLE_RELATIONS_SELECT = `*, category:vehicle_categories(*), location:locations(*)`;

export type VehicleFilters = {
  locationId?: string;
  categoryId?: string;
  status?: VehicleStatus | VehicleStatus[];
  /** Matches code, registration, or category name. */
  search?: string;
};

export async function getVehicles(supabase: Client, filters: VehicleFilters = {}): Promise<VehicleWithRelations[]> {
  let matchingCategoryIds: string[] = [];
  if (filters.search) {
    const { data: matchingCategories, error } = await supabase
      .from("vehicle_categories")
      .select("id")
      .ilike("name", `%${filters.search}%`);
    if (error) throw error;
    matchingCategoryIds = (matchingCategories ?? []).map((c) => c.id);
  }

  let query = supabase.from("vehicles").select(VEHICLE_RELATIONS_SELECT).order("code", { ascending: true });

  if (filters.locationId) query = query.eq("location_id", filters.locationId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.status) {
    query = Array.isArray(filters.status)
      ? query.in("status", filters.status)
      : query.eq("status", filters.status);
  }
  if (filters.search) {
    const categoryFilter =
      matchingCategoryIds.length > 0 ? `,category_id.in.(${matchingCategoryIds.join(",")})` : "";
    query = query.or(`code.ilike.%${filters.search}%,registration.ilike.%${filters.search}%${categoryFilter}`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as VehicleWithRelations[];
}

export async function getVehicleById(supabase: Client, id: string): Promise<VehicleWithRelations | null> {
  const { data, error } = await supabase
    .from("vehicles")
    .select(VEHICLE_RELATIONS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as VehicleWithRelations | null;
}

export async function createVehicle(supabase: Client, vehicle: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
  if (error) throw error;
  return data;
}

export async function updateVehicle(supabase: Client, id: string, updates: VehicleUpdate): Promise<Vehicle> {
  const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
