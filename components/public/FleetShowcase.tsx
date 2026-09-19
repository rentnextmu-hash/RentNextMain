"use client";

import "./fleetShowcase.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PanInfo } from "framer-motion";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Car, ChevronLeft, ChevronRight } from "lucide-react";
import { FLEET_PALETTE, fleetGradientCss } from "./fleetPalette";
import { CLASS_LABEL } from "./CarCard";
import { formatMUR } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { VehicleCategoryClass } from "@/types/enums";

export type FleetShowcaseVehicle = {
  id: string;
  slug: string;
  name: string;
  category: VehicleCategoryClass;
  rateClass: string | null;
  tagline: string | null;
  description: string | null;
  bestFor: string | null;
  seats: number;
  doors: number;
  transmission: string;
  airConditioning: boolean;
  luggageCapacity: number | null;
  imagePath: string | null;
  rate1To2Mur: number;
  rate3To5Mur: number;
  rate6PlusMur: number;
  availableCount: number;
};

const SLOT_GAP_VW = 58; // distance between adjacent slide centres, desktop
const SLOT_GAP_VW_MOBILE = 78;
const SWIPE_DISTANCE_THRESHOLD = 0.18; // fraction of slot width
const SWIPE_VELOCITY_THRESHOLD = 500; // px/s

// Framer Motion types a cubic-bezier ease as a 4-tuple, not a plain
// number[] — a shared, correctly-typed constant for every stagger below.
const EASE_STANDARD: [number, number, number, number] = [0.4, 0, 0.2, 1];

