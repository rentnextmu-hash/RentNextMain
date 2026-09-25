"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireRole } from "@/lib/auth";
import { getAvailableVehicles, isVehicleAvailable, type AvailableVehicle } from "@/lib/availability";
import { calculateAddOnTotal, calculateBookingTotal, calculateRentalDays, type AddOnLine } from "@/lib/pricing";
import { searchCustomers, type CustomerMatch } from "@/lib/queries/customers";
import { staffBookingSchema, type StaffBookingRequest } from "@/lib/validation";
import type { AddOnPriceType } from "@/types/enums";

// Any active staff member can take a booking; owner/manager aren't required.
const ANY_STAFF = ["owner", "manager", "staff"] as const;

export async function searchCustomersAction(query: string): Promise<CustomerMatch[]> {
  await requireRole([...ANY_STAFF]);
  return searchCustomers(await createClient(), query);
}

/** The live vehicle list for the chosen category and period (lib/availability.ts). */
export async function availableVehiclesAction(params: {
  categoryId: string;
  from: string;
  to: string;
  preferLocationId: string;
}): Promise<AvailableVehicle[]> {
  await requireRole([...ANY_STAFF]);
  if (new Date(params.to) <= new Date(params.from)) return [];
  return getAvailableVehicles(await createClient(), params);
}

export type StaffBookingResult =
  | { ok: true; reference: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createStaffBookingAction(payload: StaffBookingRequest): Promise<StaffBookingResult> {
  try {
    const staff = await requireRole([...ANY_STAFF]);
    const parsed = staffBookingSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }
    const req = parsed.data;
    const supabase = await createClient();

    const [{ data: category, error: categoryError }, { data: addOns, error: addOnsError }] = await Promise.all([
      supabase
        .from("vehicle_categories")
        .select("id, name, rate_1_2_mur, rate_3_5_mur, rate_6_plus_mur")
        .eq("id", req.categoryId)
        .maybeSingle(),
      supabase.from("add_ons").select("id, price_mur, price_type, max_quantity").eq("is_active", true),
    ]);
    if (categoryError) throw categoryError;
    if (addOnsError) throw addOnsError;
    if (!category) return { ok: false, error: "That category no longer exists." };

    // The chosen car must be of this category and genuinely free.
    if (req.vehicleId) {
      const { data: vehicle, error } = await supabase
        .from("vehicles")
        .select("category_id, code")
        .eq("id", req.vehicleId)
        .maybeSingle();
      if (error) throw error;
      if (!vehicle || vehicle.category_id !== req.categoryId) {
        return { ok: false, error: "That vehicle isn't in the chosen category.", fieldErrors: { vehicleId: "Pick again." } };
      }
      if (!(await isVehicleAvailable(supabase, req.vehicleId, req.pickupAt, req.returnAt))) {
        return {
          ok: false,
          error: `${vehicle.code} was just booked for an overlapping period.`,
          fieldErrors: { vehicleId: "No longer free — pick another car." },
        };
      }
    }

    // Prices from database rates via lib/pricing.ts — the same functions the
    // website and the create-booking Edge Function use.
    const addOnsById = new Map((addOns ?? []).map((a) => [a.id, a]));
    const lines: AddOnLine[] = [];
    const rows: { add_on_id: string; quantity: number; unit_price_mur: number; total_mur: number }[] = [];
    const days = calculateRentalDays(req.pickupAt, req.returnAt);
    for (const { addOnId, quantity } of req.addOns) {
      const a = addOnsById.get(addOnId);
      if (!a) return { ok: false, error: "One of the extras is no longer available." };
      if (quantity > a.max_quantity) return { ok: false, error: `At most ${a.max_quantity} of one extra.` };
      const line: AddOnLine = { priceMur: a.price_mur, priceType: a.price_type as AddOnPriceType, quantity };
      lines.push(line);
      rows.push({ add_on_id: addOnId, quantity, unit_price_mur: a.price_mur, total_mur: calculateAddOnTotal([line], days) });
    }
    const totals = calculateBookingTotal({
      rates: {
        rate1To2Mur: category.rate_1_2_mur,
        rate3To5Mur: category.rate_3_5_mur,
        rate6PlusMur: category.rate_6_plus_mur,
      },
      pickupAt: req.pickupAt,
      returnAt: req.returnAt,
      addOns: lines,
    });
    const overridden = req.overrideTotalMur !== null && req.overrideTotalMur !== totals.totalMur;

    const nc = req.newCustomer;
    const { data: created, error: createError } = await supabase
      .rpc("create_staff_booking", {
        p_customer_id: req.customerId as string,
        p_new_customer: nc
          ? { first_name: nc.firstName, last_name: nc.lastName, email: nc.email, phone: nc.phone, country: nc.country }
          : {},
        p_category_id: req.categoryId,
        p_vehicle_id: req.vehicleId as string,
        p_pickup_location_id: req.pickupLocationId,
        p_return_location_id: req.returnLocationId,
        p_pickup_at: req.pickupAt,
        p_return_at: req.returnAt,
        p_days: totals.days,
        p_status: req.status,
        p_source: req.source,
        p_hotel_id: (req.source === "hotel" ? req.hotelId : null) as string,
        p_car_total_mur: totals.carTotalMur,
        p_addons_total_mur: totals.addonsTotalMur,
        p_total_mur: overridden ? req.overrideTotalMur! : totals.totalMur,
        p_original_total_mur: (overridden ? totals.totalMur : null) as number,
        p_price_override_reason: (overridden ? req.overrideReason : null) as string,
        p_internal_notes: req.notes,
        p_staff_id: staff.id,
        p_add_ons: rows,
      })
      .single();
    if (createError) throw createError;

    revalidatePath("/admin/bookings");
    revalidatePath("/admin/fleet");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin");
    return { ok: true, reference: created.reference };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    // 23P01 = the no-double-booking exclusion constraint fired between the
    // availability check above and the insert (another staff took the car).
    if (err && typeof err === "object" && "code" in err && err.code === "23P01") {
      return {
        ok: false,
        error: "That vehicle was just booked for an overlapping period. Pick another car or leave it unassigned.",
        fieldErrors: { vehicleId: "No longer free — pick another car." },
      };
    }
    console.error(err);
    return { ok: false, error: "Something went wrong creating the booking. Nothing was saved — please try again." };
  }
}
