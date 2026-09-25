import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations } from "@/lib/queries/locations";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

/** The homepage, catalogue, every active car and every active location — the pages worth indexing. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createPublicClient();
  const [categories, locations] = await Promise.all([getActiveCategories(supabase), getActiveLocations(supabase)]);
  const base = siteUrl();

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cars`, changeFrequency: "weekly", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${base}/cars/${c.slug}`,
      lastModified: c.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    { url: `${base}/locations`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.5 },
    ...locations.map((l) => ({
      url: `${base}/locations/${l.slug}`,
      lastModified: l.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
