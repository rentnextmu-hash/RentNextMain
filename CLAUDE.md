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
- `supabase/seed.sql` — applied via `supabase db query --linked -f supabase/seed.sql`. Now seeds the **real** Rent Next Car Hire fleet (see the rebrand section below), not the original placeholder Mauritius demo data. RLS spot-checked against the anon key: `vehicle_categories` readable, `vehicles` correctly returns empty.
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
- `LocationCard` still uses a gradient placeholder with a lucide `MapPin` icon — no real location photos exist yet, and none were provided.

**Explicitly not built yet** (deferred, not half-built): booking flow (5-step + Edge Functions), category detail page (`/cars/[slug]`), location SEO pages, hotels admin, settings page, bookings list/detail admin pages, sitemap/metadata/JSON-LD, Storage/image upload, customer accounts, payments UI beyond the dashboard's read-only view.

**Real-brand rebrand — logo, fleet, colours, copy, all sourced from `Price List.pdf` (the client's actual marketing material), not invented.**

- **Assets extracted from the PDF** (no `pdftoppm`/`pdfimages` available; used `pypdf` + `pymupdf`, both installed via `pip3 --user`, to pull embedded images and render full pages for pixel sampling): `public/logo-mark.png` (real teal "RN" logo, alpha-cropped to its bounding box), `app/favicon.ico` (regenerated from it), and all 12 real car photos in `public/cars/*.png` (transparent cutouts, matched to their model by visual inspection of the rendered PDF page, not assumed from list order).
- **Brand colours sampled directly from the PDF** (not eyeballed): primary navy `#0c1728`, accent teal `#2dc1b5` — replaced the earlier invented navy/gold palette in `styles/tokens.css`. Admin sidebar now uses the exact same navy as the public brand.
- **Vehicle taxonomy widened from 4 invented classes to the real 11-tier rate card** (`supabase/migrations/0003_expand_vehicle_categories.sql`, applied live via `NOT VALID` then a full data replacement — see that migration's comment for why `NOT VALID` was necessary): mini, economy, economy_elite, standard, compact, sedan, intermediate, compact_elite, luxury, convertible, pickup. `types/enums.ts`'s `VehicleCategoryClass` updated to match. `CLASS_LABEL`/`CLASS_ORDER` now live in `components/public/CarCard.tsx` and are imported wherever needed (homepage, catalogue) rather than duplicated.
- **Real fleet reseeded**: 12 vehicle_categories (real makes/models), 24 vehicles (2-3 per category), 16 bookings. Seed script restructured: the transactional-data DELETE block now runs *before* the vehicle/category section (bookings hold FKs to both, so the old order caused a FK violation when clearing the old fleet), and vehicle_categories is now a full unconditional delete-then-insert rather than a partial upsert (a surviving `toyota-vitz` row kept its old id, which collided with the new numbering for a different car — see that section's comment). Rates were initially a single flat `daily_rate_mur`; superseded by real duration-tiered pricing in the fleet showcase work below.
- **Pricing computed via SQL, not hand-multiplied**: `car_total_mur`/`addons_total_mur`/`total_mur` are inserted as `0` placeholders, then set via `UPDATE ... FROM vehicle_categories`/`booking_add_ons` joins. This is a real improvement over the original seed.sql's approach (hand-computed literals) — one class of arithmetic-error risk is now structurally impossible. Caught and fixed two real bugs this way regardless: a duplicate booking reference (two bookings computed the same `CR-YYYYMMDD-NNN`) and the FK-ordering issue above — both found by re-running against the live DB, not by static review.
- **Settings + copy updated**: company name "Rent Next Car Hire", tagline "Elevate Your Driving Experience", real phone/email/website. Locations/hotels/add-ons are unchanged placeholder Mauritius content — no real data was provided for those, so they weren't touched.
- Verified with `tsc --noEmit`, `eslint`, `next build`, and Playwright screenshots of every page (public + admin, signed in) against the live reseeded data.

**Splash screen + CarLoader — live on the public site.**

- `components/public/SplashScreen.tsx` — brand intro sequence (logo stroke-draw → letterforms → wordmark → tagline → `CarLoader`), mounted in `app/(public)/layout.tsx` so it wraps every public page. Session-gated via `sessionStorage` (`rn_splash_seen`, not `localStorage` — a returning visitor the next day still sees it once), min 1200ms / max 2200ms visible, dismisses on click/keydown/wheel. Already checks the pathname to skip `/booking/*` even though that flow isn't built yet. `prefers-reduced-motion` is handled almost entirely in CSS (`splash.css`'s media query zeroes every animation, which naturally parks the car at its unanimated start position) — only the 600ms reduced-motion hold duration is JS-side.
- `components/public/CarLoader.tsx` — the reusable car-on-a-road motif (`size` sm/md/lg), one-shot `durationMs` for the splash vs. the default indeterminate ping-pong loop everywhere else. Now also powers `app/(public)/loading.tsx`, `app/(public)/cars/loading.tsx`, and `Button`'s loading state (replacing the old border-spin spinner).
- The car's drive duration is fixed at 1200ms (the guaranteed minimum) with `animation-fill-mode: forwards`, rather than dynamically synced to the actual dismiss delay — true dynamic sync isn't achievable with a declarative CSS animation whose duration must be set before the real dismiss time is known, without a JS `requestAnimationFrame` loop (ruled out by the brief). Fast page loads: finishes exactly as dismissal happens. Slow loads (up to 2200ms): finishes early and holds at the finish line.
- Was built and reviewed at a temporary `/splash-preview` route first, per instruction, before being wired live and that route deleted.

**Fleet showcase carousel — built at `/fleet-showcase`, NOT yet mounted on the homepage (pending your review).**

Modelled on drinkbaie.com's product carousel: one vehicle at a time, full-bleed, background colour changing per vehicle. Sits above the existing "Our Vehicles" grid conceptually (the grid stays as the practical browse entry point) but isn't wired into `app/(public)/page.tsx` yet — reachable only at the preview route until approved, matching how the splash screen was handled.

- **Schema** (migrations 0004, 0005): `vehicle_categories.daily_rate_mur` replaced with real duration-tiered rates (`rate_1_2_mur`/`rate_3_5_mur`/`rate_6_plus_mur`, matching the price list exactly) — `daily_rate_mur` survives as a `generated always as (rate_6_plus_mur) stored` column so every existing reader (CarCard, homepage, catalogue) kept working unchanged, now nullable in the generated types (`?? car.rate_6_plus_mur` fallback added at both call sites). Added `rate_class` (A-L), `tagline`, `best_for`, `luggage_capacity`. Also added a `category_available_counts` VIEW (migration 0005) — the carousel needs a per-category "available now" count on the **public** site, but `vehicles` is intentionally staff-only RLS (no registration plates publicly), so an anon session querying it directly silently gets zero rows; the view exposes only an aggregate count, grant-ed to anon, bypassing that RLS internally via Postgres's default view-owner-privileges behaviour.
- `lib/pricing.ts`'s `selectDailyRate(rates, days)` is now the single place the 1-2/3-5/6+ day tiering rule lives; `calculateBookingTotal` takes `rates: CategoryRates` instead of a flat number. seed.sql's booking pricing UPDATE mirrors the same tiering in a SQL `CASE` (has to — seed generation can't call TypeScript) with a comment cross-referencing lib/pricing.ts.
- Content (description/tagline/best_for for all 12 real vehicles, written in brand voice) lives in the DB via seed.sql, not hardcoded in the component — editable from the admin later.
- `components/public/fleetPalette.ts` — the eleven class → gradient-pair map (exact values also documented in `styles/tokens.css` as `--fleet-*` custom properties for reference; the component reads the TS values directly since it crossfades via two stacked gradient layers + opacity, not a CSS colour interpolation).
- `components/public/FleetShowcase.tsx` — Framer Motion drag/snap (a shared `dragX` motion value on the draggable centre track, `useTransform` per car for its live position; text columns are a *separate* `AnimatePresence`-keyed overlay, not part of the drag track — the brief itself only describes the car image as dragging), keyboard arrows, click-to-navigate peeking neighbours, URL hash deep-linking (`#fleet/toyota-raize` via `replaceState`), `prefers-reduced-motion` (CSS media query in `fleetShowcase.css`, same pattern as the splash). Mobile: compact two-column spec table, primary CTA pinned `fixed bottom-0` (standard behaviour for a pinned CTA bar — it does overlap whatever scrolls beneath it, same as any app's persistent "Add to cart" bar), nav controls repositioned right after the car image via `order-*` utilities rather than left at the very bottom of a much-taller single-column layout, peek scale 0.85 vs desktop's 0.75.
- Verified with Playwright: every palette crossfades correctly, tiered pricing displays correctly (6+ day tier always highlighted — rates strictly decrease with duration in this model, so it's not a per-vehicle conditional), the `category_available_counts` fix confirmed live (was silently returning 0 for everything before the view existed), mobile layout, and the actual drag-to-navigate mechanic. One real finding: Playwright's `page.mouse.*` API doesn't reliably trigger Framer Motion's drag gesture detection (a known simulation gap, not a bug) — confirmed by dispatching raw `PointerEvent`s directly instead, which real browsers generate from genuine mouse/touch input and which advanced the slide correctly.

**Next up:** review `/fleet-showcase` — palettes, drag feel, mobile layout, copy. Once approved: mount on the homepage between the hero and the "Our Vehicles" grid, then delete the preview route. After that, either continue the fast-track (the booking flow is the natural next piece) or return to the blueprint's own P-number order for full V1 completeness — ask before assuming which.
