import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationCardData = {
  name: string;
  region: string | null;
  vehicleCount?: number;
};

export function LocationCard({ location, className }: { location: LocationCardData; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex h-28 items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
        <MapPin className="h-10 w-10 text-primary/40" strokeWidth={1.25} aria-hidden="true" />
      </div>
      <div className="p-4">
        <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-text">{location.name}</p>
        {location.region && <p className="text-sm text-text-muted">{location.region}</p>}
        {typeof location.vehicleCount === "number" && (
          <p className="mt-2 text-sm text-text-muted">{location.vehicleCount} vehicles based here</p>
        )}
      </div>
    </div>
  );
}
