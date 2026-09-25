import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Staff area, per-visitor booking state and search results aren't content.
      disallow: ["/admin", "/login", "/auth", "/booking", "/search"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
