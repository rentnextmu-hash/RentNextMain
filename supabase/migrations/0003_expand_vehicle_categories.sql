-- 0003_expand_vehicle_categories.sql
-- Widens vehicle_categories.category from the earlier placeholder 4-value
-- taxonomy (economy/comfort/suv/premium, invented for demo purposes) to the
-- real 11-tier taxonomy used by Rent Next Car Hire's actual rate card
-- (Price List.pdf): Mini, Economy, Economy Elite, Standard, Compact,
-- Sedan, Intermediate, Compact Elite, Luxury, Convertible, Pick Up.
--
-- The real rate card also prices by rental duration (1-2 / 3-5 / 6+ days)
-- rather than a single flat daily rate. That's a genuinely bigger schema
-- change (a rate-tiers table, updated pricing.ts, updated booking flow)
-- deliberately deferred — this migration only widens the category
-- taxonomy so the real fleet can be represented accurately. daily_rate_mur
-- is seeded with the 3-5 day tier as the representative single rate.
-- NOT VALID: enforces the new constraint for all future inserts/updates
-- immediately, without failing on existing rows that still hold the old
-- placeholder values — those rows are deleted and replaced by seed.sql
-- as part of this same fleet changeover, so a full VALIDATE pass isn't
-- needed here.
alter table vehicle_categories drop constraint vehicle_categories_category_check;
alter table vehicle_categories add constraint vehicle_categories_category_check
  check (category in (
    'mini', 'economy', 'economy_elite', 'standard', 'compact', 'sedan',
    'intermediate', 'compact_elite', 'luxury', 'convertible', 'pickup'
  )) not valid;
