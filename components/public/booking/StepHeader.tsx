import type { ReactNode } from "react";

export function StepHeader({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">{title}</h1>
      {description && <p className="mt-1 text-text-muted">{description}</p>}
    </div>
  );
}

export function StepLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-2/3 animate-pulse rounded-[var(--radius-md)] bg-surface-alt" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-surface-alt" />
      <div className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-surface-alt" />
    </div>
  );
}
