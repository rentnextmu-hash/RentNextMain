-- 0013_no_double_booking.sql
-- Defence in depth against double-booking (V2 Availability): a database
-- exclusion constraint so two OPEN bookings (confirmed or active) on the
-- SAME assigned vehicle can never overlap — even under a race between two
-- staff assigning the same car, or a future non-web writer. The app still
-- checks availability first (lib/availability.ts); this is the safety net
-- that makes the overlap physically impossible at the storage layer.
--
-- Matches the app's availability rule exactly:
--   * only vehicle_id IS NOT NULL rows (a request with no car holds nothing),
--   * only status in (confirmed, active) (requested/completed/cancelled
--     don't reserve the car),
--   * half-open [pickup_at, return_at) ranges, so a booking that ends exactly
--     when another starts is NOT a conflict (back-to-back is fine).
--
-- btree_gist gives GiST an equality operator class for the uuid column so it
-- can be combined with the range-overlap (&&) operator in one constraint.
create extension if not exists btree_gist;

alter table bookings
  add constraint bookings_no_double_booking
  exclude using gist (
    vehicle_id with =,
    tstzrange(pickup_at, return_at, '[)') with &&
  )
  where (vehicle_id is not null and status in ('confirmed', 'active'));
