import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { StaffRole } from "@/types/enums";

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

/**
 * For server actions: the signed-in, active staff member, provided their
 * role is one of `roles`. Throws a user-facing message otherwise — server
 * actions are public endpoints, so every write re-checks this itself.
 */
export async function requireRole(roles: StaffRole[]): Promise<StaffProfile> {
  const staff = await getCurrentStaff();
  if (!staff?.is_active) throw new AuthError("Your session has expired. Sign in again.");
  if (!roles.includes(staff.role as StaffRole)) {
    throw new AuthError(`Only ${roles.join(" or ")} accounts can do this.`);
  }
  return staff;
}

export class AuthError extends Error {}
