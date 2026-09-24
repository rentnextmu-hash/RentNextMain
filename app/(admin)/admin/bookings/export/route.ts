import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getBookings } from "@/lib/queries/bookings";
import { getActiveLocations } from "@/lib/queries/locations";
import { formatDateTime, toDateKey } from "@/lib/format";
import { parseBookingListParams, toBookingFilters } from "@/components/admin/bookings/listParams";

// Middleware already bounces signed-out visitors from /admin/*; this also
// rejects signed-in users without an active staff profile.
export async function GET(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!staff?.is_active) return new NextResponse("Not authorised", { status: 401 });

  const params = parseBookingListParams(Object.fromEntries(request.nextUrl.searchParams));
  const supabase = await createClient();
  const locations = await getActiveLocations(supabase);
  const locationId = locations.find((l) => l.slug === params.location)?.id;
  const bookings = await getBookings(supabase, toBookingFilters(params, locationId));

  const header = [
    "Reference", "Status", "Source", "Customer", "Email", "Phone", "Country", "Category", "Vehicle",
    "Pickup", "Pickup location", "Return", "Return location", "Days", "Car total (MUR)",
    "Add-ons (MUR)", "Total (MUR)", "Created",
  ];
  const rows = bookings.map((b) => [
    b.reference, b.status, b.source, `${b.customer.first_name} ${b.customer.last_name}`, b.customer.email,
    b.customer.phone, b.customer.country ?? "", b.category.name, b.vehicle?.code ?? "",
    formatDateTime(b.pickup_at), b.pickup_location.name, formatDateTime(b.return_at), b.return_location.name,
    b.days, b.car_total_mur, b.addons_total_mur, b.total_mur, formatDateTime(b.created_at),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${toDateKey()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

// Quote every cell, and defuse spreadsheet formula injection: names and
// notes come from the public booking form, and a cell starting with = + -
// or @ would otherwise be executed by Excel.
function csvCell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
