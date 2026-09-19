-- 0001_initial_schema.sql
-- RentNext — initial schema. Eleven tables: three (profiles, booking_add_ons,
-- payments) exist mostly to hold the shape open for V2.
--
-- Judgement calls made here, flagged for review:
--   1. `profiles.id` intentionally has no default — it is always set
--      explicitly to auth.users.id by the signup trigger in 0002_rls.sql,
--      never generated independently.
--   2. Money is `integer` (whole MUR), matching the blueprint's rule that
--      Mauritian rupee pricing is whole-rupee in practice.
--   3. `vehicles.code` and `vehicles.registration` are UNIQUE but not
--      validated for format here (e.g. "VITZ-001") — that's an application
--      + zod concern, not a database constraint, so a future model prefix
--      change never requires a migration.
--   4. `generate_booking_reference()` uses a `booking_reference_counters`
--      side table (date -> last sequence) rather than counting existing
--      bookings for the day, so it stays correct even after a booking is
--      later cancelled or deleted — a pure COUNT(*) would reuse numbers.
--   5. All FKs from `bookings`/`vehicles`/etc. to lookup tables default to
--      RESTRICT (Postgres default) rather than CASCADE, since deleting a
--      location that still has vehicles or bookings attached should fail
--      loudly, not silently orphan data. The exception is `booking_add_ons`
--      and `payments`, which CASCADE from `bookings` — they only exist in
--      the context of a booking.

-- ────────────────────────────────────────────────────────────────────────
-- Extensions
-- ────────────────────────────────────────────────────────────────────────
create extension if not exists pgcrypto; -- gen_random_uuid()

-- ────────────────────────────────────────────────────────────────────────
-- profiles — staff, 1:1 with auth.users
-- ────────────────────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  location_id uuid, -- FK added after locations exists
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- locations — pickup points and SEO pages
-- ────────────────────────────────────────────────────────────────────────
create table locations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  type text not null default 'branch' check (type in ('branch', 'airport', 'hotel', 'custom')),
  region text,
  address text,
  latitude numeric,
  longitude numeric,
  is_pickup_point boolean not null default true,
  seo_title text,
  seo_description text,
  intro_content text,
  image_path text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles
  add constraint profiles_location_id_fkey foreign key (location_id) references locations(id);

-- ────────────────────────────────────────────────────────────────────────
-- vehicle_categories — what the customer shops for
-- ────────────────────────────────────────────────────────────────────────
create table vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  make text,
  model text,
  category text not null check (category in ('economy', 'comfort', 'suv', 'premium')),
  transmission text not null default 'automatic' check (transmission in ('automatic', 'manual')),
  seats int not null default 5,
  doors int not null default 5,
  fuel_type text not null default 'petrol' check (fuel_type in ('petrol', 'diesel', 'hybrid', 'electric')),
  air_conditioning boolean not null default true,
  daily_rate_mur int not null check (daily_rate_mur > 0),
  description text,
  features jsonb not null default '[]'::jsonb,
  image_path text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- vehicles — physical cars. Never public.
-- ────────────────────────────────────────────────────────────────────────
create table vehicles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references vehicle_categories(id),
  code text not null unique, -- VITZ-001
  registration text not null unique,
  location_id uuid not null references locations(id),
  status text not null default 'available' check (status in ('available', 'booked', 'maintenance', 'inactive')),
  mileage_km int not null default 0,
  year int,
  colour text,
  notes text,
  acquired_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- hotels — partner accommodation
-- ────────────────────────────────────────────────────────────────────────
create table hotels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location_id uuid references locations(id),
  contact_name text,
  contact_email text,
  contact_phone text,
  contract_status text not null default 'pending' check (contract_status in ('active', 'pending', 'inactive')),
  commission_rate numeric not null default 0,
  pickup_notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- customers — guest checkout, no login in V1
-- ────────────────────────────────────────────────────────────────────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  country text,
  hotel_id uuid references hotels(id),
  flight_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- add_ons
-- ────────────────────────────────────────────────────────────────────────
create table add_ons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  price_mur int not null check (price_mur >= 0),
  price_type text not null default 'per_booking' check (price_type in ('per_day', 'per_booking')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- bookings — the centre of the system
-- ────────────────────────────────────────────────────────────────────────
create table bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique, -- CR-20260918-001
  customer_id uuid not null references customers(id),
  category_id uuid not null references vehicle_categories(id),
  vehicle_id uuid references vehicles(id), -- nullable until assigned
  pickup_location_id uuid not null references locations(id),
  return_location_id uuid not null references locations(id),
  pickup_at timestamptz not null,
  return_at timestamptz not null,
  days int not null check (days > 0),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'active', 'completed', 'cancelled')),
  car_total_mur int not null check (car_total_mur >= 0),
  addons_total_mur int not null default 0 check (addons_total_mur >= 0),
  total_mur int not null check (total_mur >= 0),
  source text not null default 'website' check (source in ('website', 'phone', 'hotel', 'walk_in')),
  hotel_id uuid references hotels(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_return_after_pickup check (return_at > pickup_at)
);

-- ────────────────────────────────────────────────────────────────────────
-- booking_add_ons
-- ────────────────────────────────────────────────────────────────────────
create table booking_add_ons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  add_on_id uuid not null references add_ons(id),
  quantity int not null default 1 check (quantity > 0),
  unit_price_mur int not null check (unit_price_mur >= 0),
  total_mur int not null check (total_mur >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- payments — shape only in V1
-- ────────────────────────────────────────────────────────────────────────
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  amount_mur int not null check (amount_mur >= 0),
  method text check (method in ('cash', 'card', 'transfer', 'online')),
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded', 'failed')),
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- settings
-- ────────────────────────────────────────────────────────────────────────
create table settings (
  key text primary key,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────────────
-- Indexes
-- ────────────────────────────────────────────────────────────────────────
create index bookings_pickup_return_idx on bookings (pickup_at, return_at);
create index bookings_status_idx on bookings (status);
create index bookings_vehicle_id_idx on bookings (vehicle_id);
create index vehicles_location_id_idx on vehicles (location_id);
create index vehicles_status_idx on vehicles (status);
create index vehicles_category_id_idx on vehicles (category_id);

-- ────────────────────────────────────────────────────────────────────────
-- updated_at trigger — applied to every table that has the column
-- ────────────────────────────────────────────────────────────────────────
create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'locations', 'vehicle_categories', 'vehicles', 'hotels',
    'customers', 'add_ons', 'bookings', 'booking_add_ons', 'payments', 'settings'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()',
      t
    );
  end loop;
end;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- generate_booking_reference() — CR-YYYYMMDD-NNN, zero-padded daily counter
-- ────────────────────────────────────────────────────────────────────────
create table booking_reference_counters (
  reference_date date primary key,
  last_sequence int not null default 0
);

create function generate_booking_reference()
returns text
language plpgsql
as $$
declare
  today date := (now() at time zone 'Indian/Mauritius')::date;
  next_seq int;
begin
  insert into booking_reference_counters (reference_date, last_sequence)
  values (today, 1)
  on conflict (reference_date)
  do update set last_sequence = booking_reference_counters.last_sequence + 1
  returning last_sequence into next_seq;

  return 'CR-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_seq::text, 3, '0');
end;
$$;
