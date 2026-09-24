-- 0007_booking_operations.sql
-- What the admin booking pages (Block B8) need from the database.
--
--   1. Status timestamps — confirmed_at, vehicle_assigned_at, picked_up_at,
--      returned_at, cancelled_at — for the booking detail's status
--      timeline. Set by trigger, never by application code, so they can't
--      drift from the status itself. Existing rows are backfilled from the
--      best evidence available (created_at / pickup_at / return_at).
--   2. Status transitions enforced in the database:
--        requested -> confirmed -> active -> completed
--        requested | confirmed | active -> cancelled
--      completed and cancelled are final, and a booking can't go active
--      without a vehicle. Enforced by trigger so every writer — the admin
--      UI, a future WhatsApp bot, a hand-written SQL fix — obeys the same
--      rules.
--   3. internal_notes (+ who/when last edited) — staff notes, kept apart
--      from bookings.notes, which holds the customer's own special requests
--      from the website and shouldn't be overwritten by staff.
--   4. assign_booking_vehicle() / transition_booking() — the multi-table
--      side effects of an operational action (booking + vehicle status +
--      mileage) in one transaction. SECURITY INVOKER: they run as the
--      signed-in staff member, so the normal staff RLS policies apply.
--      Whether a vehicle is actually free is checked beforehand in
--      lib/availability.ts — the one place availability rules live.
--      Vehicle status follows the blueprint's demo script: assigning a car
--      marks it booked; completing or cancelling releases it back to
--      available unless another open booking still holds it.

-- ────────────────────────────────────────────────────────────────────────
-- 1 + 3. Columns
-- ────────────────────────────────────────────────────────────────────────
alter table bookings
  add column confirmed_at timestamptz,
  add column vehicle_assigned_at timestamptz,
  add column picked_up_at timestamptz,
  add column returned_at timestamptz,
  add column cancelled_at timestamptz,
  add column internal_notes text,
  add column internal_notes_updated_at timestamptz,
  add column internal_notes_updated_by uuid references profiles(id) on delete set null;

update bookings set
  confirmed_at = case when status in ('confirmed', 'active', 'completed') then created_at end,
  vehicle_assigned_at = case when vehicle_id is not null then created_at end,
  picked_up_at = case when status in ('active', 'completed') then pickup_at end,
  returned_at = case when status = 'completed' then return_at end,
  cancelled_at = case when status = 'cancelled' then updated_at end;

-- ────────────────────────────────────────────────────────────────────────
-- 2. Transition guard + timestamps
-- ────────────────────────────────────────────────────────────────────────
create function bookings_status_guard()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Rows inserted directly in a later state (seed data, staff-created
    -- bookings) get the timestamps their status implies.
    new.confirmed_at := coalesce(new.confirmed_at,
      case when new.status in ('confirmed', 'active', 'completed') then coalesce(new.created_at, now()) end);
    new.vehicle_assigned_at := coalesce(new.vehicle_assigned_at,
      case when new.vehicle_id is not null then coalesce(new.created_at, now()) end);
    new.picked_up_at := coalesce(new.picked_up_at,
      case when new.status in ('active', 'completed') then new.pickup_at end);
    new.returned_at := coalesce(new.returned_at, case when new.status = 'completed' then new.return_at end);
    new.cancelled_at := coalesce(new.cancelled_at, case when new.status = 'cancelled' then now() end);
    return new;
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'requested' and new.status in ('confirmed', 'cancelled')) or
      (old.status = 'confirmed' and new.status in ('active', 'cancelled')) or
      (old.status = 'active' and new.status in ('completed', 'cancelled'))
    ) then
      raise exception 'A % booking cannot become %.', old.status, new.status
        using errcode = 'check_violation', hint = 'booking_status_transition';
    end if;

    case new.status
      when 'confirmed' then new.confirmed_at := now();
      when 'active' then new.picked_up_at := now();
      when 'completed' then new.returned_at := now();
      when 'cancelled' then new.cancelled_at := now();
      else null;
    end case;
  end if;

  if new.status = 'active' and new.vehicle_id is null then
    raise exception 'Assign a vehicle before marking the booking as picked up.'
      using errcode = 'check_violation', hint = 'booking_needs_vehicle';
  end if;

  if new.vehicle_id is distinct from old.vehicle_id then
    if old.status in ('completed', 'cancelled') then
      raise exception 'The vehicle on a % booking can no longer be changed.', old.status
        using errcode = 'check_violation', hint = 'booking_status_transition';
    end if;
    new.vehicle_assigned_at := case when new.vehicle_id is not null then now() end;
  end if;

  return new;
