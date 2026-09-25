-- 0008_staff_bookings.sql
-- Staff-created bookings (P8.4, /admin/bookings/new): counter and phone
-- bookings entered by staff rather than through the website.
--
--   1. Price overrides. Staff can agree a different price (a regular
--      customer, a long rental, a damaged-car discount). The calculated
--      price is kept in original_total_mur and a reason is required, so
--      the override is always visible and explainable later. total_mur
--      stays the amount actually charged; car_total_mur/addons_total_mur
--      stay the calculated breakdown.
--   2. generate_booking_reference() becomes SECURITY DEFINER. It writes to
--      booking_reference_counters, which staff can only SELECT under RLS
--      (0002) — until now only the service-role create-booking function
--      called it. Definer rights let a signed-in staff member draw the next
--      number without being able to edit the counters directly. Execute is
--      limited to authenticated + service_role, so anonymous callers can't
--      burn through reference numbers.
--   3. create_staff_booking() — customer (existing or new, deduplicated by
--      email) + booking + add-ons + vehicle status in one transaction.
--      SECURITY INVOKER: runs as the signed-in staff member, so the normal
--      staff RLS policies apply. Prices and availability are computed
--      before calling it, by lib/pricing.ts and lib/availability.ts in the
--      server action — no pricing or availability logic lives in here.

-- ────────────────────────────────────────────────────────────────────────
-- 1. Price override columns
-- ────────────────────────────────────────────────────────────────────────
alter table bookings
  add column original_total_mur int check (original_total_mur >= 0),
  add column price_override_reason text,
  add constraint bookings_override_has_reason
    check ((original_total_mur is null) = (price_override_reason is null));

-- ────────────────────────────────────────────────────────────────────────
-- 2. generate_booking_reference() with definer rights
-- ────────────────────────────────────────────────────────────────────────
alter function generate_booking_reference() security definer set search_path = public;
revoke execute on function generate_booking_reference() from public, anon;
grant execute on function generate_booking_reference() to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 3. create_staff_booking()
-- ────────────────────────────────────────────────────────────────────────
create function create_staff_booking(
  p_customer_id uuid,          -- existing customer, or null to use p_new_customer
  p_new_customer jsonb,        -- first_name, last_name, email, phone, country
  p_category_id uuid,
  p_vehicle_id uuid,           -- null = leave unassigned
  p_pickup_location_id uuid,
  p_return_location_id uuid,
  p_pickup_at timestamptz,
  p_return_at timestamptz,
  p_days int,
  p_status text,
  p_source text,
  p_hotel_id uuid,
  p_car_total_mur int,
  p_addons_total_mur int,
  p_total_mur int,
  p_original_total_mur int,    -- set only when the price was overridden
  p_price_override_reason text,
  p_internal_notes text,
  p_staff_id uuid,
  p_add_ons jsonb              -- [{ add_on_id, quantity, unit_price_mur, total_mur }]
)
returns table (booking_id uuid, reference text)
language plpgsql
as $$
declare
  v_customer_id uuid := p_customer_id;
  v_email text;
  v_booking_id uuid;
  v_reference text;
begin
  if v_customer_id is null then
    v_email := lower(trim(p_new_customer->>'email'));
    -- Same person, same email: reuse the record rather than duplicating it.
    select id into v_customer_id from customers where lower(email) = v_email order by created_at limit 1;
    if v_customer_id is null then
      insert into customers (first_name, last_name, email, phone, country, hotel_id)
      values (
        p_new_customer->>'first_name', p_new_customer->>'last_name', v_email,
        p_new_customer->>'phone', nullif(p_new_customer->>'country', ''), p_hotel_id
      )
      returning id into v_customer_id;
    end if;
  end if;

  v_reference := generate_booking_reference();

  insert into bookings (
    reference, customer_id, category_id, vehicle_id, pickup_location_id, return_location_id,
    pickup_at, return_at, days, status, source, hotel_id,
    car_total_mur, addons_total_mur, total_mur, original_total_mur, price_override_reason,
    internal_notes, internal_notes_updated_at, internal_notes_updated_by
  )
  values (
    v_reference, v_customer_id, p_category_id, p_vehicle_id, p_pickup_location_id, p_return_location_id,
    p_pickup_at, p_return_at, p_days, p_status, p_source, p_hotel_id,
    p_car_total_mur, p_addons_total_mur, p_total_mur, p_original_total_mur, nullif(trim(p_price_override_reason), ''),
    nullif(trim(p_internal_notes), ''),
    case when nullif(trim(p_internal_notes), '') is not null then now() end,
    case when nullif(trim(p_internal_notes), '') is not null then p_staff_id end
  )
  returning id into v_booking_id;

  insert into booking_add_ons (booking_id, add_on_id, quantity, unit_price_mur, total_mur)
  select v_booking_id, (a->>'add_on_id')::uuid, (a->>'quantity')::int, (a->>'unit_price_mur')::int, (a->>'total_mur')::int
  from jsonb_array_elements(coalesce(p_add_ons, '[]'::jsonb)) as a;

  -- Same rule as assign_booking_vehicle() (0007): an assigned car is booked.
  if p_vehicle_id is not null then
    update vehicles set status = 'booked' where id = p_vehicle_id and status = 'available';
  end if;

  return query select v_booking_id, v_reference;
end;
$$;

revoke execute on function create_staff_booking from public, anon;
grant execute on function create_staff_booking to authenticated, service_role;

-- ────────────────────────────────────────────────────────────────────────
-- 4. Security fix: new auth users start INACTIVE
-- ────────────────────────────────────────────────────────────────────────
-- The 0002 trigger gave every new auth user an *active* staff profile.
-- Public sign-up is enabled on the project by default, so anyone holding
-- the (public) anon key could sign up, confirm their own email and get
-- full staff access to every booking and customer record. Found while
-- building this migration; no one had used it (the only auth user was the
-- owner). New profiles now start inactive — is_staff() and every staff
-- RLS policy require is_active, and /login rejects inactive profiles — so
-- a stranger's sign-up grants nothing. The owner activates real staff
-- accounts: update profiles set is_active = true where id = '<user-id>'.
-- Existing profiles are unaffected. Disabling sign-up in the Auth settings
-- as well is still recommended.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'staff', false);
  return new;
end;
$$;
