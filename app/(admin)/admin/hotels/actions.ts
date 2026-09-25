"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireRole } from "@/lib/auth";
import { hotelFormSchema, type HotelFormValues } from "@/lib/validation";

export type HotelActionResult =
  | { ok: true; message: string; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const EDITORS = ["owner", "manager"] as const;

/** Create (hotelId null) or update a hotel partner. */
export async function saveHotelAction(hotelId: string | null, values: HotelFormValues): Promise<HotelActionResult> {
  try {
    await requireRole([...EDITORS]);
    const parsed = hotelFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }
    const v = parsed.data;
    const supabase = await createClient();

    const { data: clash, error: clashError } = await supabase
      .from("hotels")
      .select("id")
      .eq("slug", v.slug)
      .neq("id", hotelId ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (clashError) throw clashError;
    if (clash) return { ok: false, error: "Check the highlighted fields.", fieldErrors: { slug: `${v.slug} is already used by another hotel.` } };

    const row = {
      name: v.name,
      slug: v.slug,
      location_id: v.locationId,
      contact_name: v.contactName,
      contact_email: v.contactEmail,
      contact_phone: v.contactPhone,
      contract_status: v.contractStatus,
      contract_start_date: v.contractStartDate,
      commission_rate: v.commissionRate,
      pickup_notes: v.pickupNotes,
      is_active: v.isActive,
    };

    // Location pages list nearby partner hotels, so refresh the old and new location.
    const affectedLocations = new Set<string>();
    if (hotelId) {
      const { data: before, error } = await supabase.from("hotels").select("slug, location:locations(slug)").eq("id", hotelId).single();
      if (error) throw error;
      const loc = before.location as { slug: string } | null;
      if (loc) affectedLocations.add(loc.slug);
      const { error: updateError } = await supabase.from("hotels").update(row).eq("id", hotelId);
      if (updateError) throw updateError;
      revalidatePath(`/admin/hotels/${before.slug}`);
    } else {
      const { error } = await supabase.from("hotels").insert(row);
      if (error?.code === "23505") return { ok: false, error: `${v.slug} was just taken. Choose another.` };
      if (error) throw error;
    }
    if (v.locationId) {
      const { data: loc } = await supabase.from("locations").select("slug").eq("id", v.locationId).maybeSingle();
      if (loc) affectedLocations.add(loc.slug);
    }

    revalidatePath("/admin/hotels");
    revalidatePath(`/admin/hotels/${v.slug}`);
    for (const slug of affectedLocations) {
      revalidatePath(`/locations/${slug}`);
      revalidatePath(`/admin/locations/${slug}`);
    }
    return { ok: true, slug: v.slug, message: hotelId ? `${v.name} saved` : `${v.name} added` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong saving the hotel. Please try again." };
  }
}