end;
$$;

create trigger bookings_status_guard
  before insert or update on bookings
  for each row execute function bookings_status_guard();

-- ────────────────────────────────────────────────────────────────────────
-- 4. Operational actions
-- ────────────────────────────────────────────────────────────────────────

-- Sets a vehicle back to available if it's marked booked and no other
-- open (confirmed / active) booking still holds it.
create function release_vehicle_if_free(p_vehicle_id uuid, p_except_booking_id uuid)
returns void
language plpgsql
as $$
begin
  if p_vehicle_id is null then return; end if;
  update vehicles v set status = 'available'
  where v.id = p_vehicle_id
    and v.status = 'booked'
    and not exists (
      select 1 from bookings b
      where b.vehicle_id = p_vehicle_id
        and b.id <> p_except_booking_id
        and b.status in ('confirmed', 'active')
    );
end;
$$;

create function assign_booking_vehicle(p_booking_id uuid, p_vehicle_id uuid)
returns void
language plpgsql
as $$
declare
  v_old_vehicle uuid;
begin
  select vehicle_id into v_old_vehicle from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;

  update bookings set vehicle_id = p_vehicle_id where id = p_booking_id;

  if p_vehicle_id is not null then
    update vehicles set status = 'booked' where id = p_vehicle_id and status = 'available';
  end if;
  if v_old_vehicle is distinct from p_vehicle_id then
    perform release_vehicle_if_free(v_old_vehicle, p_booking_id);
  end if;
end;
$$;

create function transition_booking(
  p_booking_id uuid,
  p_to_status text,
  p_vehicle_id uuid default null,        -- assign this vehicle first (used by "confirm")
  p_return_mileage_km int default null   -- required when completing
)
returns void
language plpgsql
as $$
declare
  v_booking bookings%rowtype;
  v_current_mileage int;
begin
  if p_vehicle_id is not null then
    perform assign_booking_vehicle(p_booking_id, p_vehicle_id);
  end if;

  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;

  if p_to_status = 'completed' then
    if p_return_mileage_km is null then
      raise exception 'Enter the mileage on return.' using errcode = 'check_violation';
    end if;
    select mileage_km into v_current_mileage from vehicles where id = v_booking.vehicle_id;
    if p_return_mileage_km < v_current_mileage then
      raise exception 'Return mileage (% km) is below the current odometer reading (% km).',
        p_return_mileage_km, v_current_mileage using errcode = 'check_violation';
    end if;
  end if;

  -- The status guard trigger validates the transition itself.
  update bookings set status = p_to_status where id = p_booking_id;

  if p_to_status = 'active' then
    update vehicles set status = 'booked' where id = v_booking.vehicle_id and status = 'available';
  elsif p_to_status = 'completed' then
    update vehicles set mileage_km = p_return_mileage_km where id = v_booking.vehicle_id;
    perform release_vehicle_if_free(v_booking.vehicle_id, p_booking_id);
  elsif p_to_status = 'cancelled' then
    perform release_vehicle_if_free(v_booking.vehicle_id, p_booking_id);
  end if;
end;
$$;

-- Staff-only: anon has no RLS access to bookings/vehicles anyway, but
-- there's no reason for these to be callable without a session at all.
revoke execute on function release_vehicle_if_free, assign_booking_vehicle, transition_booking from public, anon;
grant execute on function release_vehicle_if_free, assign_booking_vehicle, transition_booking to authenticated, service_role;
