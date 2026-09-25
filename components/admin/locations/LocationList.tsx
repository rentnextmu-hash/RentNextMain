"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { reorderLocationsAction } from "@/app/(admin)/admin/locations/actions";

export type LocationListItem = {
  id: string;
  slug: string;
  name: string;
  type: string;
  region: string | null;
  isActive: boolean;
  isPickupPoint: boolean;
  fleet: { total: number; available: number; booked: number; maintenance: number; inactive: number };
  bookingsThisMonth: number;
};

const TYPE_LABEL: Record<string, string> = { branch: "Branch", airport: "Airport", hotel: "Hotel", custom: "Other" };

/** The fleet split as one stacked bar: available / booked / maintenance. */
function FleetBar({ fleet }: { fleet: LocationListItem["fleet"] }) {
  const segments = [
    { key: "available", value: fleet.available, className: "bg-success" },
    { key: "booked", value: fleet.booked, className: "bg-info" },
    { key: "maintenance", value: fleet.maintenance, className: "bg-warning" },
  ];
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-alt" aria-hidden="true">
        {fleet.total > 0 &&
          segments.map((s) => <div key={s.key} className={s.className} style={{ width: `${(s.value / fleet.total) * 100}%` }} />)}
      </div>
      <p className="mt-2 text-xs text-text-muted">
        <span className="font-medium text-text">{fleet.total}</span> cars · {fleet.available} available · {fleet.booked} booked ·{" "}
        {fleet.maintenance} maintenance
      </p>
    </div>
  );
}

/**
 * Locations in display order — the order they appear across the public
 * site. Drag a card, or use its arrow buttons (keyboard-friendly), to
 * reorder; the new order saves straight away.
 */
export function LocationList({ items: initial, canReorder }: { items: LocationListItem[]; canReorder: boolean }) {
  const [items, setItems] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismiss = useCallback(() => setToast(null), []);
  const beforeDrag = useRef(initial);

  function save(next: LocationListItem[], previous: LocationListItem[]) {
    if (next.every((item, i) => item.id === previous[i]?.id)) return;
    startTransition(async () => {
      const r = await reorderLocationsAction(next.map((i) => i.id));
      if (r.ok) setToast({ id: Date.now(), message: r.message, variant: "success" });
      else {
        setItems(previous);
        setToast({ id: Date.now(), message: r.error, variant: "error" });
      }
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    return next;
  }

  return (
    <>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy={pending}>
        {items.map((l, index) => (
          <li
            key={l.id}
            draggable={canReorder}
            onDragStart={(e) => {
              beforeDrag.current = items;
              setDragging(l.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              if (!dragging || dragging === l.id) return;
              e.preventDefault();
              const from = items.findIndex((i) => i.id === dragging);
              move(from, index);
            }}
            onDragEnd={() => {
              setDragging(null);
              save(items, beforeDrag.current);
            }}
            className={cn(
              "relative rounded-[var(--radius-lg)] border bg-admin-surface p-5 transition-shadow",
              dragging === l.id ? "border-primary opacity-60 shadow-[var(--shadow-md)]" : "border-admin-border",
              !l.isActive && "bg-surface-alt",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                {canReorder && (
                  <GripVertical className="mt-0.5 h-5 w-5 shrink-0 cursor-grab text-text-muted" aria-hidden="true" />
                )}
                <div>
                  <Link
                    href={`/admin/locations/${l.slug}`}
                    className="font-semibold text-text after:absolute after:inset-0 hover:text-primary"
                  >
                    {l.name}
                  </Link>
                  <p className="text-sm text-text-muted">{l.region ?? "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1">
                <Badge>{TYPE_LABEL[l.type] ?? l.type}</Badge>
                {!l.isActive && <Badge variant="warning">Hidden</Badge>}
                {l.isActive && !l.isPickupPoint && <Badge variant="info">No pickups</Badge>}
              </div>
            </div>
            <div className="mt-4">
              <FleetBar fleet={l.fleet} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-text">
                <span className="font-semibold">{l.bookingsThisMonth}</span>{" "}
                <span className="text-text-muted">pickup{l.bookingsThisMonth === 1 ? "" : "s"} this month</span>
              </p>
              {canReorder && (
                // relative + z-10: above the card's stretched link.
                <div className="relative z-10 flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = move(index, index - 1);
                      if (next) save(next, items);
                    }}
                    disabled={index === 0 || pending}
                    className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-30"
                    aria-label={`Move ${l.name} up`}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = move(index, index + 1);
                      if (next) save(next, items);
                    }}
                    disabled={index === items.length - 1 || pending}
                    className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-surface-alt hover:text-text disabled:opacity-30"
                    aria-label={`Move ${l.name} down`}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
