import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BookingStatus } from "@/types/enums";

type Client = SupabaseClient<Database>;

// Revenue counts bookings the business has actually committed to — not
// unconfirmed requests, not cancellations.
const REVENUE_STATUSES: BookingStatus[] = ["confirmed", "active", "completed"];

export type NamedCount = { label: string; count: number; revenueMur: number };
export type MonthPoint = { key: string; label: string; count: number; revenueMur: number };

export type ReportsSummary = {
  totalBookings: number; // non-cancelled
  bookedRevenueMur: number; // confirmed + active + completed
  activeRentals: number;
  upcomingPickups: number; // confirmed, pickup in the future
  avgBookingValueMur: number;
  fleet: { available: number; booked: number; maintenance: number; inactive: number; total: number };
  byMonth: MonthPoint[]; // last 6 months by pickup date
  bySource: NamedCount[];
  byStatus: { status: BookingStatus; count: number }[];
  topCategories: NamedCount[]; // by revenue, desc
  byLocation: NamedCount[]; // pickups by pickup location, by revenue desc
};

const MU_TZ = "Indian/Mauritius";

// year-month key (e.g. "2026-09") for a timestamp, in Mauritius time.
function monthKey(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: MU_TZ, year: "numeric", month: "2-digit" }).format(
    new Date(iso),
  );
  return parts; // en-CA gives YYYY-MM-DD…; take YYYY-MM
}

function last6MonthKeys(now = new Date()): { key: string; label: string }[] {
  const fmtKey = new Intl.DateTimeFormat("en-CA", { timeZone: MU_TZ, year: "numeric", month: "2-digit" });
  const fmtLabel = new Intl.DateTimeFormat("en-GB", { timeZone: MU_TZ, month: "short", year: "2-digit" });
  const out: { key: string; label: string }[] = [];
  // Walk back from this month. Use UTC noon anchors to avoid TZ edge slips.
  const base = new Date(now);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() - i, 15, 12));
    // ICU 72+ (en-GB) renders September as "Sept"; the app uses "Sep" everywhere.
    out.push({ key: fmtKey.format(d).slice(0, 7), label: fmtLabel.format(d).replace("Sept", "Sep") });
  }
  return out;
}

/** All the figures the admin Reports page shows, aggregated in one pass. */
export async function getReportsSummary(supabase: Client): Promise<ReportsSummary> {
  const [{ data: bookings, error: bErr }, { data: categories, error: cErr }, { data: locations, error: lErr }, { data: vehicles, error: vErr }] =
    await Promise.all([
      supabase.from("bookings").select("status, source, total_mur, pickup_at, category_id, pickup_location_id"),
      supabase.from("vehicle_categories").select("id, name"),
      supabase.from("locations").select("id, name"),
      supabase.from("vehicles").select("status"),
    ]);
  if (bErr) throw bErr;
  if (cErr) throw cErr;
  if (lErr) throw lErr;
  if (vErr) throw vErr;

  const catName = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const locName = new Map((locations ?? []).map((l) => [l.id, l.name]));
  const rows = bookings ?? [];
  const now = new Date();
  const nowIso = now.toISOString();

  const isRevenue = (s: string) => REVENUE_STATUSES.includes(s as BookingStatus);

  let totalBookings = 0;
  let bookedRevenueMur = 0;
  let activeRentals = 0;
  let upcomingPickups = 0;

  const months = last6MonthKeys(now);
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  const byMonth: MonthPoint[] = months.map((m) => ({ key: m.key, label: m.label, count: 0, revenueMur: 0 }));

  const sourceMap = new Map<string, NamedCount>();
  const statusMap = new Map<BookingStatus, number>();
  const catMap = new Map<string, NamedCount>();
  const locMap = new Map<string, NamedCount>();

  for (const b of rows) {
    const status = b.status as BookingStatus;
    statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
    if (status === "cancelled") continue;

    totalBookings += 1;
    const rev = isRevenue(status) ? b.total_mur : 0;
    bookedRevenueMur += rev;
    if (status === "active") activeRentals += 1;
    if (status === "confirmed" && b.pickup_at > nowIso) upcomingPickups += 1;

    const mk = monthKey(b.pickup_at).slice(0, 7);
    const mi = monthIndex.get(mk);
    if (mi !== undefined) {
      byMonth[mi].count += 1;
      byMonth[mi].revenueMur += rev;
    }

    const srcLabel = SOURCE_LABEL[b.source] ?? b.source;
    const src = sourceMap.get(b.source) ?? { label: srcLabel, count: 0, revenueMur: 0 };
    src.count += 1;
    src.revenueMur += rev;
    sourceMap.set(b.source, src);

    const cn = catName.get(b.category_id) ?? "Unknown";
    const cat = catMap.get(b.category_id) ?? { label: cn, count: 0, revenueMur: 0 };
    cat.count += 1;
    cat.revenueMur += rev;
    catMap.set(b.category_id, cat);

    const ln = locName.get(b.pickup_location_id) ?? "Unknown";
    const loc = locMap.get(b.pickup_location_id) ?? { label: ln, count: 0, revenueMur: 0 };
    loc.count += 1;
    loc.revenueMur += rev;
    locMap.set(b.pickup_location_id, loc);
  }

  const fleet = { available: 0, booked: 0, maintenance: 0, inactive: 0, total: 0 };
  for (const v of vehicles ?? []) {
    fleet.total += 1;
    if (v.status in fleet) (fleet as Record<string, number>)[v.status] += 1;
  }

  const byRevenueDesc = (a: NamedCount, b: NamedCount) => b.revenueMur - a.revenueMur || b.count - a.count;

  return {
    totalBookings,
    bookedRevenueMur,
    activeRentals,
    upcomingPickups,
    avgBookingValueMur: totalBookings > 0 ? Math.round(bookedRevenueMur / totalBookings) : 0,
    fleet,
    byMonth,
    bySource: Array.from(sourceMap.values()).sort(byRevenueDesc),
    byStatus: (["requested", "confirmed", "active", "completed", "cancelled"] as BookingStatus[]).map((status) => ({
      status,
      count: statusMap.get(status) ?? 0,
    })),
    topCategories: Array.from(catMap.values()).sort(byRevenueDesc).slice(0, 8),
    byLocation: Array.from(locMap.values()).sort(byRevenueDesc),
  };
}

const SOURCE_LABEL: Record<string, string> = {
  website: "Website",
  phone: "Phone",
  hotel: "Hotel",
  walk_in: "Walk-in",
};
