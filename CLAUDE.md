# RentNext — Car Rental Platform (Mauritius)

## What this is

Two applications in one Next.js codebase, sharing one Supabase backend:

1. **Public website** — marketing + booking flow for tourists renting cars in Mauritius.
2. **Admin dashboard** at `/admin` — internal tool for the owner and staff to manage fleet, bookings, locations and hotel partners.

Backend is entirely Supabase: Postgres, Auth, Storage, Edge Functions. Frontend hosts on Vercel.

Build is being driven from `Rentnext-Build.pdf` (the full blueprint), following its numbered prompt sequence (P0, P1.1, P1.2, …). This file is the persistent context every later prompt/session relies on — keep it current.

## The central domain rule

Customers browse and book **vehicle categories** ("Toyota Vitz", "Toyota Axio") — what's on the public website. Staff manage physical **vehicles** ("VITZ-001", "VITZ-002", real registration plates) — what's in the admin dashboard.

**A registration plate or vehicle code must never appear on the public site.** These are two separate tables (`vehicle_categories` vs `vehicles`) with two separate purposes. Never join a `vehicles` row into anything rendered on `app/(public)/*`.

## Folder structure

```
app/
  (public)/        Public website route group — homepage, cars, locations, search, booking flow
  (admin)/admin/    Admin dashboard route group — protected by middleware
  login/            Staff login (outside both route groups)
  auth/callback/    Supabase auth callback (password reset flow)
components/
  ui/               Design system primitives (Button, Input, Modal, StatusPill, ...)
  public/           Public-site components (Navbar, CarCard, SearchWidget, ...)
  admin/            Admin dashboard components (Sidebar, DataTable, GanttCalendar, ...)
lib/
  supabase/         client.ts (browser), server.ts (RSC), middleware.ts (session refresh)
  queries/          Typed data-access functions, one file per domain, take a Supabase client as first arg
  format.ts         formatMUR, formatDate, formatDateTime, formatDateRange, daysBetween
  pricing.ts        THE ONLY place pricing maths happens anywhere in the codebase
  availability.ts   THE ONLY place availability logic happens anywhere in the codebase
  validation.ts     Shared Zod schemas (client + server + Edge Functions)
  utils.ts          cn() — clsx + tailwind-merge
types/database.ts   Generated from Supabase via `npm run types:gen` — do not hand-edit
supabase/
  migrations/       SQL migrations, numbered 0001_..., 0002_...
  seed.sql          Realistic Mauritian demo data
  functions/        Edge Functions: check-availability, create-booking, send-booking-email
styles/tokens.css   CSS custom property design tokens (brand, admin/public surfaces, type scale)
```

## Conventions

- **Server components by default.** Add `"use client"` only when a component needs state, effects, or event handlers.
- **Tailwind with CSS variable tokens** from `styles/tokens.css` — no arbitrary hex values in components.
- **All money as integer MUR.** Never floats, never cents. Rendered via `formatMUR()`.
- **All database access through the typed Supabase client** (`types/database.ts`), never raw untyped queries.
- **Dates display as "20 Sep 2026"**, timezone `Indian/Mauritius` (UTC+4), via `lib/format.ts`.
- **Pricing and availability logic live in exactly one place each** (`lib/pricing.ts`, `lib/availability.ts`) — imported everywhere, never re-implemented (e.g. the admin manual-booking form must use the same functions as the public booking flow).
- **Bookings are never inserted from the browser with the anon key.** The `create-booking` Edge Function validates availability server-side and inserts with the service role key.
- Vehicle codes: `MODEL-NNN` uppercase, e.g. `VITZ-001`. Booking references: `CR-YYYYMMDD-NNN`, e.g. `CR-20260918-004`.
- Category slugs and location slugs: kebab-case, e.g. `toyota-vitz`, `flic-en-flac`.

## Environment

Copy `.env.local.example` to `.env.local` and fill in the Supabase project's URL/keys before running P1 (schema migration) or anything that touches the database. `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to the browser — server-only, and set separately as an Edge Function secret via `supabase secrets set`.

## Stack pinned versions

Next.js is pinned to **15.5.x** (not 16 — `create-next-app@latest` defaults to 16, downgrade if it drifts). React 19, Tailwind CSS 4, TypeScript strict mode.

