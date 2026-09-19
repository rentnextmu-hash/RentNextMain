-- 0004_tiered_pricing_and_showcase_content.sql
-- Two things:
--
-- 1. Replaces the single flat daily_rate_mur with Rent Next's real
--    duration-tiered pricing (1-2 / 3-5 / 6+ days, matching Price List.pdf
--    exactly). daily_rate_mur is kept as a STORED GENERATED column
--    (= rate_6_plus_mur, the "from" price, i.e. the best-value longest-stay
--    rate) so every existing reader of that column — CarCard, the
--    homepage, the catalogue page, lib/queries/categories.ts — keeps
--    working unchanged. It becomes read-only; lib/pricing.ts's
--    selectDailyRate() is the only place that picks a rate by duration
--    going forward.
--
-- 2. Adds the columns the fleet showcase carousel needs and that don't
--    exist yet: rate_class (the A-L single-letter code from the price
--    list), tagline, best_for, and luggage_capacity. description already
--    exists. All of this is real content, stored in the DB (seeded in
--    seed.sql) rather than hardcoded in the component, so it's editable
--    from the admin later.

-- ────────────────────────────────────────────────────────────────────────
-- Tiered pricing
-- ────────────────────────────────────────────────────────────────────────
alter table vehicle_categories add column rate_1_2_mur int;
alter table vehicle_categories add column rate_3_5_mur int;
alter table vehicle_categories add column rate_6_plus_mur int;

-- Backfill from the old flat rate so the columns can go NOT NULL below;
-- seed.sql immediately overwrites these with the real per-tier rates.
update vehicle_categories
set rate_1_2_mur = daily_rate_mur, rate_3_5_mur = daily_rate_mur, rate_6_plus_mur = daily_rate_mur
where rate_1_2_mur is null;

alter table vehicle_categories alter column rate_1_2_mur set not null;
alter table vehicle_categories alter column rate_3_5_mur set not null;
alter table vehicle_categories alter column rate_6_plus_mur set not null;

alter table vehicle_categories add constraint vehicle_categories_rate_1_2_mur_check check (rate_1_2_mur > 0);
alter table vehicle_categories add constraint vehicle_categories_rate_3_5_mur_check check (rate_3_5_mur > 0);
alter table vehicle_categories add constraint vehicle_categories_rate_6_plus_mur_check check (rate_6_plus_mur > 0);

-- Dropping daily_rate_mur also drops vehicle_categories_daily_rate_mur_check,
-- which referenced only that column.
alter table vehicle_categories drop column daily_rate_mur;
alter table vehicle_categories add column daily_rate_mur int generated always as (rate_6_plus_mur) stored;

-- ────────────────────────────────────────────────────────────────────────
-- Fleet showcase content
-- ────────────────────────────────────────────────────────────────────────
alter table vehicle_categories add column rate_class text;
alter table vehicle_categories add column tagline text;
alter table vehicle_categories add column best_for text;
alter table vehicle_categories add column luggage_capacity int;
