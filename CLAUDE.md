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
- **No staff login exists yet** — `seed.sql` intentionally never touches `auth.users`/`profiles`. Before B6 (staff auth) is exercised for real, create a user via Supabase Auth (dashboard → Authentication → Add user); the `handle_new_user` trigger gives it an **inactive** `staff` profile (since migration 0008 — see the security note there), then activate/promote with `update profiles set is_active = true, role = 'owner' where id = '<user-id>'`.
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

**Fleet showcase carousel — approved and live on the homepage.**

Modelled on drinkbaie.com's product carousel: one vehicle at a time, full-bleed, background colour changing per vehicle. Mounted in `app/(public)/page.tsx` between the hero/search widget and the "Our Fleet" grid (the grid stays as the practical browse entry point — carousel is the emotional showcase, grid is the utility). Built and reviewed at a temporary `/fleet-showcase` route first, per instruction, same workflow as the splash screen; that route is now deleted.

- **Schema** (migrations 0004, 0005): `vehicle_categories.daily_rate_mur` replaced with real duration-tiered rates (`rate_1_2_mur`/`rate_3_5_mur`/`rate_6_plus_mur`, matching the price list exactly) — `daily_rate_mur` survives as a `generated always as (rate_6_plus_mur) stored` column so every existing reader (CarCard, homepage, catalogue) kept working unchanged, now nullable in the generated types (`?? car.rate_6_plus_mur` fallback added at both call sites). Added `rate_class` (A-L), `tagline`, `best_for`, `luggage_capacity`. Also added a `category_available_counts` VIEW (migration 0005) — the carousel needs a per-category "available now" count on the **public** site, but `vehicles` is intentionally staff-only RLS (no registration plates publicly), so an anon session querying it directly silently gets zero rows; the view exposes only an aggregate count, grant-ed to anon, bypassing that RLS internally via Postgres's default view-owner-privileges behaviour.
- `lib/pricing.ts`'s `selectDailyRate(rates, days)` is now the single place the 1-2/3-5/6+ day tiering rule lives; `calculateBookingTotal` takes `rates: CategoryRates` instead of a flat number. seed.sql's booking pricing UPDATE mirrors the same tiering in a SQL `CASE` (has to — seed generation can't call TypeScript) with a comment cross-referencing lib/pricing.ts.
- Content (description/tagline/best_for for all 12 real vehicles, written in brand voice) lives in the DB via seed.sql, not hardcoded in the component — editable from the admin later.
- `components/public/fleetPalette.ts` — the eleven class → gradient-pair map (exact values also documented in `styles/tokens.css` as `--fleet-*` custom properties for reference; the component reads the TS values directly since it crossfades via two stacked gradient layers + opacity, not a CSS colour interpolation).
- `components/public/FleetShowcase.tsx` — Framer Motion drag/snap (a shared `dragX` motion value on the draggable centre track, `useTransform` per car for its live position; text columns are a *separate* `AnimatePresence`-keyed overlay, not part of the drag track — the brief itself only describes the car image as dragging), keyboard arrows, click-to-navigate peeking neighbours, URL hash deep-linking (`#fleet/toyota-raize` via `replaceState`), `prefers-reduced-motion` (CSS media query in `fleetShowcase.css`, same pattern as the splash). Mobile: compact two-column spec table, primary CTA pinned `fixed bottom-0` (standard behaviour for a pinned CTA bar — it does overlap whatever scrolls beneath it, same as any app's persistent "Add to cart" bar), nav controls repositioned right after the car image via `order-*` utilities rather than left at the very bottom of a much-taller single-column layout, peek scale 0.85 vs desktop's 0.75.
- Verified with Playwright: every palette crossfades correctly, tiered pricing displays correctly (6+ day tier always highlighted — rates strictly decrease with duration in this model, so it's not a per-vehicle conditional), the `category_available_counts` fix confirmed live (was silently returning 0 for everything before the view existed), mobile layout, and the actual drag-to-navigate mechanic. One real finding: Playwright's `page.mouse.*` API doesn't reliably trigger Framer Motion's drag gesture detection (a known simulation gap, not a bug) — confirmed by dispatching raw `PointerEvent`s directly instead, which real browsers generate from genuine mouse/touch input and which advanced the slide correctly.

- Homepage now fetches `getCategoriesWithFleetAvailability` alongside the existing `getActiveCategories`/`getActiveLocations` calls, in the same `Promise.all`. Framer Motion is part of the homepage's client bundle (`/` grew to ~53kB own JS) — not expected to regress LCP since the hero above it is plain server-rendered HTML that paints before any client JS hydrates, but worth knowing if homepage performance is ever profiled.

**Block B5 — Booking journey (P5.1–P5.4): complete and live on the production Supabase project.**

- **Flow**: `app/(public)/booking/(flow)/{car,trip,extras,details,summary}` share one layout (`(flow)/layout.tsx`) that fetches all public data once (`lib/queries/bookingFlow.ts`) and mounts `BookingProvider`. Confirmation (`booking/confirmation/[reference]`) sits outside the `(flow)` group so it has no stepper/summary.
- **State**: `components/public/booking/BookingProvider.tsx` — sessionStorage (`rn_booking_v1`), hydrated from URL params (`?category=<slug>&location=<slug>&from=YYYY-MM-DD&to=YYYY-MM-DD`) via `useSearchParams()` — NOT `window.location`, which is still the previous page's URL during a client-side navigation into the flow (real bug, caught in E2E). Steps are "complete" only when the customer has continued past them AND they're still valid; `useStepGuard(step)` redirects to the first incomplete earlier step. Prices are always derived via `lib/pricing.ts`, never stored. Dates are separate `YYYY-MM-DD` + `HH:mm` fields composed with `mauritiusDateTime()` (fixed `+04:00`).
- **Entry points**: Navbar "Book Now" → `/booking/car`; `/cars` cards have a Book button → `/booking/trip?category=…` carrying the search over. The fleet carousel still links to `/cars/[slug]` (P3.3, not built — 404).
- **Edge Functions** (`supabase/functions/`): `check-availability`, `create-booking`, `get-booking`, `send-booking-email`. They import `lib/pricing.ts`, `lib/availability.ts`, `lib/validation.ts`, `lib/format.ts` directly via `supabase/functions/import_map.json` (mapped per function in `supabase/config.toml`) — rules stay single-sourced. `supabase/functions` is excluded from the Next tsconfig/eslint; type-check with `deno check --config supabase/functions/deno.json …`.
  - `create-booking` recalculates every price server-side (browser sends no prices), forces locked add-ons (`lockedAddOnSlugs()` in pricing.ts: airport delivery at airport pickups, hotel delivery with a partner hotel), enforces `add_ons.max_quantity` and `minimum_rental_days`, re-checks availability, then writes via the `create_booking_request()` SQL function in one transaction. Returns `{ reference, key }`.
  - Booking references are sequential/guessable, so the confirmation URL carries `?key=` — an HMAC of the reference signed with the `BOOKING_LINK_SECRET` function secret (`_shared/bookingKey.ts`). `get-booking` returns the same 404 for unknown reference and wrong key, and never returns vehicle data.
  - `send-booking-email` is service-role-only, Resend REST API, table-based HTML. Skips cleanly (`{ skipped: true }`) until `RESEND_API_KEY` is set; also reads `EMAIL_FROM`, `SITE_URL`, optional `BOOKING_NOTIFICATION_EMAIL`. Never fails a booking.
- **Public availability fix**: `lib/availability.ts`'s direct functions read `vehicles` (staff-only RLS) — with the anon key they silently returned zero, so `/cars?location=…` showed every car "Not available" to real visitors. Public callers now use `checkAvailability()` (→ check-availability Edge Function); `getCategoriesWithAvailabilityCount` uses it.
- **Migration 0006**: `add_ons.max_quantity`, `customers.marketing_consent`, `bookings.terms_accepted_at`, `public_partner_hotels` view (anon-readable hotel names only, same pattern as 0005), `create_booking_request()` (execute revoked from anon/authenticated). `types/database.ts` regenerated from live after the push.
- **Seed fix**: seed references are built from dates, bypassing `generate_booking_reference()`, so the counter table never advanced — the first real booking on a re-seed day collided with `CR-<today>-001`. Seed now resyncs `booking_reference_counters` at the end.
- **Verification**: full local stack in Docker doesn't work in this Codespace (container-to-container networking times out), so verified with a throwaway `supabase/postgres` + PostgREST on host networking and a Deno gateway loading the real function sources; all migrations + seed applied cleanly; API tests (tampered quantities/prices/hotels/terms/past dates/min days/wrong keys) and a Playwright run of the full demo path (desktop + 375px mobile), no console errors. `tsc`, `eslint`, `deno check`, `next build` all clean.
- **Live since 24 Sep 2026**: 0006 pushed, `BOOKING_LINK_SECRET` set, all four functions deployed with `supabase functions deploy <name> --use-api` (server-side bundling — uploads the shared lib/ files via the import map; Docker bundling not needed). Verified with a real browser booking against production (CR-20260924-001, marked as a test in its notes). Still needed for emails: `RESEND_API_KEY` + a verified sending domain (`EMAIL_FROM`) + `SITE_URL` as function secrets.
- **CLI auth in Codespaces**: `supabase login` stores its token in the OS keyring, which doesn't survive a Codespace restart. Use `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD` Codespaces secrets instead. Website bookings are `requested` with no vehicle and don't consume inventory until staff confirm+assign (V1 by design).

**Block B8 (part) — Bookings list + booking detail (P8.1, P8.2): complete and live (0007 pushed 24 Sep 2026, types regenerated from live).**

- **Migration 0007**: status timestamps (`confirmed_at`, `vehicle_assigned_at`, `picked_up_at`, `returned_at`, `cancelled_at`) set only by the `bookings_status_guard` trigger, which also **enforces transitions** (requested→confirmed→active→completed; cancelled from any open state; completed/cancelled final; no `active` without a vehicle; no vehicle change once closed). `internal_notes` (+ `_updated_at`/`_updated_by`) kept separate from `bookings.notes`, which is the customer's own website text. `assign_booking_vehicle()` / `transition_booking()` do the booking + vehicle-status + mileage side effects in one transaction, SECURITY INVOKER so staff RLS applies. Vehicle status follows the demo script: assigning marks the car `booked`; completing/cancelling releases it unless another open booking holds it.
- `lib/bookingStatus.ts` mirrors the transition map for the UI only (which buttons to show) plus `attentionReason()` for the list's warning rows — the DB trigger is authoritative.
- `lib/availability.ts`: `excludeBookingId` option (so reassigning doesn't clash with the booking's own hold) and `getAvailableVehicles()` (free cars of a category, pickup-location first then lowest mileage — also the auto-assign policy when confirming).
- `/admin/bookings`: URL-driven filters parsed once in `components/admin/bookings/listParams.ts` (shared with `/admin/bookings/export`, so the CSV is exactly what's on screen); date presets are *overlap* windows in Mauritius days; status tiles double as filters; 25/page server-side; warning inset border on rows needing attention. CSV cells are formula-injection-escaped (names come from the public form).
- `/admin/bookings/[reference]`: server actions in `actions.ts` (each re-checks the staff session); Confirm auto-assigns; Assign/Change vehicle; Mark picked up; Complete (return mileage, must be ≥ odometer); Cancel (confirmation dialog); record payment; internal notes saved on blur; status timeline; email/WhatsApp/copy; print stylesheet (admin chrome `print:hidden`, signature block).
- New primitive `components/ui/Modal.tsx` (native `<dialog>`). Fixed: `Input`'s `prefix` prop collided with the HTML `prefix` attribute; admin layout column missing `min-w-0` (wide tables stretched the whole page on tablet); `sr-only` table header escaping its scroll box; **`formatDate` printed "Sept"** (ICU 72+ en-GB) — now normalised to "Sep" everywhere.
- Calendar booking blocks and dashboard recent-booking references now link to the detail page. Sidebar "Bookings" enabled.
- Verified with a local GoTrue + PostgREST + Deno gateway (host networking; see B5 note) and a signed-in Playwright run of the full staff workflow, desktop + 1024px tablet.

**Block B7 — Vehicle detail + add/edit (P7.2): complete (no migration needed).**

- `/admin/fleet/[id]`: header (code, status, Edit / Change status), details, "On rent now" / "Next booking" card, quick stats (`vehicleStats()` in `lib/queries/vehicles.ts` — confirmed/active/completed bookings only; revenue is stored booking totals, never re-priced), booking history, honest maintenance-scheduling placeholder. Fleet list codes link here.
- Add/edit in a right-hand `Drawer` (`components/admin/fleet/VehicleForm.tsx`) from both the list and the detail page: code auto-suggested per category (`suggestVehicleCode()` — the category's existing prefix, else derived from the model; next number across the whole fleet), friendly uniqueness errors for code and registration (checked first, and the `23505` race still mapped), `vehicleFormSchema` in `lib/validation.ts`, success toast "VITZ-004 added to Grand Baie", revalidates fleet/calendar/dashboard. Change-status dialog warns when an open booking still holds the car.
- Writes need owner or manager: new `requireRole()` in `lib/auth.ts` (server actions in `app/(admin)/admin/fleet/actions.ts`). RLS alone would let any staff write.
- New primitives: `Drawer`, `Toast`. Gotchas fixed: React 19 resets `<form action={fn}>` after the action even on validation errors (lost input) — forms now submit via `onSubmit` + `new FormData()`; `z.coerce.number()` turns a blank field into 0 — blank mileage now errors.
- Verified locally (GoTrue + PostgREST + Deno gateway, owner and staff users): demo Act 3 end to end — fleet 24 → 25, dashboard count updates, public check-availability for Vitz at Grand Baie 1 → 2, and back to 1 when set to maintenance; staff role refused.

**Block B8 — Manual booking creation (P8.4): complete and live (0008 pushed 25 Sep 2026, types regenerated from live).**

- `/admin/bookings/new` (`components/admin/bookings/StaffBookingForm.tsx`): one dense form — existing-customer search (`lib/queries/customers.ts`) or new customer inline; rental; category → live free-vehicle list (`getAvailableVehicles`) or "leave unassigned"; add-ons with quantities (airport delivery pre-ticked via `lockedAddOnSlugs()` but staff can untick); source phone/walk-in/hotel (hotel select); status confirmed (default) or requested; price from `calculateBookingTotal()` with an optional override + required reason; internal notes; sticky total/submit footer. Errors clear per field as it changes. Pre-fills from `?vehicle=<id>&from=YYYY-MM-DD` — **empty calendar cells now link here** (bookable cars only).
- Server action `createStaffBookingAction` (any active staff role): zod `staffBookingSchema`, re-prices from DB rates via `lib/pricing.ts`, checks the chosen car is in the category and free via `lib/availability.ts`, then `create_staff_booking()`.
- **Migration 0008**: `bookings.original_total_mur` + `price_override_reason` (check constraint: both or neither; `total_mur` is what's charged, car/add-on totals stay calculated; detail page shows the calculated total struck through + reason). `generate_booking_reference()` → SECURITY DEFINER, execute only for authenticated/service_role (staff can only SELECT the counter table under RLS). `create_staff_booking()` — SECURITY INVOKER, dedupes customers by email, marks an assigned car booked.
- **Security fix in 0008 (pre-existing hole):** `handle_new_user()` created every new auth user as an *active* staff profile, and public sign-up is enabled on the project — anyone with the public anon key could sign up, confirm their own email and read all bookings/customers. New profiles now start **inactive** (RLS + `/login` both require `is_active`). Checked production first: the owner was the only auth user, so nothing was exposed. Verified live: `handle_new_user` creates `'staff', false`. Supabase's own "Allow new users to sign up" switch is still on (a dashboard setting, not a migration) — recommended to turn off in Authentication → Sign In / Providers; don't `supabase config push` the local config.toml to do it, that would overwrite other live auth settings.
- **`scripts/local-stack/up.sh` / `down.sh`**: the throwaway Postgres + GoTrue + PostgREST + Deno-gateway harness (host networking) is now in the repo, with owner/staff/stranger test users — use it instead of `supabase start`, which can't run in this Codespace. Scratchpad files don't survive Codespace restarts.
- Verified locally: calendar-cell → pre-filled form → existing customer, hotel source, baby seats, override with reason → booking created confirmed with the car assigned and on the calendar; staff account walk-in with a new customer at the airport (airport delivery added, unassigned, flagged in the list); a raw sign-up is refused at login and sees 0 rows via RLS.

**Blocks B3/B4 — Public pages (P3.3, P3.4, P4.1): complete and live (0009 pushed 25 Sep 2026, types regenerated from live).**

- **`/cars/[slug]`**: photo, h1 + class badge, spec grid, description, three rate tiers, "What's included" (features), rental FAQ (`settings.rental_faqs`, native `<details>` via `components/public/FAQAccordion.tsx`), sticky `components/public/car/CarBookingCard.tsx` (live estimate via `calculateBookingTotal`, real check via `checkAvailability`, alternatives when not free, Continue → `/booking/trip?category&location&from&to[&return]` — BookingProvider now accepts `return=<slug>`), "Similar cars" (nearest class, then nearest rate — most classes hold one model), Product + FAQPage + BreadcrumbList JSON-LD. Fixes the homepage carousel's links, which 404'd.
- **`/search?location&from&to`**: only available cars, each with the whole-trip total (`CarCard` gained `priceNote` and `href`), class pills + sort, "Change search" reopens `SearchWidget` pre-filled (it now takes `initial` and submits to `/search`, not `/cars`). Nothing free → other pickup points with cars for the same dates + the same location on shifted dates. Invalid params redirect to `/cars`. `noindex`.
- **`/locations`** (map + cards with public per-location counts) and **`/locations/[slug]`** (hero "Car Rental in/at X" + live from-price, pre-filled search, cars free tomorrow, office / hotel delivery with partner hotels / custom pickup, `intro_content`, drive times, local FAQ, other locations; AutoRental with geo/priceRange/openingHours + FAQPage + BreadcrumbList JSON-LD). `components/public/MauritiusMap.tsx`: SVG from ~20 real coastal coordinates, markers by lat/long, label collision avoidance (verified no overlaps or clipping at 1440px and 375px).
- **SEO plumbing**: `lib/supabase/public.ts` (cookie-less anon client so SEO pages are statically generated with `revalidate = 300`), `lib/site.ts` `siteUrl()` (NEXT_PUBLIC_SITE_URL → Vercel production URL → localhost) + root `metadataBase`, canonical URLs, `components/public/JsonLd.tsx` (escapes `<`), `Breadcrumbs`, `app/sitemap.ts` (home, /cars, every car, /locations, every location), `app/robots.ts` (disallows /admin, /login, /auth, /booking, /search). `lowestDailyRate()` added to `lib/pricing.ts` for every "from Rs X/day".
- **Migration 0009**: `locations.opening_hours / drive_times / faqs`, `settings.rental_faqs`, `location_fleet_counts` view (anon aggregate, same pattern as 0005), and location `seo_title`s switched from a hardcoded "Rs 2,700" (the Celerio's 3-5 day rate, would go stale) to a `{from_price}` placeholder filled by `locationSeoTitle()` from live rates. Same content mirrored into seed.sql; backfill tested against a previously seeded DB. **All of this copy is DRAFT for the client to confirm** — drive times are approximate, opening hours assume the booking flow's 08:00-18:00, and the rental FAQ deliberately states no deposit amount or minimum age.
- `app/(public)/not-found.tsx` (styled, `noindex`). Unknown car/location slugs render it with HTTP 200 + `noindex` rather than a hard 404: `(public)/loading.tsx` makes every page stream, and `dynamicParams = false` would 404 newly added cars/locations until the next deploy.
- Verified locally (Playwright + `next build`/`next start`): 12 car + 6 location pages prerendered; estimate/check/continue into the booking flow with a different return location; search totals/sort/empty-state suggestions; map markers link through; JSON-LD parses; sitemap 21 URLs; no browser errors; no horizontal overflow at 375px.

**Next up:** B9: P9.1 locations admin (the place to edit the new drive times/FAQs/opening hours), P9.2 hotel partners, P9.3 storage/settings/polish. Navbar still links to /about and /contact, which don't exist.
