import { Car } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VehicleCategoryClass } from "@/types/enums";

const CLASS_GRADIENT: Record<VehicleCategoryClass, string> = {
  economy: "from-sky-100 to-sky-50",
  comfort: "from-amber-100 to-amber-50",
  suv: "from-emerald-100 to-emerald-50",
  premium: "from-slate-200 to-slate-50",
};

const CLASS_LABEL: Record<VehicleCategoryClass, string> = {
  economy: "Economy",
  comfort: "Comfort",
  suv: "SUV",
  premium: "Premium",
};

export type CarCardData = {
  name: string;
  category: VehicleCategoryClass;
  transmission: string;
  seats: number;
  airConditioning: boolean;
  dailyRateMur: number;
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
      <div
        className={cn(
          "relative flex h-40 items-center justify-center bg-gradient-to-br",
          CLASS_GRADIENT[car.category],
        )}
      >
        <Car className="h-16 w-16 text-primary/30" strokeWidth={1.25} aria-hidden="true" />
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
