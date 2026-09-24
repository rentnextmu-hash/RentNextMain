-- 0006_booking_flow.sql
-- Everything the public booking flow (Block B5) needs from the database.
--
--   1. add_ons.max_quantity — baby seats and additional drivers can be
--      booked up to 3 at a time; everything else is a single yes/no. A
--      column rather than a hardcoded slug list so the owner can change it
--      from the admin later, and so the create-booking Edge Function can
--      enforce it server-side.
--   2. customers.marketing_consent / bookings.terms_accepted_at — the
--      details step asks for both; consent has to be recorded to be worth
--      asking for.
--   3. public_partner_hotels — the trip step's "deliver to my hotel"
--      select needs hotel names, but `hotels` is staff-only RLS (it holds
--      contact details and commission rates). Same pattern as 0005's
--      category_available_counts: a view that runs with its owner's
--      privileges and exposes only the harmless columns, granted to anon.
--   4. create_booking_request() — the single transaction the blueprint
--      asks for (customer upsert + booking + booking_add_ons). supabase-js
--      has no client-side transactions, so the Edge Function validates,
--      re-checks availability and prices everything via lib/pricing.ts,
--      then hands the final figures to this function to write atomically.
--      No pricing maths happens in here — it stores what it is given.
--      Execute is revoked from everyone except service_role, so the only
--      way to create a website booking remains the create-booking Edge
--      Function.

-- ────────────────────────────────────────────────────────────────────────
-- 1. add_ons.max_quantity
-- ────────────────────────────────────────────────────────────────────────
alter table add_ons
  add column max_quantity int not null default 1 check (max_quantity between 1 and 10);

update add_ons set max_quantity = 3 where slug in ('baby-seat', 'additional-driver');

-- ────────────────────────────────────────────────────────────────────────
-- 2. Consent columns
-- ────────────────────────────────────────────────────────────────────────
alter table customers add column marketing_consent boolean not null default false;
alter table bookings add column terms_accepted_at timestamptz;

-- ────────────────────────────────────────────────────────────────────────
-- 3. public_partner_hotels
-- ────────────────────────────────────────────────────────────────────────
create view public.public_partner_hotels as
select id, name, slug, location_id
from hotels
where is_active and contract_status = 'active';

grant select on public.public_partner_hotels to anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────
-- 4. create_booking_request()
-- ────────────────────────────────────────────────────────────────────────
create function create_booking_request(
  p_customer jsonb,          -- first_name, last_name, email, phone, country, hotel_id, flight_number, marketing_consent
  p_category_id uuid,
  p_pickup_location_id uuid,
  p_return_location_id uuid,
  p_pickup_at timestamptz,
  p_return_at timestamptz,
  p_days int,
  p_car_total_mur int,
  p_addons_total_mur int,
  p_total_mur int,
  p_hotel_id uuid,
  p_notes text,
  p_add_ons jsonb            -- [{ add_on_id, quantity, unit_price_mur, total_mur }]
)
returns table (booking_id uuid, reference text)
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_booking_id uuid;
  v_reference text;
  v_email text := lower(trim(p_customer->>'email'));
begin
  -- Guest checkout has no accounts, so "the same customer" means the same
  -- email address. Latest details win, so staff always see the phone
  -- number the customer most recently gave.
  select id into v_customer_id
  from customers
  where lower(email) = v_email
  order by created_at
  limit 1
  for update;

  if v_customer_id is null then
    insert into customers (first_name, last_name, email, phone, country, hotel_id, flight_number, marketing_consent)
    values (
      p_customer->>'first_name', p_customer->>'last_name', v_email, p_customer->>'phone',
      p_customer->>'country', (p_customer->>'hotel_id')::uuid, p_customer->>'flight_number',
      coalesce((p_customer->>'marketing_consent')::boolean, false)
    )
    returning id into v_customer_id;
  else
    update customers set
      first_name = p_customer->>'first_name',
      last_name = p_customer->>'last_name',
      phone = p_customer->>'phone',
      country = coalesce(p_customer->>'country', country),
      hotel_id = coalesce((p_customer->>'hotel_id')::uuid, hotel_id),
      flight_number = coalesce(p_customer->>'flight_number', flight_number),
      -- Consent is only ever granted here, never silently withdrawn by a
      -- later booking that left the box unticked.
      marketing_consent = marketing_consent or coalesce((p_customer->>'marketing_consent')::boolean, false)
    where id = v_customer_id;
  end if;

  v_reference := generate_booking_reference();

  insert into bookings (
    reference, customer_id, category_id, pickup_location_id, return_location_id,
    pickup_at, return_at, days, status, car_total_mur, addons_total_mur, total_mur,
    source, hotel_id, notes, terms_accepted_at
  )
  values (
    v_reference, v_customer_id, p_category_id, p_pickup_location_id, p_return_location_id,
    p_pickup_at, p_return_at, p_days, 'requested', p_car_total_mur, p_addons_total_mur, p_total_mur,
    'website', p_hotel_id, nullif(trim(p_notes), ''), now()
  )
  returning id into v_booking_id;

  insert into booking_add_ons (booking_id, add_on_id, quantity, unit_price_mur, total_mur)
  select v_booking_id, (a->>'add_on_id')::uuid, (a->>'quantity')::int, (a->>'unit_price_mur')::int, (a->>'total_mur')::int
  from jsonb_array_elements(coalesce(p_add_ons, '[]'::jsonb)) as a;

  return query select v_booking_id, v_reference;
end;
$$;

revoke execute on function create_booking_request from public, anon, authenticated;
grant execute on function create_booking_request to service_role;
