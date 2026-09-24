"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Right-hand slide-over for admin forms, on the native <dialog> element
 * (focus trap, inert background and Escape-to-close from the browser).
 * `footer` stays pinned to the bottom while the body scrolls.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-md border-l border-admin-border bg-admin-surface p-0 text-text shadow-[var(--shadow-lg)]",
        "backdrop:bg-primary/40",
        className,
      )}
    >
      {open && (
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-admin-border px-6 py-4">
            <div>
              <h2 id={titleId} className="text-lg font-semibold text-text">
                {title}
              </h2>
              {description && <div className="mt-0.5 text-sm text-text-muted">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] p-1 text-text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="border-t border-admin-border px-6 py-4">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
