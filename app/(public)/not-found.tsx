import Link from "next/link";
import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Page not found | Rent Next Car Hire",
  robots: { index: false, follow: true },
};

export default function PublicNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20">
      <EmptyState
        icon={<SearchX className="h-10 w-10" strokeWidth={1.25} />}
        title="We couldn't find that page"
        description="The car or location may no longer be listed. Have a look at the whole fleet or our pickup locations instead."
        action={
          <div className="flex gap-4 text-sm font-medium">
            <Link href="/cars" className="text-primary hover:underline">
              See all cars
            </Link>
            <Link href="/locations" className="text-primary hover:underline">
              Pickup locations
            </Link>
          </div>
        }
      />
    </div>
  );
}
