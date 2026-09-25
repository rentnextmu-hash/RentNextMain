import { ImageResponse } from "next/og";

export const alt = "Rent Next Car Hire — car rental in Mauritius";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default social-share image for every page without its own. Brand colours
// from styles/tokens.css. No external fonts — the built-in fallback keeps
// the route dependency-free.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0e2436 0%, #0a1b29 100%)",
          padding: 72,
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#31cfc4",
              color: "#0e2436",
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            RN
          </div>
          <div style={{ fontSize: 30, fontWeight: 600 }}>Rent Next Car Hire</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.05 }}>Car rental in Mauritius</div>
          <div style={{ fontSize: 34, color: "#31cfc4" }}>Island-wide pickup · hotel delivery · clear prices</div>
        </div>
      </div>
    ),
    size,
  );
}
