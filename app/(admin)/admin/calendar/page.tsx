import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addDaysToDateKey, daysBetween, toDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Calendar" };

const VISIBLE_DAYS = 14;
const DAY_WIDTH = 48;
const VEHICLE_COL_WIDTH = 200;

type BookingBlock = {
  id: string;
  reference: string;
  status: string;
  pickup_at: string;
  return_at: string;
  customerName: string;
};

type VehicleRow = {
  id: string;
  code: string;
  status: string;
  categoryName: string;
  locationName: string;
  bookings: BookingBlock[];
};

const STATUS_BLOCK_CLASS: Record<string, string> = {
  confirmed: "bg-info text-white",
  active: "bg-primary text-white",
  completed: "bg-text-muted text-white",
};

function mauritiusMidnight(daysFromToday: number): Date {
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Indian/Mauritius" }).format(new Date());
  const d = new Date(`${localDate}T00:00:00+04:00`);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d;
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const rangeStart = mauritiusMidnight(0);
  const rangeEnd = mauritiusMidnight(VISIBLE_DAYS);

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, code, status, category:vehicle_categories(name), location:locations(name, display_order)")
    .order("code", { ascending: true });
  if (vehiclesError) throw vehiclesError;

  const vehicleIds = (vehicles ?? []).map((v) => v.id);

  const { data: bookings, error: bookingsError } =
    vehicleIds.length > 0
      ? await supabase
          .from("bookings")
          .select("id, reference, status, pickup_at, return_at, vehicle_id, customer:customers(first_name, last_name)")
          .in("vehicle_id", vehicleIds)
          .in("status", ["confirmed", "active", "completed"])
          .lt("pickup_at", rangeEnd.toISOString())
          .gt("return_at", rangeStart.toISOString())
      : { data: [], error: null };
  if (bookingsError) throw bookingsError;

  type VehicleJoined = {
    id: string;
    code: string;
    status: string;
    category: { name: string } | null;
    location: { name: string; display_order: number } | null;
  };
  type BookingJoined = {
    id: string;
    reference: string;
    status: string;
    pickup_at: string;
    return_at: string;
    vehicle_id: string | null;
    customer: { first_name: string; last_name: string } | null;
  };

  const bookingsByVehicle = new Map<string, BookingBlock[]>();
  for (const b of (bookings ?? []) as unknown as BookingJoined[]) {
    if (!b.vehicle_id) continue;
    const list = bookingsByVehicle.get(b.vehicle_id) ?? [];
    list.push({
      id: b.id,
      reference: b.reference,
      status: b.status,
      pickup_at: b.pickup_at,
      return_at: b.return_at,
      customerName: b.customer ? `${b.customer.first_name} ${b.customer.last_name}` : "Unknown",
    });
    bookingsByVehicle.set(b.vehicle_id, list);
  }

  const rows: VehicleRow[] = ((vehicles ?? []) as unknown as VehicleJoined[])
    .map((v) => ({
      id: v.id,
      code: v.code,
      status: v.status,
      categoryName: v.category?.name ?? "",
      locationName: v.location?.name ?? "",
      locationOrder: v.location?.display_order ?? 0,
      bookings: bookingsByVehicle.get(v.id) ?? [],
    }))
    .sort((a, b) => a.locationOrder - b.locationOrder || a.code.localeCompare(b.code));

  const dayHeaders = Array.from({ length: VISIBLE_DAYS }, (_, i) => {
    const d = mauritiusMidnight(i);
    return {
      dayNum: d.getUTCDate(),
      weekday: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      isToday: i === 0,
      dateKey: addDaysToDateKey(toDateKey(), i),
    };
  });

  const gridTemplateColumns = `${VEHICLE_COL_WIDTH}px repeat(${VISIBLE_DAYS}, ${DAY_WIDTH}px)`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-text">Fleet Calendar</h2>
        <p className="text-sm text-text-muted">Next {VISIBLE_DAYS} days &middot; {rows.length} vehicles</p>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-admin-border bg-admin-surface">
        <div className="grid" style={{ gridTemplateColumns, minWidth: VEHICLE_COL_WIDTH + VISIBLE_DAYS * DAY_WIDTH }}>
          {/* Header row */}
          <div className="sticky left-0 z-20 flex items-end border-b border-r border-admin-border bg-admin-surface px-3 pb-2 text-xs font-medium text-text-muted">
            Vehicle
          </div>
          {dayHeaders.map((d, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-end border-b border-admin-border pb-2 text-xs",
                d.isToday && "bg-accent/10",
              )}
            >
              <span className="text-text-muted">{d.weekday}</span>
              <span className={cn("font-semibold", d.isToday ? "text-accent-hover" : "text-text")}>{d.dayNum}</span>
            </div>
          ))}

          {/* Vehicle rows. Header occupies grid row 1, so vehicle i sits on row i+2 —
              booking blocks need that row set explicitly, otherwise CSS Grid's
              auto-placement pushes them past the (already-filled) day cells into
              a later row instead of overlaying their own row. */}
          {rows.map((row, rowIndex) => {
            const gridRow = rowIndex + 2;
            // Clamp each booking's span to the visible [0, VISIBLE_DAYS] window —
            // a booking that started before today or ends after the visible
            // range still renders, just cut off at the edge.
            const blocks = row.bookings
              .map((booking) => {
                const startDay =
                  new Date(booking.pickup_at).getTime() <= rangeStart.getTime()
                    ? 0
                    : daysBetween(rangeStart, booking.pickup_at);
                const endDay = Math.min(VISIBLE_DAYS, daysBetween(rangeStart, booking.return_at));
                return { booking, startDay, endDay };
              })
              .filter(({ startDay, endDay }) => endDay > startDay);

            return (
              <Fragment key={row.id}>
                <div
                  className="sticky left-0 z-10 flex flex-col justify-center border-b border-r border-admin-border bg-admin-surface px-3 py-2"
                  style={{ gridRow, gridColumn: 1 }}
                >
                  <span className="font-mono text-sm font-semibold text-text">{row.code}</span>
                  <span className="text-xs text-text-muted">{row.categoryName}</span>
                </div>

                {dayHeaders.map((d, dayIndex) => {
                  const cellClass = cn(
                    "relative border-b border-admin-border",
                    d.isToday && "bg-accent/5",
                    row.status === "maintenance" &&
                      "bg-[repeating-linear-gradient(45deg,rgba(201,122,14,0.12),rgba(201,122,14,0.12)_6px,transparent_6px,transparent_12px)]",
                  );
                  const style = { gridRow, gridColumn: 2 + dayIndex };
                  // An empty day on a bookable car starts a new booking for
                  // that car and date. Booking blocks sit on top (z-[5]).
                  return row.status === "maintenance" || row.status === "inactive" ? (
                    <div key={`${row.id}-cell-${dayIndex}`} className={cellClass} style={style} />
                  ) : (
                    <Link
                      key={`${row.id}-cell-${dayIndex}`}
                      href={`/admin/bookings/new?vehicle=${row.id}&from=${d.dateKey}`}
                      aria-label={`New booking for ${row.code} from ${d.weekday} ${d.dayNum}`}
                      className={cn(cellClass, "hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-none")}
                      style={style}
                    />
                  );
                })}

                {blocks.map(({ booking, startDay, endDay }) => (
                  <Link
                    key={booking.id}
                    href={`/admin/bookings/${booking.reference}`}
                    title={`${booking.customerName} — ${booking.reference}`}
                    className={cn(
                      "z-[5] my-1.5 flex items-center overflow-hidden rounded-[var(--radius-sm)] px-2 text-xs font-medium shadow-sm transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      STATUS_BLOCK_CLASS[booking.status] ?? "bg-text-muted text-white",
                    )}
                    style={{
                      gridRow,
                      gridColumn: `${2 + startDay} / ${2 + endDay}`,
                      height: "1.75rem",
                    }}
                  >
                    <span className="truncate">
                      {booking.customerName.split(" ")[0]} &middot; {booking.reference.slice(-3)}
                    </span>
                  </Link>
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-info" /> Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-primary" /> Active</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-text-muted" /> Completed</span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-warning/20 [background-image:repeating-linear-gradient(45deg,rgba(201,122,14,0.4),rgba(201,122,14,0.4)_3px,transparent_3px,transparent_6px)]" />
          Maintenance
        </span>
      </div>
    </div>
  );
}
