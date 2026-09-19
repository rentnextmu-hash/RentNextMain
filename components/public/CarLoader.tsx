import "./splash.css";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type CarLoaderSize = "sm" | "md" | "lg";

type SizeConfig = {
  roadWidth: number;
  roadHeight: number;
  carWidth: number;
  carHeight: number;
  headlightSize: number;
  dashHeight: number;
  /** Default single-pass duration when used as an indeterminate (looping) loader. */
  loopDurationMs: number;
};

const SIZE_CONFIG: Record<CarLoaderSize, SizeConfig> = {
  sm: { roadWidth: 40, roadHeight: 16, carWidth: 13, carHeight: 8, headlightSize: 10, dashHeight: 1, loopDurationMs: 900 },
  md: { roadWidth: 140, roadHeight: 34, carWidth: 22, carHeight: 13, headlightSize: 18, dashHeight: 2, loopDurationMs: 1300 },
  lg: { roadWidth: 260, roadHeight: 56, carWidth: 34, carHeight: 20, headlightSize: 28, dashHeight: 2, loopDurationMs: 1600 },
};

export type CarLoaderProps = {
  /** sm fits inline in a button; md suits a route-loading state; lg is the splash screen's size. */
  size?: CarLoaderSize;
  /**
   * One-shot drive duration in ms (e.g. matched to the splash's dismiss
   * timing) — the car drives left-to-right once and holds. Omit for the
   * default indeterminate loop (ping-pongs back and forth), used
   * everywhere else — a route loading.tsx, the Button loading state, an
   * availability check.
   */
  durationMs?: number;
  className?: string;
};

/**
 * The car-on-a-road motif used across the site as the loading indicator —
 * the splash screen's centrepiece (size="lg", one-shot durationMs matched
 * to its dismiss timing) and every other loading state (default: looping).
 * Pure CSS animation (transform/opacity/background-position only); honours
 * prefers-reduced-motion via splash.css.
 */
export function CarLoader({ size = "md", durationMs, className }: CarLoaderProps) {
  const cfg = SIZE_CONFIG[size];
  const loop = durationMs === undefined;
  const driveDistance = cfg.roadWidth - cfg.carWidth;
  const duration = durationMs ?? cfg.loopDurationMs;

  const driveStyle: CSSProperties & Record<`--${string}`, string> = {
    width: cfg.carWidth,
    height: cfg.carHeight + 6,
    "--rn-drive-distance": `${driveDistance}px`,
    animationDuration: `${duration}ms`,
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative overflow-hidden", className)}
      style={{ width: cfg.roadWidth, height: cfg.roadHeight }}
    >
      {/* Road: base line + scrolling dashed centre line */}
      <div
        className="absolute bottom-[3px] left-0 right-0 rounded-full bg-white/12"
        style={{ height: cfg.dashHeight }}
      />
      <div className="rn-road-dashes absolute bottom-[3px] left-0 right-0" style={{ height: cfg.dashHeight }} />

      {/* Drive wrapper: horizontal translateX only */}
      <div className="rn-car-drive absolute bottom-0 left-0" data-loop={loop ? "true" : "false"} style={driveStyle}>
        {/* Bob wrapper: vertical translateY only, nested so it doesn't
            fight the drive wrapper's translateX for the transform property */}
        <div className="rn-car-bob relative h-full w-full">
          {/* Trail, behind (left of) the car */}
          <div
            className="rn-car-trail absolute right-full top-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: cfg.carWidth * 1.8,
              height: Math.max(2, cfg.carHeight * 0.35),
              background: "linear-gradient(to left, var(--color-accent), transparent)",
            }}
          />

          {/* Headlight cone, ahead (right of) the car */}
          <div
            className="rn-car-headlight absolute left-full top-1/2 -translate-y-1/2 rounded-full blur-[1px]"
            style={{
              width: cfg.headlightSize,
              height: cfg.headlightSize * 0.6,
              background: "radial-gradient(ellipse at left, var(--color-accent), transparent 70%)",
            }}
          />

          {/* Car silhouette — simple composed shapes, not a detailed illustration */}
          <svg
            viewBox="0 0 100 58"
            width={cfg.carWidth}
            height={cfg.carHeight}
            className="absolute bottom-0 left-0"
            aria-hidden="true"
          >
            <rect x="26" y="8" width="42" height="24" rx="10" fill="var(--color-accent)" />
            <rect x="6" y="26" width="82" height="16" rx="8" fill="var(--color-accent)" />
            <circle cx="24" cy="46" r="9" fill="var(--color-accent)" />
            <circle cx="72" cy="46" r="9" fill="var(--color-accent)" />
          </svg>
        </div>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
