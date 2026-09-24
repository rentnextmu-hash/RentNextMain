"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { checkAvailability } from "@/lib/availability";

export type AvailabilityResult =
  | { status: "idle" | "loading" }
  | { status: "ready"; counts: Map<string, number> }
  | { status: "error" };

// Per-page-load cache: stepping back and forth between car and trip
// shouldn't re-hit the Edge Function for a window already checked. Short
// TTL so a long-open tab doesn't show stale stock.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { at: number; counts: Map<string, number> }>();

/**
 * Live per-category availability for a pickup location and window, via the
 * check-availability Edge Function (lib/availability.ts's checkAvailability).
 * Debounced so dragging through dates doesn't fire a request per keystroke.
 */
export function useAvailability(
  locationId: string | null,
  pickupAt: string,
  returnAt: string,
  enabled = true,
): AvailabilityResult {
  const key = locationId && enabled ? `${locationId}|${pickupAt}|${returnAt}` : null;
  const [result, setResult] = useState<AvailabilityResult>({ status: "idle" });

  useEffect(() => {
    if (!key || !locationId) {
      setResult({ status: "idle" });
      return;
    }

    const cached = cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setResult({ status: "ready", counts: cached.counts });
      return;
    }

    let cancelled = false;
    setResult({ status: "loading" });
    const timer = setTimeout(async () => {
      try {
        const rows = await checkAvailability(createClient(), { locationId, from: pickupAt, to: returnAt });
        const counts = new Map(rows.map((r) => [r.categoryId, r.availableCount]));
        cache.set(key, { at: Date.now(), counts });
        if (!cancelled) setResult({ status: "ready", counts });
      } catch (err) {
        console.error("Availability check failed", err);
        if (!cancelled) setResult({ status: "error" });
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key, locationId, pickupAt, returnAt]);

  return result;
}
