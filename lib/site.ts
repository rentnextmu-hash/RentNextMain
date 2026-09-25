/**
 * The public site's origin, for canonical URLs, sitemap and JSON-LD.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel without it, the production domain
 * Vercel exposes at build time; locally, the dev server.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
