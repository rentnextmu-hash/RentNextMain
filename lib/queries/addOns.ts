import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type AddOn = Database["public"]["Tables"]["add_ons"]["Row"];

export async function getActiveAddOns(supabase: Client): Promise<AddOn[]> {
  const { data, error } = await supabase
    .from("add_ons")
    .select("*")
    .eq("is_active", true)
    .order("price_type", { ascending: true })
    .order("price_mur", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/** Every add-on including inactive ones — for the settings page. */
export async function getAllAddOns(supabase: Client): Promise<AddOn[]> {
  const { data, error } = await supabase
    .from("add_ons")
    .select("*")
    .order("price_type", { ascending: true })
    .order("price_mur", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
