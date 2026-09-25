import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getCategoryBySlug } from "@/lib/queries/categories";
import { formatMUR } from "@/lib/format";
import { OG_CONTENT_TYPE, OG_SIZE, loadCarImageDataUri, ogFrame } from "@/lib/og";

export const alt = "Car rental in Mauritius";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function CarOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const car = await getCategoryBySlug(createPublicClient(), slug);
  if (!car) {
    return new ImageResponse(ogFrame({ title: "Car rental in Mauritius" }), size);
  }
  const from = formatMUR(Math.min(car.rate_1_2_mur, car.rate_3_5_mur, car.rate_6_plus_mur));
  const photo = await loadCarImageDataUri(car.image_path);

  return new ImageResponse(
    ogFrame({
      eyebrow: "Rent in Mauritius",
      title: car.name,
      subtitle: `from ${from} / day`,
      art: photo ? (
        <img src={photo} alt="" width={400} height={260} style={{ objectFit: "contain" }} />
      ) : undefined,
    }),
    size,
  );
}
