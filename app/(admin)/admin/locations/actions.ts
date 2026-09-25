"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { AuthError, requireRole } from "@/lib/auth";
import { locationFormSchema, type LocationFormValues } from "@/lib/validation";

export type LocationActionResult =
  | { ok: true; message: string; slug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const EDITORS = ["owner", "manager"] as const;

// Editing a location changes public pages, which are statically generated —
// revalidate them so the change shows on the website immediately.
function revalidateLocation(...slugs: string[]) {
  revalidatePath("/admin/locations");
  for (const slug of new Set(slugs)) {
    revalidatePath(`/admin/locations/${slug}`);
    revalidatePath(`/locations/${slug}`);
  }
  revalidatePath("/locations");
  revalidatePath("/contact");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
}

function fail(err: unknown): LocationActionResult {
  if (err instanceof AuthError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong saving the location. Please try again." };
}

/** Create (locationId null) or update a location. */
export async function saveLocationAction(locationId: string | null, values: LocationFormValues): Promise<LocationActionResult> {
  try {
    await requireRole([...EDITORS]);
    const parsed = locationFormSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: "Check the highlighted fields.", fieldErrors };
    }
    const v = parsed.data;
    const supabase = await createClient();

    const { data: clash, error: clashError } = await supabase
      .from("locations")
      .select("id")
      .eq("slug", v.slug)
      .neq("id", locationId ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (clashError) throw clashError;
    if (clash) return { ok: false, error: "Check the highlighted fields.", fieldErrors: { slug: `/${v.slug} is already used by another location.` } };

    const row = {
      name: v.name,
      slug: v.slug,
      type: v.type,
      region: v.region,
      address: v.address,
      latitude: v.latitude,
      longitude: v.longitude,
      is_pickup_point: v.isPickupPoint,
      is_active: v.isActive,
      opening_hours: v.openingHours,
      seo_title: v.seoTitle,
      seo_description: v.seoDescription,
      intro_content: v.introContent,
      drive_times: v.driveTimes,
      faqs: v.faqs,
    };

    if (locationId) {
      const { data: before, error: beforeError } = await supabase.from("locations").select("slug").eq("id", locationId).single();
      if (beforeError) throw beforeError;
      const { error } = await supabase.from("locations").update(row).eq("id", locationId);
      if (error) throw error;
      revalidateLocation(before.slug, v.slug);
      return { ok: true, slug: v.slug, message: `${v.name} saved` };
    }

    // New locations go to the end of the display order.
    const { data: last, error: lastError } = await supabase
      .from("locations")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const { error } = await supabase.from("locations").insert({ ...row, display_order: (last?.display_order ?? 0) + 1 });
    if (error?.code === "23505") return { ok: false, error: `/${v.slug} was just taken. Choose another.` };
    if (error) throw error;
    revalidateLocation(v.slug);
    return { ok: true, slug: v.slug, message: `${v.name} added` };
  } catch (err) {
    return fail(err);
  }
}

/** Saves a new display order: the ids in the order they should appear. */
export async function reorderLocationsAction(orderedIds: string[]): Promise<LocationActionResult> {
  try {
    await requireRole([...EDITORS]);
    const ids = z.array(z.guid()).max(100).parse(orderedIds);
    const supabase = await createClient();
    const results = await Promise.all(
      ids.map((id, i) => supabase.from("locations").update({ display_order: i + 1 }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
    revalidateLocation();
    return { ok: true, slug: "", message: "New order saved" };
  } catch (err) {
    return fail(err);
  }
}
