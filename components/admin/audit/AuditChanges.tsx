import type { Json } from "@/types/database";

// Columns that add noise to a snapshot without telling staff anything useful.
const HIDDEN_KEYS = new Set(["id", "created_at", "updated_at"]);

function prettyKey(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function formatValue(value: Json): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" || typeof value === "string") return String(value);
  return JSON.stringify(value);
}

type ChangePair = { from: Json; to: Json };

function isChangePair(v: Json): v is { from: Json; to: Json } & Json {
  return typeof v === "object" && v !== null && !Array.isArray(v) && "from" in v && "to" in v;
}

export function AuditChanges({ action, changes }: { action: string; changes: Json }) {
  if (typeof changes !== "object" || changes === null || Array.isArray(changes)) return null;
  const entries = Object.entries(changes as Record<string, Json>).filter(([k]) => !HIDDEN_KEYS.has(k));
  if (entries.length === 0) return null;

  const isUpdate = action === "update";
  const label = isUpdate
    ? `${entries.length} field${entries.length === 1 ? "" : "s"} changed`
    : action === "insert"
      ? "New record"
      : "Deleted record";

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-text-muted hover:text-text">
        {label}
      </summary>
      <div className="mt-2 overflow-x-auto rounded-[var(--radius-md)] border border-admin-border">
        <table className="w-full text-left text-xs">
          <tbody>
            {entries.map(([key, value]) => (
              <tr key={key} className="border-b border-admin-border last:border-b-0">
                <th scope="row" className="whitespace-nowrap px-3 py-1.5 align-top font-medium text-text-muted">
                  {prettyKey(key)}
                </th>
                <td className="px-3 py-1.5 align-top text-text">
                  {isUpdate && isChangePair(value) ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-text-muted line-through">{formatValue((value as ChangePair).from)}</span>
                      <span aria-hidden="true">→</span>
                      <span className="font-medium">{formatValue((value as ChangePair).to)}</span>
                    </span>
                  ) : (
                    <span className="break-words">{formatValue(value)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
