import Image from "next/image";
import { Car } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VehicleCategoryClass } from "@/types/enums";

export const CLASS_LABEL: Record<VehicleCategoryClass, string> = {
  mini: "Mini",
  economy: "Economy",
  economy_elite: "Economy Elite",
  standard: "Standard",
  compact: "Compact",
  sedan: "Sedan",
  intermediate: "Intermediate",
  compact_elite: "Compact Elite",
  luxury: "Luxury",
  convertible: "Convertible",
  pickup: "Pick Up",
};

// Canonical cheapest-to-priciest order, matching the real rate card.
export const CLASS_ORDER: VehicleCategoryClass[] = [
  "mini",
  "economy",
  "economy_elite",
  "standard",
  "compact",
  "sedan",
  "intermediate",
  "compact_elite",
  "luxury",
  "convertible",
  "pickup",
];

export type CarCardData = {
  name: string;
  category: VehicleCategoryClass;
  transmission: string;
  seats: number;
  airConditioning: boolean;
  dailyRateMur: number;
  imagePath: string | null;
  availableCount?: number;
};

export function CarCard({ car, className }: { car: CarCardData; className?: string }) {
  return (
    <div
      className={cn(
        "group overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="relative flex h-44 items-center justify-center bg-surface-alt">
        {car.imagePath ? (
          <Image
            src={car.imagePath}
            alt={car.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <Car className="h-16 w-16 text-primary/30" strokeWidth={1.25} aria-hidden="true" />
        )}
        <Badge variant="neutral" className="absolute left-3 top-3 bg-surface/90">
          {CLASS_LABEL[car.category]}
        </Badge>
        {typeof car.availableCount === "number" && (
          <Badge
            variant={car.availableCount > 0 ? "success" : "error"}
            className="absolute right-3 top-3 bg-surface/90"
          >
            {car.availableCount > 0 ? `${car.availableCount} available` : "Not available"}
          </Badge>
        )}
      </div>

      <div className="p-4">
        <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text">{car.name}</p>
        <p className="mt-1 text-sm text-text-muted">
          {car.transmission === "automatic" ? "Automatic" : "Manual"} &middot; {car.seats} seats
          {car.airConditioning ? " · AC" : ""}
        </p>
        <p className="mt-3 text-sm text-text-muted">
          <span className="text-lg font-semibold text-text">{formatMUR(car.dailyRateMur)}</span> / day
        </p>
      </div>
    </div>
  );
}
