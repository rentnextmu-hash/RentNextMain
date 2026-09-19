import type { VehicleCategoryClass } from "@/types/enums";

export type GradientPair = { from: string; to: string };

/**
 * One two-stop vertical gradient per vehicle class, darker at the top —
 * the fleet showcase carousel's background per slide. Documented
 * alongside these exact values in styles/tokens.css as a design
 * reference; kept here as plain TS since the carousel crossfades between
 * them via opacity (two stacked gradient layers, not a colour
 * interpolation), which needs real values to render, not CSS custom
 * property indirection.
 */
export const FLEET_PALETTE: Record<VehicleCategoryClass, GradientPair> = {
  mini: { from: "#3B4A6B", to: "#6B7FA8" },
  economy: { from: "#0E6B6B", to: "#31CFC4" },
  economy_elite: { from: "#145A7A", to: "#3FA9C9" },
  standard: { from: "#2F5D50", to: "#6FA88C" },
  compact: { from: "#1F4F63", to: "#4E9BA8" },
  sedan: { from: "#2B3A55", to: "#5C7099" },
  intermediate: { from: "#4A4460", to: "#8479A6" },
  compact_elite: { from: "#5A3B52", to: "#A0688C" },
  luxury: { from: "#0F1B29", to: "#2E4460" },
  convertible: { from: "#A34A2E", to: "#E8834F" },
  pickup: { from: "#4A3A22", to: "#96764A" },
};

export function fleetGradientCss(pair: GradientPair): string {
  return `linear-gradient(180deg, ${pair.from} 0%, ${pair.to} 100%)`;
}
