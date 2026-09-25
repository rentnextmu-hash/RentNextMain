import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

export type LocationCardData = {
  name: string;
  region: string | null;
  vehicleCount?: number;
  imagePath?: string | null;
  /** The location page; the whole card links there when given. */
  href?: string;
};

export function LocationCard({ location, className }: { location: LocationCardData; className?: string }) {
  const classes = cn(
    "block overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-sm transition-shadow hover:shadow-md",
    location.href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    className,
  );
  const body = (
    <>
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10">
        {location.imagePath ? (
          <Image src={location.imagePath} alt="" fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
        ) : (
          <MapPin className="h-10 w-10 text-primary/40" strokeWidth={1.25} aria-hidden="true" />
        )}
      </div>
      <div className="p-4">
        <p className="font-[family-name:var(--font-heading)] text-base font-semibold text-text">{location.name}</p>
        {location.region && <p className="text-sm text-text-muted">{location.region}</p>}
        {typeof location.vehicleCount === "number" && (
          <p className="mt-2 text-sm text-text-muted">
            {location.vehicleCount} car{location.vehicleCount === 1 ? "" : "s"} based here
          </p>
        )}
        {location.href && <p className="mt-3 text-sm font-medium text-primary">View location →</p>}
      </div>
    </>
  );
  return location.href ? (
    <Link href={location.href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
