"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-8 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-warning-deep" strokeWidth={1.25} aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-text">Something went wrong</h2>
      <p className="mt-2 text-sm text-text-muted">
        This page hit an error and couldn&apos;t load. Try again — if it keeps happening, refresh or sign in again.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-text-muted">Ref: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
