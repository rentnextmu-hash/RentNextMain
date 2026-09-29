// Client-safe presentation helpers for check-out / check-in inspections.
import type { FuelLevel, InspectionKind } from "@/types/enums";

export const FUEL_LEVELS: { value: FuelLevel; label: string; short: string }[] = [
  { value: "empty", label: "Empty", short: "E" },
  { value: "quarter", label: "Quarter", short: "¼" },
  { value: "half", label: "Half", short: "½" },
  { value: "three_quarters", label: "Three quarters", short: "¾" },
  { value: "full", label: "Full", short: "F" },
];

export const FUEL_LABEL: Record<FuelLevel, string> = Object.fromEntries(
  FUEL_LEVELS.map((f) => [f.value, f.label]),
) as Record<FuelLevel, string>;

export const FUEL_SHORT: Record<FuelLevel, string> = Object.fromEntries(
  FUEL_LEVELS.map((f) => [f.value, f.short]),
) as Record<FuelLevel, string>;

export const INSPECTION_LABEL: Record<InspectionKind, string> = {
  checkout: "Check-out (handover)",
  checkin: "Check-in (return)",
};

export const MAX_INSPECTION_PHOTOS = 12;