function hashSlug(): string | null {
  if (typeof window === "undefined") return null;
  const match = window.location.hash.match(/^#fleet\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function FleetShowcase({ vehicles }: { vehicles: FleetShowcaseVehicle[] }) {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const dragX = useMotionValue(0);
  const skipHashAnim = useRef(true);

  const initialIndex = useMemo(() => {
    const slug = hashSlug();
    if (!slug) return 0;
    const idx = vehicles.findIndex((v) => v.slug === slug);
    return idx >= 0 ? idx : 0;
  }, [vehicles]);

  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    function measure() {
      setContainerWidth(window.innerWidth);
      setIsMobile(window.innerWidth < 768);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const slotGapPx = useMemo(() => {
    const vw = isMobile ? SLOT_GAP_VW_MOBILE : SLOT_GAP_VW;
    return (containerWidth * vw) / 100;
  }, [containerWidth, isMobile]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(vehicles.length - 1, index));
      setActiveIndex(clamped);
    },
    [vehicles.length],
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Sync the URL hash (deep-linkable), without pushing history entries.
  useEffect(() => {
    const vehicle = vehicles[activeIndex];
    if (!vehicle) return;
    const newHash = `#fleet/${vehicle.slug}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, "", newHash);
    }
  }, [activeIndex, vehicles]);

  function handleDragEnd(_event: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (slotGapPx === 0) return;
    const { offset, velocity } = info;
    // Vertical scroll wins over horizontal drag intent when the gesture
    // angle is mostly vertical — touch-action: pan-y on the track already
    // tells the browser to prioritise native scroll for that case, so a
    // drag end firing at all here means the browser judged it horizontal.
    const distanceRatio = offset.x / slotGapPx;
    let delta = 0;
    if (distanceRatio < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD) delta = 1;
    else if (distanceRatio > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD) delta = -1;
    dragX.set(0);
    if (delta !== 0) goTo(activeIndex + delta);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    }
  }

  useEffect(() => {
    // First paint arriving via a hash: no animation, just land there.
    skipHashAnim.current = false;
  }, []);

  const active = vehicles[activeIndex];
  if (!active) return null;

  const gradient = fleetGradientCss(FLEET_PALETTE[active.category]);

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Our fleet"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative w-full overflow-hidden focus:outline-none min-h-[85vh] md:min-h-screen"
    >
      <GradientCrossfade gradient={gradient} instant={!!prefersReducedMotion} />
      <RadialBloom />
      <GhostWatermark name={active.name} reducedMotion={!!prefersReducedMotion} />
      <BackgroundMotifs reducedMotion={!!prefersReducedMotion} />

      {/* Announces the active slide to assistive tech without relying on visual layout */}
      <div aria-live="polite" className="sr-only">
        {`Vehicle ${activeIndex + 1} of ${vehicles.length}, ${active.name}`}
      </div>

      <div className="relative z-10 flex h-full min-h-[85vh] flex-col md:min-h-screen md:grid md:grid-cols-[30%_40%_30%] md:items-center">
        <LeftColumn vehicle={active} reducedMotion={!!prefersReducedMotion} />

        <div className="relative order-first h-[45vh] overflow-hidden md:order-none md:h-full">
          <motion.div
            className="absolute inset-0 flex touch-pan-y items-center justify-center"
            drag="x"
            dragElastic={0.2}
            dragMomentum={false}
            dragConstraints={{ left: -slotGapPx, right: slotGapPx }}
            style={{ x: dragX }}
            onDragEnd={handleDragEnd}
          >
            {vehicles.map((vehicle, i) => (
              <CarVisual
                key={vehicle.id}
                vehicle={vehicle}
                offset={i - activeIndex}
                slotGapPx={slotGapPx}
                dragX={dragX}
                reducedMotion={!!prefersReducedMotion}
                peekScale={isMobile ? 0.85 : 0.75}
                priority={i === 0}
                onClick={() => {
                  if (i !== activeIndex) goTo(i);
                }}
              />
            ))}
          </motion.div>
        </div>

        {/* Mobile: sits right after the car image, always reachable
            without scrolling the much taller single-column layout.
            Desktop: taken out of flow, pinned to the viewport bottom. */}
        <Controls
          vehicles={vehicles}
          activeIndex={activeIndex}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={goTo}
        />

        <RightColumn vehicle={active} reducedMotion={!!prefersReducedMotion} />
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Background layers
// ────────────────────────────────────────────────────────────────────────

function GradientCrossfade({ gradient, instant }: { gradient: string; instant: boolean }) {
  const [layers, setLayers] = useState<{ bg: string; key: number }[]>([{ bg: gradient, key: 0 }]);

  useEffect(() => {
    setLayers((prev) => {
      const last = prev[prev.length - 1];
      if (last?.bg === gradient) return prev;
      const nextKey = (last?.key ?? 0) + 1;
      return [...prev.slice(-1), { bg: gradient, key: nextKey }];
    });
  }, [gradient]);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {layers.map((layer, i) => (
        <div
          key={layer.key}
          className="absolute inset-0"
          style={{
            background: layer.bg,
            transition: instant ? "none" : "opacity 700ms ease-in-out",
            opacity: i === layers.length - 1 ? 1 : 0,
          }}
        />
      ))}
    </div>
  );
}

function RadialBloom() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[70vh] w-[70vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 65%)" }}
    />
  );
}

function GhostWatermark({ name, reducedMotion }: { name: string; reducedMotion: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <AnimatePresence mode="sync">
        <motion.span
          key={name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.07 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.9, ease: "easeInOut" }}
          className={cn(
            "absolute whitespace-nowrap font-[family-name:var(--font-heading)] font-semibold uppercase text-white",
            "text-[22vw] leading-none",
            !reducedMotion && "rn-watermark-drift",
          )}
        >
          {name}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

function BackgroundMotifs({ reducedMotion }: { reducedMotion: boolean }) {
  const rings = [
    { size: 220, top: "12%", left: "8%", opacity: 0.08 },
    { size: 140, top: "70%", left: "85%", opacity: 0.06 },
    { size: 90, top: "20%", left: "88%", opacity: 0.1 },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {rings.map((ring, i) => (
        <div
          key={i}
          className={cn("absolute rounded-full border border-white", !reducedMotion && "rn-motif-float")}
          style={{
            width: ring.size,
            height: ring.size,
            top: ring.top,
            left: ring.left,
            opacity: ring.opacity,
            animationDelay: `${i * 1.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Centre: draggable car visual
// ────────────────────────────────────────────────────────────────────────

function CarVisual({
  vehicle,
  offset,
  slotGapPx,
  dragX,
  reducedMotion,
  peekScale,
  priority,
  onClick,
}: {
  vehicle: FleetShowcaseVehicle;
  offset: number;
  slotGapPx: number;
  dragX: ReturnType<typeof useMotionValue<number>>;
  reducedMotion: boolean;
  peekScale: number;
  priority: boolean;
  onClick: () => void;
}) {
  const baseX = offset * slotGapPx;
  const x = useTransform(dragX, (d) => baseX + d);
  const visible = Math.abs(offset) <= 1;

  if (Math.abs(offset) > 1) return null;

  return (
    <motion.div
      className="absolute flex flex-col items-center justify-center"
      style={{ x }}
      animate={{ scale: offset === 0 ? 1 : peekScale, opacity: offset === 0 ? 1 : 0.35 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, ease: EASE_STANDARD }}
      onClick={onClick}
      role={offset !== 0 ? "button" : undefined}
      aria-label={offset !== 0 ? `Go to ${vehicle.name}` : undefined}
      tabIndex={-1}
    >
      <div
        className={cn("relative flex h-[38vh] w-[60vw] items-center justify-center md:h-[46vh] md:w-[32vw]", !reducedMotion && offset === 0 && "rn-car-float")}
      >
        {vehicle.imagePath ? (
          <Image
            src={vehicle.imagePath}
            alt={vehicle.name}
            fill
            priority={priority}
            sizes="(min-width: 768px) 32vw, 60vw"
            className="object-contain drop-shadow-2xl"
          />
        ) : (
          <Car className="h-1/2 w-1/2 text-white/30" strokeWidth={1} aria-hidden="true" />
        )}
      </div>
      <div
        aria-hidden="true"
        className="-mt-2 h-4 w-[70%] rounded-[50%] bg-black/30 blur-md"
        style={{ visibility: visible ? "visible" : "hidden" }}
      />
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Left column: name, class, description, quick facts
// ────────────────────────────────────────────────────────────────────────

function LeftColumn({ vehicle, reducedMotion }: { vehicle: FleetShowcaseVehicle; reducedMotion: boolean }) {
  const facts = [
    `${vehicle.seats} SEATS`,
    vehicle.transmission === "automatic" ? "AUTOMATIC" : "MANUAL",
    vehicle.airConditioning ? "A/C" : null,
    vehicle.luggageCapacity ? `${vehicle.luggageCapacity} BAG${vehicle.luggageCapacity === 1 ? "" : "S"}` : null,
  ].filter(Boolean);

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: reducedMotion ? 0 : 0.4, delay: reducedMotion ? 0 : i * 0.06, ease: EASE_STANDARD },
  });

  return (
    <div className="relative z-10 order-2 px-6 pb-8 pt-6 text-white md:order-none md:px-12 lg:px-16">
      <AnimatePresence mode="wait">
        <div key={vehicle.id}>
          <motion.h2 {...stagger(0)} className="font-[family-name:var(--font-heading)] text-4xl font-semibold leading-[1.05] md:text-5xl lg:text-6xl">
            {vehicle.name}
          </motion.h2>
          <motion.p {...stagger(1)} className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            {CLASS_LABEL[vehicle.category]}
            {vehicle.rateClass ? ` · CAT ${vehicle.rateClass}` : ""}
          </motion.p>
          {vehicle.description && (
            <motion.p {...stagger(2)} className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-white/85">
              {vehicle.description}
            </motion.p>
          )}
          <motion.p {...stagger(3)} className="mt-6 text-xs font-medium tracking-wide text-white/70">
            {facts.join(" · ")}
          </motion.p>
        </div>
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Right column: spec sheet
// ────────────────────────────────────────────────────────────────────────

function RightColumn({ vehicle, reducedMotion }: { vehicle: FleetShowcaseVehicle; reducedMotion: boolean }) {
  const rows: { label: string; value: string; highlight?: boolean }[] = [
    { label: "Seats", value: String(vehicle.seats) },
    { label: "Doors", value: String(vehicle.doors) },
    { label: "Luggage", value: vehicle.luggageCapacity ? `${vehicle.luggageCapacity} bags` : "—" },
    { label: "Transmission", value: vehicle.transmission === "automatic" ? "Automatic" : "Manual" },
    { label: "A/C", value: vehicle.airConditioning ? "Yes" : "No" },
  ];

  const stagger = (i: number) => ({
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
    transition: { duration: reducedMotion ? 0 : 0.35, delay: reducedMotion ? 0 : i * 0.04, ease: EASE_STANDARD },
  });

  return (
    <div className="relative z-10 order-3 px-6 pb-24 text-white md:order-none md:px-12 md:pb-10 lg:px-16">
      <AnimatePresence mode="wait">
        <div key={vehicle.id}>
          {vehicle.bestFor && (
            <motion.div {...stagger(0)} className="border-b border-white/20 pb-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-white/60">Best for</p>
              <p className="mt-1 text-sm">{vehicle.bestFor}</p>
            </motion.div>
          )}

          <motion.div {...stagger(1)} className="border-b border-white/20 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-white/60">Specifications</p>
            {/* Compact two-column table on mobile; full-width label/value rows on desktop */}
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 md:block md:space-y-1.5">
              {rows.map((row) => (
                <div key={row.label} className="md:flex md:items-baseline md:justify-between md:text-sm">
                  <dt className="text-xs text-white/60 md:text-sm md:text-white/70">{row.label}</dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div {...stagger(2)} className="border-b border-white/20 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.15em] text-white/60">Daily rate</p>
            <dl className="mt-2 space-y-1.5">
              <RateRow label="1–2 days" value={vehicle.rate1To2Mur} />
              <RateRow label="3–5 days" value={vehicle.rate3To5Mur} />
              <RateRow label="6+ days" value={vehicle.rate6PlusMur} highlight />
            </dl>
          </motion.div>

          <motion.p {...stagger(3)} className="pt-3 text-sm text-white/80">
            {vehicle.availableCount > 0 ? `${vehicle.availableCount} available now` : "Check availability"}
          </motion.p>

          {/* Desktop: both CTAs sit in the column. Mobile: only the ghost
              CTA scrolls with the content — the primary CTA is pinned
              full-width to the viewport bottom below, always reachable
              without scrolling the (much taller, single-column) slide. */}
          <motion.div {...stagger(4)} className="mt-6 flex flex-col gap-3 md:flex-col">
            <Link
              href={`/cars/${vehicle.slug}`}
              className="hidden h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-white text-sm font-semibold tracking-wide md:inline-flex"
              style={{ color: FLEET_PALETTE[vehicle.category].from }}
            >
              VIEW &amp; BOOK
            </Link>
            <Link
              href={`/cars?category=${vehicle.category}`}
              className="inline-flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] border border-white/50 text-sm font-medium text-white hover:bg-white/10"
            >
              CHECK AVAILABILITY
            </Link>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Pinned primary CTA — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/50 to-transparent p-4 pt-8 md:hidden">
        <Link
          href={`/cars/${vehicle.slug}`}
          className="flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-white text-sm font-semibold tracking-wide"
          style={{ color: FLEET_PALETTE[vehicle.category].from }}
        >
          VIEW &amp; BOOK
        </Link>
      </div>
    </div>
  );
}

function RateRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between text-sm", highlight && "font-semibold text-white")}>
      <dt className={highlight ? "text-white" : "text-white/70"}>{label}</dt>
      <dd>{formatMUR(value)}</dd>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Controls: arrows + progress dashes
// ────────────────────────────────────────────────────────────────────────

function Controls({
  vehicles,
  activeIndex,
  onPrev,
  onNext,
  onSelect,
}: {
  vehicles: FleetShowcaseVehicle[];
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="relative z-20 order-1 flex items-center justify-center gap-6 py-4 md:absolute md:inset-x-0 md:bottom-10 md:order-none md:py-0">
      <button
        onClick={onPrev}
        disabled={activeIndex === 0}
        aria-label="Previous vehicle"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div role="tablist" aria-label="Choose a vehicle" className="flex items-center gap-1.5">
        {vehicles.map((v, i) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={i === activeIndex}
            aria-label={`Go to ${v.name}`}
            onClick={() => onSelect(i)}
            className={cn(
              "h-1 rounded-full bg-white transition-all",
              i === activeIndex ? "w-6 opacity-100" : "w-2.5 opacity-40 hover:opacity-70",
            )}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={activeIndex === vehicles.length - 1}
        aria-label="Next vehicle"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:bg-white/10 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
