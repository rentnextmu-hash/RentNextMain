import type { ReactElement } from "react";
import { siteUrl } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const NAVY_GRADIENT = "linear-gradient(135deg, #0e2436 0%, #0a1b29 100%)";

/** The shared brand frame for OG images: logo mark + wordmark, then a title block, optional right-hand art. */
export function ogFrame(opts: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  art?: ReactElement;
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: NAVY_GRADIENT,
        color: "#ffffff",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#31cfc4",
              color: "#0e2436",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            RN
          </div>
          <div style={{ fontSize: 26, fontWeight: 600 }}>Rent Next Car Hire</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {opts.eyebrow && (
            <div style={{ fontSize: 26, color: "#31cfc4", textTransform: "uppercase", letterSpacing: 2 }}>
              {opts.eyebrow}
            </div>
          )}
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}>{opts.title}</div>
          {opts.subtitle && <div style={{ fontSize: 32, color: "#c9d4e0" }}>{opts.subtitle}</div>}
        </div>
      </div>
      {opts.art && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 420 }}>{opts.art}</div>}
    </div>
  );
}

/**
 * A car photo (from public/, e.g. "/cars/toyota-vitz.png") as a data URI
 * for embedding in an OG image, or null if it can't be loaded. Reads the
 * file from disk first, then falls back to fetching it over HTTP — between
 * them one works whether the public asset is in the function's filesystem
 * or only on the CDN.
 */
export async function loadCarImageDataUri(imagePath: string | null): Promise<string | null> {
  if (!imagePath || !imagePath.startsWith("/")) return null;
  const ext = imagePath.split(".").pop()?.toLowerCase();
  const mime = ext === "webp" ? "image/webp" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";

  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const buffer = await readFile(join(process.cwd(), "public", imagePath));
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    // Not on the local filesystem — try the CDN.
  }
  try {
    const res = await fetch(new URL(imagePath, siteUrl()));
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return `data:${res.headers.get("content-type") ?? mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
