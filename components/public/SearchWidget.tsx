"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { addDaysToDateKey, toDateKey } from "@/lib/format";

// Dates are Mauritius calendar dates — toISOString() would give the UTC
// date, which is still "yesterday" in Mauritius between midnight and 04:00.
function defaultPickup(): string {
  return addDaysToDateKey(toDateKey(), 1);
}

function defaultReturn(pickup: string): string {
  return addDaysToDateKey(pickup, 5);
}

export function SearchWidget({
  locations,
  className,
}: {
  locations: { slug: string; name: string }[];
  className?: string;
}) {
  const router = useRouter();
  const [location, setLocation] = useState(locations[0]?.slug ?? "");
  const [pickup, setPickup] = useState(defaultPickup());
  const [ret, setRet] = useState(defaultReturn(defaultPickup()));
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (new Date(ret) <= new Date(pickup)) {
      setError("Return date must be after the pickup date.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({ location, from: pickup, to: ret });
    router.push(`/cars?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "grid grid-cols-1 gap-4 rounded-[var(--radius-lg)] bg-surface p-5 shadow-[var(--shadow-lg)] sm:grid-cols-2 lg:grid-cols-4 lg:items-end",
        className,
      )}
    >
      <Select label="Pickup location" value={location} onChange={(e) => setLocation(e.target.value)}>
        {locations.map((loc) => (
          <option key={loc.slug} value={loc.slug}>
            {loc.name}
          </option>
        ))}
      </Select>

      <Input
        label="Pickup date"
        type="date"
        value={pickup}
        min={toDateKey()}
        onChange={(e) => {
          setPickup(e.target.value);
          if (new Date(ret) <= new Date(e.target.value)) setRet(defaultReturn(e.target.value));
        }}
      />

      <Input label="Return date" type="date" value={ret} min={pickup} onChange={(e) => setRet(e.target.value)} />

      <Button type="submit" size="lg" className="w-full bg-accent text-text hover:bg-accent-hover">
        <Search className="h-4 w-4" aria-hidden="true" />
        Search available cars
      </Button>

      {error && <p className="col-span-full text-sm text-error">{error}</p>}
    </form>
  );
}
