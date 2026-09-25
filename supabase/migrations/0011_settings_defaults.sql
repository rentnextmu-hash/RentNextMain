-- 0011_settings_defaults.sql
-- Default rows for the settings the owner-only /admin/settings page (P9.3)
-- manages but that weren't seeded yet. Idempotent: only fills gaps, never
-- overwrites a value the owner has already set. The settings table is
-- key/value jsonb; anon may SELECT (display config), only owner may write
-- (0002_rls.sql), so the settings form runs as the signed-in owner.
insert into settings (key, value) values
  ('company_email', '"info@rentnext.net"'),
  ('company_whatsapp', '"+230 5500 1415"'),
  ('company_address', '"Royal Road, Grand Baie, Mauritius"'),
  ('advance_booking_days', '365'),
  ('cancellation_hours', '48')
on conflict (key) do nothing;
