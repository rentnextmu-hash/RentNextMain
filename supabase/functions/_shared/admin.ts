import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service-role client — bypasses RLS. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are injected into every Edge Function by
// Supabase automatically; nothing to set by hand.
export function createAdminClient() {
  return createClient<Database>(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
