"use client";

// Temporary isolated preview route for iterating on SplashScreen's timing
// before it's wired into app/(public)/layout.tsx. Remove this whole
// app/splash-preview/ directory once the splash is approved.
import { useState } from "react";
import { SplashScreen } from "@/components/public/SplashScreen";

export default function SplashPreviewPage() {
  const [replayKey, setReplayKey] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0a1b29] p-8 text-center text-white">
      <div>
        <p className="text-lg font-semibold">Splash preview</p>
        <p className="mt-1 text-sm text-white/60">
          Reflects the current tuning: min 1200ms, max 2200ms, reduced-motion holds at 600ms.
          <br />
          Click anywhere on the splash (or press a key / scroll) to skip it early.
        </p>
      </div>

      <button
        onClick={() => setReplayKey((k) => k + 1)}
        className="rounded-[10px] bg-[#31cfc4] px-5 py-2 text-sm font-medium text-[#0a1b29] hover:bg-[#28b4aa]"
      >
        Replay
      </button>

      <SplashScreen key={replayKey} forcePreview />
    </div>
  );
}
