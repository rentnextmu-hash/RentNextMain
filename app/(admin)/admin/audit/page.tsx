import Link from "next/link";
import { Lock, ScrollText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getAuditPage, type AuditRow } from "@/lib/queries/audit";
import { formatDateTime } from "@/lib/format";
import {
  AUDIT_ENTITIES,
  AUDIT_ACTIONS,
  ENTITY_LABEL,
  ACTION_LABEL,
  auditEntityHref,
} from "@/lib/audit";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { AuditChanges } from "@/components/admin/audit/AuditChanges";

export const metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

type RawParams = { entity?: string; action?: string; page?: string };

function parseParams(sp: RawParams) {
  const entity = sp.entity && AUDIT_ENTITIES.includes(sp.entity as (typeof AUDIT_ENTITIES)[number]) ? sp.entity : "";
  const action = sp.action && AUDIT_ACTIONS.includes(sp.action as (typeof AUDIT_ACTIONS)[number]) ? sp.action : "";
  const page = Math.max(1, Number(sp.page) || 1);
  return { entity, action, page };
}

const ACTION_STYLE: Record<string, string> = {
  insert: "bg-success/10 text-success-deep",
  update: "bg-info/10 text-info-deep",
  delete: "bg-error/10 text-error-deep",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const staff = await getCurrentStaff();

  // Owner + manager only: the log reveals who did what. RLS enforces this too,
  // but staff would otherwise see a confusing empty page.
  if (staff?.role !== "owner" && staff?.role !== "manager") {
    return (
      <div>
        <h2 className="text-xl font-semibold text-text">Audit log</h2>
        <EmptyState
          icon={<Lock className="h-10 w-10" strokeWidth={1.25} />}
          title="Owner and manager access only"
          description="The audit log shows who changed what across the system. Ask the owner if you need to check a change."
          className="mt-4 rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      </div>
    );
  }

  const params = parseParams(await searchParams);
  const supabase = await createClient();
  const { rows, total } = await getAuditPage(supabase, params, { page: params.page, pageSize: PAGE_SIZE });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hrefWith = (patch: Partial<RawParams>) => {
    const q = new URLSearchParams();
    const entity = patch.entity ?? params.entity;
    const action = patch.action ?? params.action;
    const page = patch.page ?? String(params.page);
    if (entity) q.set("entity", entity);
    if (action) q.set("action", action);
    if (page && page !== "1") q.set("page", page);
    const s = q.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text">Audit log</h2>
        <p className="text-sm text-text-muted">
          Every change to bookings, fleet, customers, rates and settings, newest first — recorded automatically.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Area</span>
          <select
            name="entity"
            defaultValue={params.entity}
            className="h-9 rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 text-sm text-text"
          >
            <option value="">All areas</option>
            {AUDIT_ENTITIES.map((e) => (
              <option key={e} value={e}>
                {ENTITY_LABEL[e]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-text-muted">Action</span>
          <select
            name="action"
            defaultValue={params.action}
            className="h-9 rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 text-sm text-text"
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABEL[a]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-9 rounded-[var(--radius-md)] bg-primary px-3 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Filter
        </button>
        {(params.entity || params.action) && (
          <Link href="/admin/audit" className="h-9 self-end px-2 py-2 text-sm text-text-muted hover:text-text">
            Clear
          </Link>
        )}
        <span className="ml-auto self-end text-sm text-text-muted">
          {total} entr{total === 1 ? "y" : "ies"}
        </span>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-10 w-10" strokeWidth={1.25} />}
          title="Nothing recorded yet"
          description="Changes made in the admin will show up here."
          className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface"
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((row: AuditRow) => {
            const href = auditEntityHref(row.entity, row.entity_id);
            return (
              <li key={row.id} className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_STYLE[row.action] ?? ""}`}>
                        {ACTION_LABEL[row.action] ?? row.action}
                      </span>
                      <Badge>{ENTITY_LABEL[row.entity] ?? row.entity}</Badge>
                      {href ? (
                        <Link href={href} className="text-sm font-medium text-text hover:text-primary hover:underline">
                          {row.summary || row.entity_id}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-text">{row.summary || row.entity_id}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-text-muted">
                      {row.actor_name || row.actor_email || "System / website"}
                      {row.actor_email && row.actor_name ? ` · ${row.actor_email}` : ""}
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-text-muted" dateTime={row.at}>
                    {formatDateTime(row.at)}
                  </time>
                </div>
                <AuditChanges action={row.action} changes={row.changes} />
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          <span className="text-text-muted">
            Page {params.page} of {pageCount}
          </span>
          <div className="flex gap-2">
            {params.page > 1 && (
              <Link
                href={hrefWith({ page: String(params.page - 1) })}
                className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt"
              >
                Previous
              </Link>
            )}
            {params.page < pageCount && (
              <Link
                href={hrefWith({ page: String(params.page + 1) })}
                className="rounded-[var(--radius-md)] border border-admin-border bg-admin-surface px-3 py-1.5 hover:bg-surface-alt"
              >
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
