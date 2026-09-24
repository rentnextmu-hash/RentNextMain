// URL <-> filters for /admin/bookings, shared by the page and its CSV
// export so "Export" always downloads exactly what's on screen.
import { addDaysToDateKey, mauritiusDateTime, toDateKey } from "@/lib/format";
import type { BookingFilters, BookingSort } from "@/lib/queries/bookings";
import type { BookingSource, BookingStatus } from "@/types/enums";

export const RANGE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "next30", label: "Next 30 days" },
  { value: "all", label: "All" },
  { value: "custom", label: "Custom" },
] as const;

export type RangePreset = (typeof RANGE_PRESETS)[number]["value"];

export const STATUSES: BookingStatus[] = ["requested", "confirmed", "active", "completed", "cancelled"];
export const SOURCES: { value: BookingSource; label: string }[] = [
  { value: "website", label: "Website" },
  { value: "phone", label: "Phone" },
  { value: "hotel", label: "Hotel" },
  { value: "walk_in", label: "Walk-in" },
];
export const SORTS: { value: BookingSort; label: string }[] = [
  { value: "pickup_asc", label: "Pickup, soonest first" },
  { value: "pickup_desc", label: "Pickup, latest first" },
  { value: "created_desc", label: "Newest bookings" },
  { value: "total_desc", label: "Highest total" },
];

export type BookingListParams = {
  q: string;
  range: RangePreset;
  from: string;
  to: string;
  status: BookingStatus | "";
  location: string;
  source: BookingSource | "";
  sort: BookingSort;
  page: number;
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseBookingListParams(raw: RawSearchParams): BookingListParams {
  const range = RANGE_PRESETS.some((r) => r.value === one(raw.range)) ? (one(raw.range) as RangePreset) : "week";
  const status = STATUSES.includes(one(raw.status) as BookingStatus) ? (one(raw.status) as BookingStatus) : "";
  const source = SOURCES.some((s) => s.value === one(raw.source)) ? (one(raw.source) as BookingSource) : "";
  const sort = SORTS.some((s) => s.value === one(raw.sort)) ? (one(raw.sort) as BookingSort) : "pickup_asc";
  const page = Math.max(1, Number.parseInt(one(raw.page), 10) || 1);
  return {
    q: one(raw.q).trim().slice(0, 100),
    range,
    from: DATE_KEY.test(one(raw.from)) ? one(raw.from) : "",
    to: DATE_KEY.test(one(raw.to)) ? one(raw.to) : "",
    status,
    location: one(raw.location),
    source,
    sort,
    page,
  };
}

/** The [from, to) window a preset means, in Mauritius calendar days. */
export function rangeWindow(params: BookingListParams): { from?: string; to?: string } {
  const today = toDateKey();
  const start = (key: string) => mauritiusDateTime(key, "00:00");

  switch (params.range) {
    case "today":
      return { from: start(today), to: start(addDaysToDateKey(today, 1)) };
    case "week": {
      // Monday-start week. getUTCDay on the date key is timezone-free.
      const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
      const monday = addDaysToDateKey(today, -weekday);
      return { from: start(monday), to: start(addDaysToDateKey(monday, 7)) };
    }
    case "month": {
      const first = `${today.slice(0, 7)}-01`;
      const [y, m] = today.split("-").map(Number);
      const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      return { from: start(first), to: start(next) };
    }
    case "next30":
      return { from: start(today), to: start(addDaysToDateKey(today, 30)) };
    case "custom":
      return {
        from: params.from ? start(params.from) : undefined,
        to: params.to ? start(addDaysToDateKey(params.to, 1)) : undefined,
      };
    case "all":
      return {};
  }
}

/** Filters for lib/queries/bookings.ts. locationId is resolved from the slug by the caller. */
export function toBookingFilters(params: BookingListParams, locationId?: string): BookingFilters {
  return {
    ...rangeWindow(params),
    status: params.status || undefined,
    source: params.source || undefined,
    locationId,
    search: params.q || undefined,
  };
}

/** Builds a /admin/bookings URL from the current params plus overrides; defaults are left out. */
export function bookingListHref(params: BookingListParams, overrides: Partial<BookingListParams> = {}): string {
  const next = { ...params, ...overrides };
  const qs = new URLSearchParams();
  if (next.q) qs.set("q", next.q);
  if (next.range !== "week") qs.set("range", next.range);
  if (next.range === "custom" && next.from) qs.set("from", next.from);
  if (next.range === "custom" && next.to) qs.set("to", next.to);
  if (next.status) qs.set("status", next.status);
  if (next.location) qs.set("location", next.location);
  if (next.source) qs.set("source", next.source);
  if (next.sort !== "pickup_asc") qs.set("sort", next.sort);
  if (next.page > 1) qs.set("page", String(next.page));
  const query = qs.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}
