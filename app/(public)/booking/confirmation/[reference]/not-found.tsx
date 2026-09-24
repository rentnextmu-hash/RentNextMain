import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export default function BookingNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={<SearchX className="h-10 w-10" strokeWidth={1.25} />}
        title="We couldn't find that booking"
        description="The link may be incomplete — use the full link from your confirmation email. If you've just booked and can't find it, contact us with your booking reference and we'll look it up."
        action={
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Back to the homepage
          </Link>
        }
      />
    </div>
  );
}
