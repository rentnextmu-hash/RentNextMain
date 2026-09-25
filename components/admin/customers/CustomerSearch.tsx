"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { CarLoader } from "@/components/public/CarLoader";

/** Debounced customer search; pushes ?q= so results are shareable and server-rendered. */
export function CustomerSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [pending, startTransition] = useTransition();
  const last = useRef(initial);

  useEffect(() => {
    if (q === last.current) return;
    const timer = setTimeout(() => {
      last.current = q;
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      startTransition(() => router.push(params.toString() ? `/admin/customers?${params}` : "/admin/customers"));
    }, 350);
    return () => clearTimeout(timer);
  }, [q, router]);

  return (
    <div className="flex items-center gap-3">
      <div className="w-full sm:w-80">
        <Input
          aria-label="Search customers"
          placeholder="Search name, email or phone"
          prefix={<Search className="h-4 w-4" aria-hidden="true" />}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {pending && <CarLoader size="sm" />}
    </div>
  );
}
