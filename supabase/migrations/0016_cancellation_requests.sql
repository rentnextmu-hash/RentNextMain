-- 0016_cancellation_requests.sql
-- V2 customer-facing "manage my booking": a customer can request a
-- cancellation from their signed booking link. This is a REQUEST, not an
-- auto-cancel — it flags the booking for staff, who cancel (or decline) with
-- the existing tools, applying the real cancellation policy / refund rules.
alter table public.bookings
  add column if not exists cancellation_requested_at timestamptz,
  add column if not exists cancellation_reason text;
