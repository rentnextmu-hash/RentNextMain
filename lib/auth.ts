import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type StaffProfile = Database["public"]["Tables"]["profiles"]["Row"];

/** The signed-in staff member's profile, or null if unauthenticated or the profile row is missing. */
export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return profile;
}
