import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BadgeCheck, MapPin, MessageCircle, Wrench } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/public";
import { getActiveCategories } from "@/lib/queries/categories";
import { getActiveLocations, getLocationFleetCounts } from "@/lib/queries/locations";
import { getPublicSettings } from "@/lib/queries/settings";
import { lowestDailyRate } from "@/lib/pricing";
import { formatMUR } from "@/lib/format";

// DRAFT COPY — written as a placeholder until the client supplies their
// own story. Every number on the page comes from the database; the prose
// avoids specific claims (founding year, customer counts) we can't back up.

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "About Us | Rent Next Car Hire",
  description:
    "Rent Next Car Hire is a Mauritian car rental company with pickup points around the island, hotel delivery and clear, duration-based prices.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const supabase = createPublicClient();
  const [categories, locations, fleetCounts, settings] = await Promise.all([
    getActiveCategories(supabase),
    getActiveLocations(supabase),
    getLocationFleetCounts(supabase),
    getPublicSettings(supabase),
  ]);
  const cars = [...fleetCounts.values()].reduce((sum, n) => sum + n, 0);
  const from = lowestDailyRate(
    categories.map((c) => ({ rate1To2Mur: c.rate_1_2_mur, rate3To5Mur: c.rate_3_5_mur, rate6PlusMur: c.rate_6_plus_mur })),
  );

  const stats = [
    { value: String(cars), label: "cars ready to rent" },
    { value: String(categories.length), label: "models, small to seven-seater" },
    { value: String(locations.length), label: "pickup points around the island" },
    ...(from ? [{ value: formatMUR(from), label: "per day, for the longest rentals" }] : []),
  ];

  const values = [
    {
      icon: BadgeCheck,
      title: "Prices you can read",
      body: "One daily rate per car, cheaper the longer you rent, and every extra listed with its price. What you see when you book is what you pay.",
    },
    {
      icon: MapPin,
      title: "We come to you",
      body: "Collect from one of our branches or the airport, or have the car delivered to your hotel on the north, east, west or south coast.",
    },
    {
      icon: Wrench,
      title: "Cars that are looked after",
      body: "Every car is cleaned and checked between rentals, handed over with a full tank, and taken off the road for maintenance when it needs it.",
    },
    {
      icon: MessageCircle,
      title: "A local team, one call away",
      body: "Questions before you land or a problem on the road — you reach people who live here and know the island's roads.",
    },
  ];

  return (
    <div>
      <section className="bg-gradient-to-br from-primary to-primary-deep text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-accent">About us</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-display font-semibold">
              {settings.companyName}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              A Mauritian car rental company built around one idea: getting you on the road quickly, in a car you&apos;re
              happy to drive, for a price you understood before you booked.
            </p>
          </div>
          <div className="relative h-56 sm:h-72">
            <Image src="/cars/toyota-raize.png" alt="" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain" priority />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
              <dd className="font-[family-name:var(--font-heading)] text-h1 font-semibold text-text">{s.value}</dd>
              <dt className="mt-1 text-sm text-text-muted">{s.label}</dt>
            </div>
          ))}
        </dl>

        <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-h2 font-semibold text-text">Why we started</h2>
            <div className="mt-4 space-y-4 leading-relaxed text-text">
              <p>
                Renting a car in Mauritius should be the easy part of a holiday. Too often it isn&apos;t: prices that change
                at the counter, a car that isn&apos;t the one you booked, a long wait at the airport after a long flight.
              </p>
              <p>
                We set out to do the simple things properly. Clear rates that fall the longer you rent. A fleet that runs
                from the nimble Suzuki Celerio to seven-seat family cars and a convertible for the coast road. Pickup where
                you actually are — our branches, the airport, or your hotel.
              </p>
              <p>
                We&apos;re a local team, and we&apos;d rather you remembered the view from Chamarel than the rental desk.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
                <h3 className="mt-3 font-semibold text-text">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 rounded-[var(--radius-lg)] bg-surface-alt p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-h3 font-semibold text-text">Ready when you land</h2>
            <p className="mt-1 text-text-muted">See the fleet, or find the pickup point nearest your hotel.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/cars" className="inline-flex h-11 items-center rounded-[var(--radius-md)] bg-primary px-5 font-medium text-white hover:bg-primary-hover">
              Browse cars
            </Link>
            <Link href="/locations" className="inline-flex h-11 items-center rounded-[var(--radius-md)] border border-border bg-surface px-5 font-medium text-text hover:border-primary">
              Locations
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
