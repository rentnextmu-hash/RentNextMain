"use client";

import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyReferenceButton({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or permissions) — the reference
      // is still selectable on the page.
    }
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={copy} className="print:hidden">
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="print:hidden">
      <Printer className="h-4 w-4" aria-hidden="true" />
      Print / Save as PDF
    </Button>
  );
}
