-- 0014_audit_log.sql
-- V2 Admin: an audit log — an immutable "who changed what, when" record for
-- the core tables. Captured by a database trigger, not the app, so it can't be
-- bypassed (RLS, a future non-web writer, or direct SQL all still record).
--
-- Design:
--   * Append-only: staff never insert/update/delete rows. Only the trigger
--     writes, via SECURITY DEFINER. RLS grants SELECT to owner/manager only
--     (the log can reveal who did what — sensitive), and no other policy, so
--     every other operation is denied by default.
--   * Actor is auth.uid() at the time of the change. Service-role writes (the
--     public create-booking Edge Function) have no uid → recorded as the
--     system/website. Actor email + name are denormalised so the row stays
--     readable even if the profile is later removed.
--   * changes: for UPDATE, only the columns that actually changed, each
--     {from,to}; for INSERT/DELETE, the row snapshot.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_email text,
  actor_name text,
  action text not null check (action in ('insert', 'update', 'delete')),
  entity text not null,
  entity_id text,
  summary text,
  changes jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

alter table public.audit_log enable row level security;

-- Read: owner and manager only. No insert/update/delete policy exists, so RLS
-- denies those for every client — the table is append-only from the app's side.
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log
  for select to authenticated using (is_role(array['owner', 'manager']));

revoke all on public.audit_log from anon;

create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_name text;
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_entity_id text;
  v_label text;
  k text;
begin
  if v_actor is not null then
    select u.email into v_email from auth.users u where u.id = v_actor;
    select p.full_name into v_name from public.profiles p where p.id = v_actor;
  end if;

  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_row := coalesce(v_new, v_old);

  -- entity_id doubles as the link key for the admin viewer: the human key each
  -- detail page routes by (reference / slug), else the primary key.
  v_entity_id := case tg_table_name
    when 'bookings' then v_row->>'reference'
    when 'locations' then v_row->>'slug'
    when 'hotels' then v_row->>'slug'
    when 'settings' then v_row->>'key'
    else coalesce(v_row->>'id', v_row->>'key')
  end;

  v_label := case tg_table_name
    when 'bookings' then 'Booking ' || coalesce(v_row->>'reference', '')
    when 'vehicles' then 'Vehicle ' || coalesce(v_row->>'code', '')
    when 'vehicle_categories' then 'Category ' || coalesce(v_row->>'name', '')
    when 'add_ons' then 'Add-on ' || coalesce(v_row->>'name', '')
    when 'locations' then 'Location ' || coalesce(v_row->>'name', '')
    when 'hotels' then 'Hotel ' || coalesce(v_row->>'name', '')
    when 'settings' then 'Setting ' || coalesce(v_row->>'key', '')
    when 'customers' then 'Customer ' || trim(coalesce(v_row->>'first_name', '') || ' ' || coalesce(v_row->>'last_name', ''))
    when 'payments' then 'Payment'
    else tg_table_name
  end;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if v_new->k is distinct from v_old->k then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('from', v_old->k, 'to', v_new->k));
      end if;
    end loop;
    -- A bare updated_at bump isn't worth a log line.
    v_changes := v_changes - 'updated_at';
    if v_changes = '{}'::jsonb then return null; end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new;
  else
    v_changes := v_old;
  end if;

  insert into public.audit_log (actor_id, actor_email, actor_name, action, entity, entity_id, summary, changes)
  values (v_actor, v_email, v_name, lower(tg_op), tg_table_name, v_entity_id, v_label, v_changes);

  return null;
end;
$$;

-- Attach to the core tables. AFTER, per row, so the final state (including any
-- BEFORE-trigger edits, e.g. the bookings_status_guard timestamps) is captured.
do $$
declare
  t text;
begin
  foreach t in array array[
    'bookings', 'vehicles', 'vehicle_categories', 'add_ons',
    'locations', 'hotels', 'settings', 'customers', 'payments'
  ]
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format(
      'create trigger audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.record_audit()',
      t
    );
  end loop;
end $$;
