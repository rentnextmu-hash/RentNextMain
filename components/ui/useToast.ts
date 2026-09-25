"use client";

import { useCallback, useState } from "react";
import type { ToastMessage } from "@/components/ui/Toast";

/** Shared toast state for admin forms: `show(message)` then render <Toast toast={toast} onDismiss={dismiss} />. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const show = useCallback((message: string, variant: ToastMessage["variant"] = "success") => {
    setToast({ id: Date.now(), message, variant });
  }, []);
  const dismiss = useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}
