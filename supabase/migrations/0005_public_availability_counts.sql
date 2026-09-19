-- 0005_public_availability_counts.sql
-- The fleet showcase carousel needs a per-category "available now" count
-- on the public site, but `vehicles` is intentionally staff-only RLS (no
-- registration plates or vehicle codes on the public site, per the
-- blueprint's central domain rule) — an anon session gets zero rows back
-- from that table, silently, which is why getCategoriesWithFleetAvailability
-- returned 0 for everything.
--
-- Fix: a view that exposes only category_id + a count, nothing
-- vehicle-specific. Views run with the OWNER's privileges by default in
-- Postgres (security_invoker defaults to false), so this view reads
-- `vehicles` bypassing its RLS internally, while only ever returning an
-- aggregate — no code, registration, mileage or location leaks through.
create view public.category_available_counts as
select category_id, count(*)::int as available_count
from vehicles
where status = 'available'
group by category_id;

grant select on public.category_available_counts to anon, authenticated;
