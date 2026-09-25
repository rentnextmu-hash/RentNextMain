import type { NextConfig } from "next";

// Supabase Storage host, derived from the project URL, so next/image can
// load uploaded category/location photos (public buckets). Falls back to a
// permissive supabase.co pattern if the env var isn't set at build time.
function supabaseImageHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: supabaseImageHost(), pathname: "/storage/v1/object/public/**" },
      // Local Storage during development (scripts/local-stack gateway).
      { protocol: "http", hostname: "localhost", port: "3100", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
