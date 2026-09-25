"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function PublicError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <AlertTriangle className="mx-auto h-12 w-12 text-warning-deep" strokeWidth={1.25} aria-hidden="true" />
      <h1 className="mt-4 font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">
        Something went wrong
      </h1>
      <p className="mt-3 text-text-muted">
        Sorry — this page didn&apos;t load properly. Please try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Homepage
        </Link>
      </div>
    </div>
  );
}
