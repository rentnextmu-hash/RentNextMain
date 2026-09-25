import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveCategories } from "@/lib/queries/categories";
import { getLocationBySlug } from "@/lib/queries/locations";
import { lowestDailyRate } from "@/lib/pricing";
import { formatMUR } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, ogFrame } from "@/lib/og";

export const alt = "Car rental location in Mauritius";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function LocationOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const [location, categories] = await Promise.all([getLocationBySlug(supabase, slug), getActiveCategories(supabase)]);
  if (!location) {
    return new ImageResponse(ogFrame({ title: "Car rental in Mauritius" }), size);
  }
  const from = lowestDailyRate(
    categories.map((c) => ({ rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur })),
  );
  const preposition = location.type === "airport" ? "at" : "in";

  return new ImageResponse(
    ogFrame({
      eyebrow: "Pickup location",
      title: `Car Rental ${preposition} ${location.name}`,
      subtitle: from ? `${location.region ?? "Mauritius"} · from ${formatMUR(from)} / day` : (location.region ?? "Mauritius"),
    }),
    size,
  );
}
