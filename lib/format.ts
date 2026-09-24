const MAURITIUS_TZ = "Indian/Mauritius";

/** "Rs 1,200" — money is always whole Mauritian rupees, never floats or cents. */
export function formatMUR(amount: number): string {
  return `Rs ${Math.round(amount).toLocaleString("en-US")}`;
}

/** "20 Sep 2026" */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: MAURITIUS_TZ,
  });
}

/** "20 Sep 2026, 10:00" */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MAURITIUS_TZ,
  });
  return `${formatDate(d)}, ${time}`;
}

/** "20 – 25 Sep 2026" (or "20 Sep – 3 Oct 2026" across months) */
export function formatDateRange(from: Date | string, to: Date | string): string {
  const a = new Date(from);
  const b = new Date(to);

  const partsOf = (d: Date) => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: MAURITIUS_TZ,
    }).formatToParts(d);
    return Object.fromEntries(fmt.map((p) => [p.type, p.value]));
  };

  const pa = partsOf(a);
  const pb = partsOf(b);
  const sameMonth = pa.month === pb.month && pa.year === pb.year;

  if (sameMonth) {
    return `${pa.day} – ${pb.day} ${pb.month} ${pb.year}`;
  }

  return `${pa.day} ${pa.month} – ${pb.day} ${pb.month} ${pb.year}`;
}

/** Whole rental days between two dates, minimum 1 — counted in Mauritius local calendar days. */
export function daysBetween(from: Date | string, to: Date | string): number {
  const localDateKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: MAURITIUS_TZ }).format(d); // YYYY-MM-DD

  const a = new Date(`${localDateKey(new Date(from))}T00:00:00Z`);
  const b = new Date(`${localDateKey(new Date(to))}T00:00:00Z`);

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((b.getTime() - a.getTime()) / msPerDay);

  return Math.max(1, diff);
}

// ── Date-key helpers ────────────────────────────────────────────────────
// The booking flow works in separate "YYYY-MM-DD" + "HH:mm" fields (what
// <input type="date"> and a time select produce), always meaning Mauritius
// local time regardless of the visitor's own timezone.

/** Mauritius is UTC+4 year-round (no daylight saving), so the offset is fixed. */
const MAURITIUS_OFFSET = "+04:00";

/** "2026-09-28" + "10:00" -> "2026-09-28T10:00:00+04:00" */
export function mauritiusDateTime(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00${MAURITIUS_OFFSET}`;
}

/** The Mauritius calendar date of an instant, as "YYYY-MM-DD". */
export function toDateKey(date: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MAURITIUS_TZ }).format(new Date(date));
}

/** The Mauritius wall-clock time of an instant, as "HH:mm". */
export function toTimeKey(date: Date | string): string {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MAURITIUS_TZ,
  });
}

/** "2026-09-28" + 3 -> "2026-10-01" (pure calendar arithmetic, no timezone involved). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "Mon 28 Sep 2026, 10:00" — for the booking summary, where the weekday helps. */
export function formatDateTimeLong(date: Date | string): string {
  const d = new Date(date);
  const weekday = d.toLocaleDateString("en-GB", { weekday: "short", timeZone: MAURITIUS_TZ });
  return `${weekday} ${formatDateTime(d)}`;
}
