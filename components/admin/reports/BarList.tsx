// A simple, dependency-free horizontal bar list for the admin Reports page.
// Magnitude comparison → one hue (accent), 4px rounded data-ends on a recessive
// track, value direct-labelled in ink (never colour-alone), so it reads as a
// small table too. Empty rows render as an em dash.

export type Bar = { label: string; value: number; valueLabel: string };

export function BarList({ bars, emptyLabel = "No data yet" }: { bars: Bar[]; emptyLabel?: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  if (bars.length === 0 || bars.every((b) => b.value === 0)) {
    return <p className="text-sm text-text-muted">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {bars.map((b) => (
        <li key={b.label} className="grid grid-cols-[9rem_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-text-muted" title={b.label}>
            {b.label}
          </span>
          <span className="h-2.5 rounded-full bg-surface-alt" aria-hidden="true">
            <span
              className="block h-2.5 rounded-full bg-accent"
              style={{ width: `${Math.max(b.value === 0 ? 0 : 4, (b.value / max) * 100)}%` }}
            />
          </span>
          <span className="tabular-nums font-medium text-text">{b.valueLabel}</span>
        </li>
      ))}
    </ul>
  );
}
