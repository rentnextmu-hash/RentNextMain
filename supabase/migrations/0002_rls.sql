-- 0002_rls.sql
-- RentNext — Row Level Security.
--
-- Judgement calls made here, flagged for review:
--   1. `is_staff()` / `is_role()` are STABLE SECURITY DEFINER functions with
--      an explicit `search_path`. They're SECURITY DEFINER specifically so
--      that policies on `profiles` itself can call them without recursing
--      back into RLS on `profiles` (a normal function would re-trigger the
--      policy it's being used to evaluate).
--   2. The P1.2 brief's literal rule is "staff may do everything on every
--      table, except: (a) only owner/manager may DELETE vehicles or
--      bookings, (b) only owner may write to settings or profiles." I've
--      followed that literally — e.g. `payments` gets full staff CRUD
--      (recording a payment is a routine staff action), even though the
--      earlier descriptive table in the doc says "write restricted by
--      role" for payments without naming which role. The executable
--      instruction wins over the summary table.
--   3. "Only owner may write to profiles" is read as INSERT/UPDATE/DELETE
--      via the normal client. The one exception is the new-user trigger
--      below, which is SECURITY DEFINER and so bypasses RLS entirely —
--      that's how a brand-new staff account gets its first profiles row
--      before any owner has acted.
--   4. `booking_reference_counters` (an internal table added in 0001 to
--      back `generate_booking_reference()`) is locked to staff-only, no
--      anon access. `generate_booking_reference()` itself only ever runs
--      inside the `create-booking` Edge Function under the service role,
--      which bypasses RLS, so this table is never touched directly by a
--      browser client either way.

-- ────────────────────────────────────────────────────────────────────────
-- Enable RLS everywhere
-- ────────────────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table locations enable row level security;
alter table vehicle_categories enable row level security;
alter table vehicles enable row level security;
alter table hotels enable row level security;
alter table customers enable row level security;
alter table add_ons enable row level security;
alter table bookings enable row level security;
alter table booking_add_ons enable row level security;
alter table payments enable row level security;
alter table settings enable row level security;
alter table booking_reference_counters enable row level security;

-- ────────────────────────────────────────────────────────────────────────
-- Helper functions
-- ────────────────────────────────────────────────────────────────────────
create function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and is_active = true
  );
$$;

create function is_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and is_active = true and role = any(roles)
  );
$$;

-- ────────────────────────────────────────────────────────────────────────
-- vehicle_categories — public read (active only), full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "anon_select_active" on vehicle_categories
  for select to anon
  using (is_active = true);

create policy "staff_select" on vehicle_categories
  for select to authenticated using (is_staff());
create policy "staff_insert" on vehicle_categories
  for insert to authenticated with check (is_staff());
create policy "staff_update" on vehicle_categories
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on vehicle_categories
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- locations — public read (active only), full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "anon_select_active" on locations
  for select to anon
  using (is_active = true);

create policy "staff_select" on locations
  for select to authenticated using (is_staff());
create policy "staff_insert" on locations
  for insert to authenticated with check (is_staff());
create policy "staff_update" on locations
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on locations
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- add_ons — public read (active only), full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "anon_select_active" on add_ons
  for select to anon
  using (is_active = true);

create policy "staff_select" on add_ons
  for select to authenticated using (is_staff());
create policy "staff_insert" on add_ons
  for insert to authenticated with check (is_staff());
create policy "staff_update" on add_ons
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on add_ons
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- settings — public read (all rows, display settings only), owner writes
-- ────────────────────────────────────────────────────────────────────────
create policy "anon_select_all" on settings
  for select to anon
  using (true);

create policy "staff_select" on settings
  for select to authenticated using (is_staff());
create policy "owner_insert" on settings
  for insert to authenticated with check (is_role(array['owner']));
create policy "owner_update" on settings
  for update to authenticated using (is_role(array['owner'])) with check (is_role(array['owner']));
create policy "owner_delete" on settings
  for delete to authenticated using (is_role(array['owner']));

-- ────────────────────────────────────────────────────────────────────────
-- hotels — no anon access, full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on hotels
  for select to authenticated using (is_staff());
create policy "staff_insert" on hotels
  for insert to authenticated with check (is_staff());
create policy "staff_update" on hotels
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on hotels
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- vehicles — no anon access; owner/manager only for DELETE
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on vehicles
  for select to authenticated using (is_staff());
create policy "staff_insert" on vehicles
  for insert to authenticated with check (is_staff());
create policy "staff_update" on vehicles
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "owner_manager_delete" on vehicles
  for delete to authenticated using (is_role(array['owner', 'manager']));

-- ────────────────────────────────────────────────────────────────────────
-- customers — no anon access (INSERT happens only via the create-booking
-- Edge Function's service role, which bypasses RLS), full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on customers
  for select to authenticated using (is_staff());
create policy "staff_insert" on customers
  for insert to authenticated with check (is_staff());
create policy "staff_update" on customers
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on customers
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- bookings — no anon access (INSERT happens only via the create-booking
-- Edge Function's service role); owner/manager only for DELETE
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on bookings
  for select to authenticated using (is_staff());
create policy "staff_insert" on bookings
  for insert to authenticated with check (is_staff());
create policy "staff_update" on bookings
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "owner_manager_delete" on bookings
  for delete to authenticated using (is_role(array['owner', 'manager']));

-- ────────────────────────────────────────────────────────────────────────
-- booking_add_ons — no anon access, full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on booking_add_ons
  for select to authenticated using (is_staff());
create policy "staff_insert" on booking_add_ons
  for insert to authenticated with check (is_staff());
create policy "staff_update" on booking_add_ons
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on booking_add_ons
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- payments — no anon access, full staff access
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on payments
  for select to authenticated using (is_staff());
create policy "staff_insert" on payments
  for insert to authenticated with check (is_staff());
create policy "staff_update" on payments
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "staff_delete" on payments
  for delete to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- profiles — staff can read every profile; only owner writes
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on profiles
  for select to authenticated using (is_staff());
create policy "owner_insert" on profiles
  for insert to authenticated with check (is_role(array['owner']));
create policy "owner_update" on profiles
  for update to authenticated using (is_role(array['owner'])) with check (is_role(array['owner']));
create policy "owner_delete" on profiles
  for delete to authenticated using (is_role(array['owner']));

-- ────────────────────────────────────────────────────────────────────────
-- booking_reference_counters — internal, staff-only (never touched by a
-- browser client in practice; generate_booking_reference() runs under the
-- service role inside the create-booking Edge Function)
-- ────────────────────────────────────────────────────────────────────────
create policy "staff_select" on booking_reference_counters
  for select to authenticated using (is_staff());

-- ────────────────────────────────────────────────────────────────────────
-- auth.users -> profiles provisioning trigger
-- Every new auth user gets a `staff` profiles row automatically. An owner
-- then promotes them to `manager`/`owner` as needed (owner-only write,
-- per the policies above). SECURITY DEFINER so this bypasses RLS — it has
-- to, since the new user has no profiles row yet to satisfy is_role('owner').
-- ────────────────────────────────────────────────────────────────────────
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'staff', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
