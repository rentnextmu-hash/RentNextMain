"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CarLoader } from "@/components/public/CarLoader";
import {
  RANGE_PRESETS,
  SORTS,
  SOURCES,
  bookingListHref,
  type BookingListParams,
} from "@/components/admin/bookings/listParams";

/**
 * Filter bar for /admin/bookings. Every change becomes a URL, so filters
 * are shareable and the back button works; the server re-renders the
 * list. Any filter change resets to page 1.
 */
export function BookingFilters({
  params,
  locations,
}: {
  params: BookingListParams;
  locations: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.q);
  const lastPushedQ = useRef(params.q);

  const go = (overrides: Partial<BookingListParams>) =>
    startTransition(() => router.push(bookingListHref(params, { ...overrides, page: 1 })));

  // Debounced search.
  useEffect(() => {
    if (q === lastPushedQ.current) return;
    const timer = setTimeout(() => {
      lastPushedQ.current = q;
      startTransition(() => router.push(bookingListHref(params, { q, page: 1 })));
    }, 350);
    return () => clearTimeout(timer);
  }, [q, params, router]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-64">
        <Input
          aria-label="Search bookings"
          placeholder="Reference, name, email, phone"
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="w-36">
        <Select aria-label="Date range" value={params.range} onChange={(e) => go({ range: e.target.value as BookingListParams["range"] })}>
          {RANGE_PRESETS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      {params.range === "custom" && (
        <>
          <div className="w-40">
            <Input aria-label="From date" type="date" value={params.from} onChange={(e) => go({ from: e.target.value })} />
          </div>
          <div className="w-40">
            <Input aria-label="To date" type="date" value={params.to} min={params.from} onChange={(e) => go({ to: e.target.value })} />
          </div>
        </>
      )}
      <div className="w-44">
        <Select aria-label="Pickup location" value={params.location} onChange={(e) => go({ location: e.target.value })}>
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-36">
        <Select aria-label="Source" value={params.source} onChange={(e) => go({ source: e.target.value as BookingListParams["source"] })}>
          <option value="">All sources</option>
          {SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="w-48">
        <Select aria-label="Sort" value={params.sort} onChange={(e) => go({ sort: e.target.value as BookingListParams["sort"] })}>
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      {pending && <CarLoader size="sm" className="mb-3" />}
    </div>
  );
}
