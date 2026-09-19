"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "./splash.css";
import { CarLoader } from "./CarLoader";

const SESSION_KEY = "rn_splash_seen";
const MIN_VISIBLE_MS = 1200;
const MAX_VISIBLE_MS = 2200;
const REDUCED_MOTION_MS = 600;
const EXIT_MS = 400;

// The RN mark: a rounded square with a gap at the top centre, stroked in
// teal and animated as a single open path via stroke-dashoffset (so no
// separate "gap" trick is needed — the path simply never closes).
const LOGO_PATH = "M58,6 L76,6 A18,18 0 0 1 94,24 L94,76 A18,18 0 0 1 76,94 L24,94 A18,18 0 0 1 6,76 L6,24 A18,18 0 0 1 24,6 L42,6";

export function SplashScreen({ forcePreview = false }: { forcePreview?: boolean }) {
  const pathname = usePathname();
  const [phase, setPhase] = useState<"hidden" | "visible" | "exiting">("hidden");
  const timers = useRef<number[]>([]);

  // Never show on the booking flow (not built yet, but this component
  // should already know to skip it once it exists) — admin routes are
  // excluded by construction, since this only ever mounts inside
  // app/(public)/layout.tsx.
  const excludedRoute = pathname?.startsWith("/booking") ?? false;

  useEffect(() => {
    if (excludedRoute) return;

    const clearAllTimers = () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };

    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // sessionStorage unavailable (private mode etc.) — treat as unseen
    }

    if (!forcePreview && alreadySeen) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setPhase("visible");

    if (reducedMotion) {
      const t = window.setTimeout(() => setPhase("exiting"), REDUCED_MOTION_MS);
      timers.current.push(t);
      return clearAllTimers;
    }

    let pageReady = document.readyState === "complete";
    let minElapsed = false;

    function dismiss() {
      clearAllTimers();
      setPhase((p) => (p === "visible" ? "exiting" : p));
    }

    function tryDismiss() {
      if (pageReady && minElapsed) dismiss();
    }

    timers.current.push(
      window.setTimeout(() => {
        minElapsed = true;
        tryDismiss();
      }, MIN_VISIBLE_MS),
    );
    timers.current.push(window.setTimeout(dismiss, MAX_VISIBLE_MS));

    function onLoad() {
      pageReady = true;
      tryDismiss();
    }
    if (!pageReady) window.addEventListener("load", onLoad, { once: true });

    // Skip affordance: any click, key press or scroll dismisses immediately.
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", dismiss);
    window.addEventListener("wheel", dismiss, { passive: true });

    return () => {
      clearAllTimers();
      window.removeEventListener("load", onLoad);
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("wheel", dismiss);
    };
  }, [forcePreview, excludedRoute]);

  useEffect(() => {
    if (phase !== "exiting") return;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // ignore — worst case the splash shows again
    }
    const t = window.setTimeout(() => setPhase("hidden"), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (excludedRoute || phase === "hidden") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden ${
        phase === "exiting" ? "rn-splash-exit" : ""
      }`}
      style={{ background: "linear-gradient(180deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)" }}
    >
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[80%] w-[80%] rotate-12"
        style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, transparent 60%)", opacity: 0.06 }}
      />

      <div className="relative flex flex-col items-center px-6 text-center">
        <svg viewBox="0 0 100 100" width={72} height={72}>
          <path
            className="rn-logo-stroke"
            d={LOGO_PATH}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <text
            x="50"
            y="62"
            textAnchor="middle"
            className="rn-logo-letters"
            fontFamily="var(--font-heading)"
            fontWeight={600}
            fontSize={32}
            fill="var(--color-text-inverse)"
          >
            RN
          </text>
        </svg>

        <p className="rn-wordmark mt-5 text-sm font-semibold text-white">RENT NEXT CAR HIRE</p>

        <p className="rn-tagline mt-2 font-[family-name:var(--font-heading)] text-sm italic text-white">
          Elevate your driving experience
        </p>

        <div className="mt-8">
          <CarLoader size="lg" durationMs={MIN_VISIBLE_MS} />
        </div>
      </div>
    </div>
  );
}
