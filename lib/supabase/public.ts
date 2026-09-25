import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cookie-less anon client for public, cacheable pages (car and location
 * pages, sitemap). Unlike lib/supabase/server.ts it never reads cookies, so
 * pages using it can be statically generated and revalidated — the right
 * trade-off for SEO pages whose data is the same for every visitor. Only
 * ever sees what RLS allows anon.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
