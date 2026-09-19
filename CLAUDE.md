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

**Block B1 — Data layer: complete, applied to the live database.**

- Supabase project connected and linked: `nylapoygcfuyztkictyi` (org `rentnextmu-hash`, project `rentnext-main`). URL + anon key in `.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` still blank — needed before the `create-booking`/`send-booking-email` Edge Functions in P5.3/P5.4.
- `supabase/migrations/0001_initial_schema.sql` and `0002_rls.sql` — applied via `supabase db push` (using a Supabase personal access token for non-interactive CLI auth, since browser-based `supabase login` isn't possible headlessly). All 11 tables, RLS on every table, `is_staff()`/`is_role()` helpers, the auth.users → profiles provisioning trigger.
- `supabase/seed.sql` — applied via `supabase db query --linked -f supabase/seed.sql`. Row counts verified live: 6 locations, 8 categories, 30 vehicles, 5 hotels, 6 add-ons, 25 customers, 25 bookings, 20 booking_add_ons, 23 payments, 6 settings — all exactly as designed. RLS spot-checked against the anon key: `vehicle_categories` readable, `vehicles` correctly returns empty.
- **No staff login exists yet** — `seed.sql` intentionally never touches `auth.users`/`profiles`. Before B6 (staff auth) is exercised for real, create a user via Supabase Auth (dashboard → Authentication → Add user); the `handle_new_user` trigger gives it a `staff` profile automatically, then promote with `update profiles set role = 'owner' where id = '<user-id>'`.
- `types/database.ts` is the **real** CLI-generated output (`npm run types:gen`, now works locally — `supabase` is a devDependency, just needs `SUPABASE_ACCESS_TOKEN` set or `supabase login` run once). Regenerate this after every future migration.
- `types/enums.ts` — hand-maintained literal-union types (`VehicleStatus`, `BookingStatus`, etc.) for every `text + check` column. The schema uses check constraints rather than native Postgres enums, so the generator can only type those columns as plain `string`; keep this file in sync manually if the CHECK constraints change.
- `lib/pricing.ts`, `lib/availability.ts` fully implemented — pricing is pure functions with no DB access; availability takes a Supabase client and implements the single `[pickup_at, return_at)` overlap check used everywhere.
- `lib/queries/{categories,locations,vehicles,bookings,dashboard,hotels}.ts` — typed data-access functions per domain, joined rows, client passed in as first arg.
- `lib/validation.ts` still an empty placeholder — first real schemas land with the booking flow in B5.
- Verified with `tsc --noEmit`, `eslint`, and `next build` — all clean, against the real generated types.

**Blocks B2/B3/B6/B7/B8 — "Demo Fast Track" (client-facing pages only, out of blueprint order).**

At the client's request, jumped ahead to build a curated, aesthetic subset of pages to demo — rather than the full B2→B9 sequence. Everything below goes through the real Supabase query layer and the same folder/component conventions as the rest of the plan, so there's no rework to unwind later; it's a page-selection shortcut, not a quality shortcut. Verified visually via Playwright screenshots (installed temporarily, then removed — not a project dependency) against the live seeded data, signed in as a real staff account.

Built:
- **Design tokens** (`styles/tokens.css`, wired into `app/globals.css` via Tailwind v4's `@theme inline`) and three fonts (Fraunces/heading, Inter/body, JetBrains Mono/mono) loaded in `app/layout.tsx`.
- **UI primitives** (`components/ui/`): Button, Input, Select, Badge, StatusPill (single source of truth for status colour), Spinner, EmptyState. Trimmed from the full blueprint inventory — no Modal/Drawer/Toast/DatePicker/Textarea/Checkbox yet, since nothing built so far needs them.
- **Public shell** (`components/public/Navbar.tsx`, `Footer.tsx`) and **admin shell** (`components/admin/Sidebar.tsx`, `Topbar.tsx`, `SignOutButton.tsx`, `StatCard.tsx`). Admin sidebar shows every planned nav item; unbuilt ones (Bookings, Locations, Hotels, Customers, Payments, Reports, Settings) are visibly disabled with a "Soon" tag rather than linking to 404s.
- **Public pages**: homepage (`app/(public)/page.tsx` — hero, functional SearchWidget, category tiles, featured cars, locations, trust section) and catalogue (`app/(public)/cars/page.tsx` — class-filter pills via URL params; when a search was performed, wires into `getCategoriesWithAvailabilityCount` for real live availability against seeded bookings, not decorative).
- **Staff auth**: `lib/auth.ts` (`getCurrentStaff()`), `app/login/page.tsx` (client component, `signInWithPassword` + active-profile check). A real staff account exists: `rentnext.mu@gmail.com`, role `owner`.
- **Admin pages**: dashboard overview (`app/(admin)/admin/page.tsx` — stat cards, today's activity, recent bookings, upcoming returns), fleet list (`app/(admin)/admin/fleet/page.tsx`), and the Gantt-style fleet calendar (`app/(admin)/admin/calendar/page.tsx` — hand-built with CSS Grid, sticky frozen vehicle column via `position: sticky` inside one scrollable grid, explicit `gridRow`/`gridColumn` placement per booking block, maintenance rows shown with a repeating-gradient hatch). 14-day window from today, grouped by location display_order.
- No vehicle/location images exist in Storage yet (P9.3 not done), so `CarCard`/`LocationCard` use tasteful per-category gradient placeholders with a lucide `Car`/`MapPin` icon rather than guessing at external image URLs.

**Explicitly not built yet** (deferred, not half-built): booking flow (5-step + Edge Functions), category detail page (`/cars/[slug]`), location SEO pages, hotels admin, settings page, bookings list/detail admin pages, sitemap/metadata/JSON-LD, Storage/image upload, customer accounts, payments UI beyond the dashboard's read-only view.

**Next up:** either continue the fast-track (booking flow is the natural next piece, since it's the other half of the demo script), or return to the blueprint's own P-number order for full V1 completeness — ask before assuming which.
