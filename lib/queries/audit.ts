import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

export type AuditFilters = { entity?: string; action?: string };
export type AuditPage = { rows: AuditRow[]; total: number };

/**
 * One page of the audit log, newest first. RLS restricts SELECT to
 * owner/manager, so a staff session sees nothing here.
 */
export async function getAuditPage(
  supabase: Client,
  filters: AuditFilters,
  { page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {},
): Promise<AuditPage> {
  const start = (page - 1) * pageSize;
  let query = supabase
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("at", { ascending: false })
    .range(start, start + pageSize - 1);
  if (filters.entity) query = query.eq("entity", filters.entity);
  if (filters.action) query = query.eq("action", filters.action);

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as AuditRow[], total: count ?? 0 };
}