## Current status

**Block B0 — Foundations: complete.**

- Next.js 15.5.25 (App Router, TypeScript strict, no `src/`), Tailwind CSS 4, ESLint.
- Dependencies installed: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `date-fns`, `lucide-react`, `clsx`, `tailwind-merge`.
- Full folder structure created per the blueprint (see above).
- Supabase clients wired for App Router via `@supabase/ssr`: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (RSC, cookie-aware), `lib/supabase/middleware.ts` (session refresh).
- Root `middleware.ts` refreshes the session on every request and redirects unauthenticated visitors away from `/admin/*` to `/login?next=...`.
- `lib/format.ts` fully implemented (`formatMUR`, `formatDate`, `formatDateTime`, `formatDateRange`, `daysBetween`), Mauritius-timezone aware.
- `lib/utils.ts` has `cn()` ready early (harmless to have before P2.1).
- No pages or UI built yet — by design, this block is foundations-only. `app/(public)/page.tsx` and `app/(admin)/admin/layout.tsx` etc. do not exist yet; visiting `/` currently 404s.

**Block B1 — Data layer: SQL and code written, NOT YET APPLIED to the live database.**

- Supabase project connected: `nylapoygcfuyztkictyi` (URL + anon key in `.env.local`, gitignored). `SUPABASE_SERVICE_ROLE_KEY` still blank — needed before the `create-booking`/`send-booking-email` Edge Functions in P5.3/P5.4.
- `supabase/migrations/0001_initial_schema.sql` — all 11 tables from the blueprint's data model plus a `booking_reference_counters` side table backing `generate_booking_reference()`.
- `supabase/migrations/0002_rls.sql` — RLS on every table, `is_staff()`/`is_role()` helpers, the auth.users → profiles provisioning trigger.
- `supabase/seed.sql` — full realistic Mauritian demo dataset (6 locations, 8 categories, 30 vehicles, 5 hotels, 6 add-ons, 25 customers, 25 bookings). Catalogue/vehicle rows upsert; bookings/customers/payments/booking_add_ons clear-and-reinsert on every run so dates stay relative to "now". Hand-verified for referential integrity and pricing arithmetic with a standalone script (no live DB available to actually run it against yet).
- **Neither the Supabase CLI nor `psql` is available in this environment**, and there's no way to execute arbitrary DDL through the anon/service REST API — so these three SQL files have not been applied to the live project. **Action needed from you:** paste `0001_initial_schema.sql`, then `0002_rls.sql`, then `seed.sql`, into the Supabase SQL Editor for project `nylapoygcfuyztkictyi`, in that order. (Also note: `seed.sql` never creates a staff login — create your own user via Supabase Auth, e.g. the dashboard's "Add user", so `/login` in B6 has an account to use. The `handle_new_user` trigger in `0002_rls.sql` gives any new `auth.users` row a `staff`-role `profiles` row automatically; promote yourself to `owner` afterwards with a manual `update profiles set role = 'owner' where id = '<your-user-id>'`.)
- `types/database.ts` is hand-written to match the two migrations exactly (Supabase CLI generation needs an authenticated `supabase login`, not available headlessly here). Once you've applied the migrations and can run `npx supabase login` yourself, regenerate for real with `npm run types:gen` and it should diff cleanly against this file — if it doesn't, trust the generated one.
- `lib/pricing.ts`, `lib/availability.ts` fully implemented — pricing is pure functions with no DB access; availability takes a Supabase client and implements the single `[pickup_at, return_at)` overlap check used everywhere.
- `lib/queries/{categories,locations,vehicles,bookings,dashboard,hotels}.ts` — typed data-access functions per domain, joined rows, client passed in as first arg.
- `lib/validation.ts` still an empty placeholder — first real schemas land with the booking flow in B5.
- Verified with `tsc --noEmit`, `eslint`, and `next build` — all clean. None of this has been exercised against live data yet since the migrations aren't applied.

**Not started:** B2 (design system) and everything after.

**Next up, once you've run the SQL in the Supabase SQL Editor:** B2 — design system (P2.1 tokens/Tailwind, P2.2 UI primitives + kitchen sink, P2.3 public/admin shells).
