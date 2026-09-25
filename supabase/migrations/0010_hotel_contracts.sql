-- 0010_hotel_contracts.sql
-- The hotel partner page (P9.2) shows when each contract started. Nullable:
-- the existing partners' start dates aren't known yet.
alter table hotels add column contract_start_date date;
