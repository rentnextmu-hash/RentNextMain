import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

export const IMAGE_BUCKETS = { vehicles: "vehicles", locations: "locations" } as const;
export type ImageBucket = (typeof IMAGE_BUCKETS)[keyof typeof IMAGE_BUCKETS];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB, matches the bucket limit
const MAX_DIMENSION = 1600; // longest edge after resize
const WEBP_QUALITY = 0.85;

/**
 * Downscale an image to at most MAX_DIMENSION on its longest edge and
 * re-encode as WebP, in the browser via a canvas. Keeps uploads small and
 * consistent regardless of what the staff member drops in. Returns the
 * WebP Blob (or throws with a friendly message).
 */
export async function resizeImageToWebP(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't an image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("That image is over 5 MB. Please use a smaller file.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("We couldn't read that image. Try a JPEG, PNG or WebP.");
  });
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
  if (!blob) throw new Error("We couldn't convert that image. Try another file.");
  return blob;
}

/**
 * Resize + upload an image to a public bucket and return its public URL,
 * ready to store in image_path. A unique filename avoids CDN caching an old
 * image under a reused name. Runs as the signed-in staff member (bucket
 * write is is_staff() only).
 */
export async function uploadImage(supabase: Client, bucket: ImageBucket, file: File): Promise<string> {
  const webp = await resizeImageToWebP(file);
  const path = `${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, webp, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message || "The upload failed. Please try again.");
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
