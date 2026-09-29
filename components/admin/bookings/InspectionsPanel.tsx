import { formatDateTime } from "@/lib/format";
import { FUEL_LABEL, INSPECTION_LABEL } from "@/lib/inspections";
import type { FuelLevel, InspectionKind } from "@/types/enums";

export type InspectionView = {
  kind: InspectionKind;
  mileageKm: number;
  fuelLevel: FuelLevel;
  exteriorNotes: string | null;
  inspectedAt: string;
  inspectorName: string | null;
  photos: { path: string; url: string }[];
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className="text-right text-text">{children}</span>
    </div>
  );
}

function InspectionCard({ inspection }: { inspection: InspectionView }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-admin-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-text">{INSPECTION_LABEL[inspection.kind]}</h4>
        <span className="text-xs text-text-muted">{formatDateTime(inspection.inspectedAt)}</span>
      </div>
      <div className="space-y-1.5">
        <Row label="Mileage">{inspection.mileageKm.toLocaleString("en-US")} km</Row>
        <Row label="Fuel">{FUEL_LABEL[inspection.fuelLevel]}</Row>
        {inspection.inspectorName && <Row label="By">{inspection.inspectorName}</Row>}
        {inspection.exteriorNotes && (
          <div className="text-sm">
            <span className="text-text-muted">Notes</span>
            <p className="mt-0.5 whitespace-pre-wrap text-text">{inspection.exteriorNotes}</p>
          </div>
        )}
      </div>
      {inspection.photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {inspection.photos.map((p) => (
            <a
              key={p.path}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-20 w-20 overflow-hidden rounded-[var(--radius-md)] border border-admin-border"
            >
              {/* Signed, time-limited URLs from a private bucket — plain img, not next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${INSPECTION_LABEL[inspection.kind]} photo`} className="h-full w-full object-cover" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function InspectionsPanel({ inspections }: { inspections: InspectionView[] }) {
  if (inspections.length === 0) return null;
  return (
    <section className="rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Inspections</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {inspections.map((i) => (
          <InspectionCard key={i.kind} inspection={i} />
        ))}
      </div>
    </section>
  );
}
