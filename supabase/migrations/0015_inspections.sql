-- 0015_inspections.sql
-- V2 Operations: check-out / check-in inspections with condition photos.
-- When staff hand a car over (check-out, at pickup) and when it comes back
-- (check-in, at return) they record mileage, fuel level, exterior condition
-- and photos — a record that protects both sides in a dispute.
--
-- The inspection is tied to the booking's existing lifecycle: recording the
-- check-out moves the booking to `active` (picked up); recording the check-in
-- completes it (using the return mileage). Both go through the existing
-- transition_booking() so the status guard, timestamps and vehicle-status
-- side effects stay single-sourced (0007).

create table if not exists public.booking_inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id),
  kind text not null check (kind in ('checkout', 'checkin')),
  mileage_km integer not null check (mileage_km >= 0),
  fuel_level text not null check (fuel_level in ('empty', 'quarter', 'half', 'three_quarters', 'full')),
  exterior_notes text,
  photos jsonb not null default '[]'::jsonb,
  inspected_by uuid references public.profiles (id),
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- One check-out and one check-in per booking (re-recording upserts).
  unique (booking_id, kind)
);

create index if not exists booking_inspections_booking_idx on public.booking_inspections (booking_id);

alter table public.booking_inspections enable row level security;

-- Staff read/write; only owner/manager may delete a record.
drop policy if exists booking_inspections_select on public.booking_inspections;
create policy booking_inspections_select on public.booking_inspections
  for select to authenticated using (is_staff());
drop policy if exists booking_inspections_insert on public.booking_inspections;
create policy booking_inspections_insert on public.booking_inspections
  for insert to authenticated with check (is_staff());
drop policy if exists booking_inspections_update on public.booking_inspections;
create policy booking_inspections_update on public.booking_inspections
  for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists booking_inspections_delete on public.booking_inspections;
create policy booking_inspections_delete on public.booking_inspections
  for delete to authenticated using (is_role(array['owner', 'manager']));

-- Record an inspection AND advance the booking, in one transaction.
-- SECURITY INVOKER, so staff RLS applies (mirrors transition_booking).
create or replace function public.record_inspection(
  p_booking_id uuid,
  p_kind text,
  p_mileage_km int,
  p_fuel_level text,
  p_exterior_notes text,
  p_photos jsonb,
  p_staff_id uuid
)
returns void
language plpgsql
security invoker
as $$
declare
  v_vehicle uuid;
begin
  select vehicle_id into v_vehicle from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found.'; end if;
  if v_vehicle is null then
    raise exception 'Assign a vehicle before recording an inspection.' using errcode = 'check_violation';
  end if;

  insert into public.booking_inspections
    (booking_id, vehicle_id, kind, mileage_km, fuel_level, exterior_notes, photos, inspected_by)
  values
    (p_booking_id, v_vehicle, p_kind, p_mileage_km, p_fuel_level,
     nullif(btrim(coalesce(p_exterior_notes, '')), ''), coalesce(p_photos, '[]'::jsonb), p_staff_id)
  on conflict (booking_id, kind) do update set
    mileage_km = excluded.mileage_km,
    fuel_level = excluded.fuel_level,
    exterior_notes = excluded.exterior_notes,
    photos = excluded.photos,
    inspected_by = excluded.inspected_by,
    inspected_at = now(),
    vehicle_id = excluded.vehicle_id;

  if p_kind = 'checkout' then
    -- Keep the odometer current at handover (never lower it).
    update public.vehicles set mileage_km = p_mileage_km where id = v_vehicle and p_mileage_km >= mileage_km;
    perform public.transition_booking(p_booking_id, 'active');
  elsif p_kind = 'checkin' then
    -- transition_booking validates return >= odometer and sets it.
    perform public.transition_booking(p_booking_id, 'completed', null, p_mileage_km);
  else
    raise exception 'Unknown inspection kind %', p_kind;
  end if;
end;
$$;

revoke execute on function public.record_inspection from public, anon;
grant execute on function public.record_inspection to authenticated, service_role;

-- Private `inspections` bucket for the condition photos. Guarded like 0012 so
-- it's a clean no-op if the storage schema is absent.
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema not present — skipping inspections bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('inspections', 'inspections', false, 5242880, array['image/webp', 'image/png', 'image/jpeg'])
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  -- Private bucket: staff-only read (via signed URLs) and write. No public read.
  execute 'drop policy if exists "rn_inspections_read" on storage.objects';
  execute $p$
    create policy "rn_inspections_read" on storage.objects
      for select to authenticated
      using (bucket_id = 'inspections' and public.is_staff())
  $p$;
  execute 'drop policy if exists "rn_inspections_insert" on storage.objects';
  execute $p$
    create policy "rn_inspections_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'inspections' and public.is_staff())
  $p$;
  execute 'drop policy if exists "rn_inspections_delete" on storage.objects';
  execute $p$
    create policy "rn_inspections_delete" on storage.objects
      for delete to authenticated
      using (bucket_id = 'inspections' and public.is_staff())
  $p$;
end $$;
