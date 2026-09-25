-- seed.sql
-- Rent Next Car Hire demo data. Locations, hotels and add-ons are
-- placeholder Mauritius content; vehicle_categories, and the fleet built
-- from it, reflect the real business (Price List.pdf) — 12 real models
-- with real rates, specs and product photos. Safe to re-run before every
-- demo: catalogue/location/hotel/add-on rows are upserted (ON CONFLICT),
-- while vehicles is fully cleared and reinserted (a full fleet changeover
-- from the earlier placeholder demo fleet, see the vehicle_categories
-- section) and the transactional tables (customers, bookings,
-- booking_add_ons, payments) are cleared and reinserted every run so all
-- dates stay relative to "now" — this script assumes those tables only
-- ever hold demo data.
--
-- Fixed UUIDs are used throughout (not gen_random_uuid()) purely so rows in
-- this file can reference each other directly and the script stays
-- idempotent. They follow a readable scheme: 1xxx = locations,
-- 2xxx = vehicle_categories, 3xxx = vehicles, 4xxx = hotels, 5xxx = add_ons,
-- 6xxx = customers, 7xxx = bookings.
--
-- Does not touch profiles/auth.users — staff accounts are created via
-- Supabase Auth separately and must survive every re-seed.

begin;

-- ────────────────────────────────────────────────────────────────────────
-- Locations (6)
-- ────────────────────────────────────────────────────────────────────────
insert into locations (id, slug, name, type, region, address, latitude, longitude, is_pickup_point, seo_title, seo_description, intro_content, display_order, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'grand-baie', 'Grand Baie', 'branch', 'Rivière du Rempart', 'Royal Road, Grand Baie, Rivière du Rempart', -20.0181, 57.5807, true,
   'Car Rental in Grand Baie | Reliable Cars from {from_price}/day',
   'Pick up your rental car in Grand Baie, Mauritius'' liveliest coastal town. Wide fleet, hotel delivery, and flexible pickup across the north coast.',
   'Grand Baie is Mauritius'' liveliest coastal town, a natural base for exploring the island''s northern beaches. Our branch sits minutes from the public beach, La Croisette shopping centre and the main strip of restaurants and dive operators. Renting here puts you within a short drive of Pereybère, Trou-aux-Biches and the catamaran departure points for Ile aux Cerfs day trips. Parking is straightforward at most hotels and along Royal Road, though the town centre gets busy in the evening. Roads are well signposted and mostly two-lane; a small car is genuinely enough for the coastal routes, while an SUV suits longer trips south towards Port Louis or across to the east coast. Our team hands over the car with a full tank and a laminated map of nearby fuel stations and parking bays.',
   1, true),
  ('10000000-0000-0000-0000-000000000002', 'flic-en-flac', 'Flic-en-Flac', 'branch', 'Black River', 'Wolmar Road, Flic-en-Flac, Black River', -20.2764, 57.3644, true,
   'Car Rental in Flic-en-Flac | Reliable Cars from {from_price}/day',
   'Rent a car on Mauritius'' west coast in Flic-en-Flac. Close to the lagoon, Le Morne and Black River Gorges, with hotel delivery available.',
   'Flic-en-Flac anchors the west coast, known for its long public beach and calm lagoon swimming. Picking up here suits travellers based on the west coast or heading south towards Le Morne and Black River Gorges National Park. The branch is a short walk from Wolmar''s hotel strip and the main beachfront promenade, with free public parking along the beach road most of the day. Sunset views over the lagoon make this one of the most photographed stretches of coastline on the island, and the road south hugs the coast almost the whole way to Le Morne. Fuel stations are plentiful along the coastal road, and the drive inland to Chamarel and the Seven Coloured Earths takes under thirty minutes, making a west-coast pickup a strong choice for day-trippers.',
   2, true),
  ('10000000-0000-0000-0000-000000000003', 'belle-mare', 'Belle Mare', 'branch', 'Flacq', 'Coastal Road, Belle Mare, Flacq', -20.1859, 57.7717, true,
   'Car Rental in Belle Mare | Reliable Cars from {from_price}/day',
   'Rent a car in Belle Mare on Mauritius'' east coast, close to the island''s largest resorts and the Ile aux Cerfs boat departures.',
   'Belle Mare on the east coast is where Mauritius'' largest resort hotels sit, backed by some of the island''s calmest, most sheltered lagoon water. A car picked up here opens up the east coast at your own pace — the public beach, nearby golf courses, and the short drive to Trou d''Eau Douce for the Ile aux Cerfs boat departures. The coastal road is quiet compared with the north, with easy roadside and hotel parking throughout. Belle Mare works well as a base for a slower-paced stay, with day trips inland to Grand Bassin or across to the capital comfortably reachable in under an hour. Our office coordinates directly with the resorts along this stretch for hotel-to-car handovers, so pickup rarely means leaving your hotel grounds.',
   3, true),
  ('10000000-0000-0000-0000-000000000004', 'trou-aux-biches', 'Trou-aux-Biches', 'branch', 'Pamplemousses', 'Royal Road, Trou-aux-Biches, Pamplemousses', -20.0339, 57.5461, true,
   'Car Rental in Trou-aux-Biches | Reliable Cars from {from_price}/day',
   'Rent a car in Trou-aux-Biches, a quiet north-west lagoon town close to Grand Baie and Cap Malheureux.',
   'Trou-aux-Biches sits on the calm north-west lagoon, a quieter alternative to Grand Baie with the same easy road access to the island''s northern attractions. The branch is close to the public beach and the row of guesthouses and small hotels along the coast road, with straightforward free parking nearby. From here it''s a short hop to Grand Baie''s restaurants and nightlife, or north to Cap Malheureux and the picturesque red-roofed church at the island''s tip. The roads north are flat, well maintained and easy for first-time visitors to navigate. Snorkelling boat trips depart directly from the public beach a few minutes'' walk from our counter, making an early pickup and a morning on the water an easy combination.',
   4, true),
  ('10000000-0000-0000-0000-000000000005', 'le-morne', 'Le Morne', 'branch', 'Savanne', 'Coastal Road, La Gaulette, Le Morne, Savanne', -20.4547, 57.3106, true,
   'Car Rental in Le Morne | Reliable Cars from {from_price}/day',
   'Rent a car at Le Morne on Mauritius'' south-west coast, beneath the UNESCO-listed mountain and close to Black River Gorges.',
   'Le Morne sits beneath the UNESCO-listed mountain of the same name, at the quieter south-western tip of the island, prized by kitesurfers for its reliable wind and by everyone else for the view. A car from here makes the most of the south coast — Black River Gorges National Park, the wild coastline towards Baie du Cap, and the calmer roads compared with the busier north. Our counter is close to the resort cluster at the foot of the mountain, with hotel and public parking both available nearby. The drive to Chamarel and the Seven Coloured Earths takes about twenty minutes, and the road north to Flic-en-Flac hugs the coast for one of the most scenic short drives on the island.',
   5, true),
  ('10000000-0000-0000-0000-000000000006', 'ssr-airport', 'SSR International Airport', 'airport', 'Grand Port', 'SSR International Airport, Plaine Magnien, Grand Port', -20.4302, 57.6836, true,
   'Car Rental at SSR International Airport | Reliable Cars from {from_price}/day',
   'Pick up your rental car on arrival at SSR International Airport, Mauritius. No transfer needed — start driving the moment you land.',
   'Picking up at SSR International Airport in Plaine Magnien means your rental starts the moment you land, with no transfer needed before your holiday begins. Our counter is a short walk from the arrivals hall, and we track incoming flights so a delay never means a wasted booking. From the airport it''s a quick drive to the south-east coast, Blue Bay''s marine park, or north towards the resort belt at Belle Mare and Grand Baie. Returning here at the end of your stay is just as simple — drop the car and walk straight to check-in. Airport pickups carry a small delivery charge, covering the extra coordination with the terminal, and are the fastest way to be on the road within minutes of touching down in Mauritius.',
   6, true)
on conflict (slug) do update set
  name = excluded.name, type = excluded.type, region = excluded.region, address = excluded.address,
  latitude = excluded.latitude, longitude = excluded.longitude, is_pickup_point = excluded.is_pickup_point,
  seo_title = excluded.seo_title, seo_description = excluded.seo_description, intro_content = excluded.intro_content,
  display_order = excluded.display_order, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Vehicle categories (12) — Rent Next Car Hire's real fleet, from
-- Price List.pdf. Real duration-tiered rates (1-2 / 3-5 / 6+ days) as of
-- migration 0004 — daily_rate_mur is now a generated column (= the 6+
-- day rate) so it's omitted from this INSERT's column list entirely;
-- writing to a GENERATED ALWAYS column is a Postgres error. rate_class
-- is the A-L single-letter code from the price list's "Models Available"
-- page (not the rate table, which reuses letters for Standard/Convertible/
-- Pick Up — the per-model page doesn't). tagline/description/best_for are
-- the fleet showcase carousel's copy, written once here rather than
-- hardcoded in the component, so it's editable from the admin later.
-- image_path points at the real product photos extracted from the PDF.
-- Old placeholder demo categories (economy/comfort/suv/premium taxonomy)
-- are removed below, before this upsert, since their slugs don't overlap
-- and they'd otherwise be left behind as orphaned rows.
-- ────────────────────────────────────────────────────────────────────────
-- Transactional demo data must be cleared before vehicles/categories, not
-- after: bookings/payments/booking_add_ons hold FKs to both, so deleting
-- the old fleet first would fail with a foreign key violation. Order
-- matters here too: children before parents.
delete from payments;
delete from booking_add_ons;
delete from bookings;
delete from customers;

-- Full, unconditional delete rather than "where slug not in (new list)":
-- toyota-vitz survives into the new fleet too, but at a different fixed
-- id than the new numbering scheme assigns it, so a partial delete would
-- leave the old toyota-vitz row's id colliding with the new id assigned
-- to a different model below.
delete from vehicles; -- full fleet changeover; re-inserted fresh below
delete from vehicle_categories;

insert into vehicle_categories (
  id, slug, name, make, model, category, transmission, seats, doors, fuel_type, air_conditioning,
  rate_1_2_mur, rate_3_5_mur, rate_6_plus_mur, rate_class, luggage_capacity,
  tagline, description, best_for, features, image_path, display_order, is_active
)
values
  ('20000000-0000-0000-0000-000000000001', 'suzuki-celerio', 'Suzuki Celerio', 'Suzuki', 'Celerio', 'mini', 'automatic', 5, 5, 'petrol', true,
   2900, 2700, 2500, 'A', 1,
   'Light on the road, easy on the wallet.',
   'Small, light and effortless in Port Louis traffic. Slips into any parking space in Grand Baie and sips fuel on the long run down to Le Morne.',
   'Solo travellers and quick errands',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage"]', '/cars/suzuki-celerio.png', 1, true),
  ('20000000-0000-0000-0000-000000000002', 'toyota-vitz', 'Toyota Vitz', 'Toyota', 'Vitz', 'economy', 'automatic', 5, 5, 'petrol', true,
   3400, 3200, 3000, 'B', 2,
   'The one everyone asks for, for good reason.',
   'Our most-booked car, and the easiest way to see the island. Automatic, air-conditioned, and just the right size for the coastal roads between Grand Baie and Trou-aux-Biches.',
   'Couples exploring the north coast',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage"]', '/cars/toyota-vitz.png', 2, true),
  ('20000000-0000-0000-0000-000000000003', 'toyota-raize', 'Toyota Raize', 'Toyota', 'Raize', 'economy_elite', 'automatic', 5, 5, 'petrol', true,
   3600, 3400, 3200, 'C', 2,
   'A little more ground clearance, a lot more confidence.',
   'Sits higher than the hatchbacks without the size of a full SUV. Handles the inland roads up to Chamarel with ease, and still tucks into a hotel car park without fuss.',
   'First-time visitors wanting extra comfort',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Reversing camera"]', '/cars/toyota-raize.png', 3, true),
  ('20000000-0000-0000-0000-000000000004', 'suzuki-brezza', 'Suzuki Brezza', 'Suzuki', 'Brezza', 'economy_elite', 'automatic', 5, 5, 'petrol', true,
   3800, 3600, 3400, 'D', 2,
   'Built for the roads off the main strip.',
   'A compact SUV with real presence — confident on the hillier inland routes towards Black River Gorges, and just as at home cruising the coast road at sunset.',
   'Couples heading inland as well as the coast',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Reversing camera"]', '/cars/suzuki-brezza.png', 4, true),
  ('20000000-0000-0000-0000-000000000005', 'suzuki-ertiga', 'Suzuki Ertiga', 'Suzuki', 'Ertiga', 'standard', 'automatic', 7, 5, 'petrol', true,
   4700, 4500, 4300, 'E', 3,
   'Everyone, and everyone''s luggage, in one car.',
   'Seven seats and a boot that actually fits the beach bags. Built for families and groups who want to explore the island together, not in two cars.',
   'Families and groups of up to seven',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","7 seats"]', '/cars/suzuki-ertiga.png', 5, true),
  ('20000000-0000-0000-0000-000000000006', 'toyota-corolla-sport-hybrid', 'Toyota Corolla Sport Hybrid', 'Toyota', 'Corolla Sport Hybrid', 'compact', 'automatic', 5, 5, 'hybrid', true,
   4600, 4400, 4200, 'F', 2,
   'Quiet, efficient, and genuinely pleasant to drive.',
   'A hybrid engine that barely touches the fuel gauge, wrapped in a cabin quiet enough for the long coastal drive from Belle Mare to Le Morne without a single stop for petrol.',
   'Longer island tours in comfort',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Hybrid engine"]', '/cars/toyota-corolla-sport-hybrid.png', 6, true),
  ('20000000-0000-0000-0000-000000000007', 'kia-cerato', 'Kia Cerato', 'Kia', 'Cerato', 'sedan', 'automatic', 5, 4, 'petrol', true,
   4800, 4600, 4400, 'G', 3,
   'A proper boot for a proper holiday.',
   'Roomier than a hatchback, smoother than an SUV. The Cerato is for travellers who''d rather arrive relaxed than adventurous — a genuinely comfortable ride from the airport to your hotel.',
   'Business trips and airport transfers',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Power windows"]', '/cars/kia-cerato.png', 7, true),
  ('20000000-0000-0000-0000-000000000008', 'kia-sportage', 'Kia Sportage', 'Kia', 'Sportage', 'intermediate', 'automatic', 5, 5, 'petrol', true,
   5600, 5400, 5200, 'H', 2,
   'Ground clearance for the roads the map doesn''t show.',
   'A full-size SUV with the cabin space and clearance to handle Mauritius properly — Chamarel''s dirt tracks, Black River''s switchbacks, and the beach car parks in between.',
   'Active days — hiking, diving, exploring',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Reversing camera"]', '/cars/kia-sportage.png', 8, true),
  ('20000000-0000-0000-0000-000000000009', 'bmw-x2', 'BMW X2', 'BMW', 'X2', 'compact_elite', 'automatic', 5, 5, 'petrol', true,
   4500, 4300, 4100, 'I', 2,
   'A premium crossover, sized for the island.',
   'BMW handling and interior quality in a footprint that still fits Grand Baie''s narrower streets. For travellers who want to feel the difference the moment they sit down.',
   'A touch of premium without going full luxury',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Reversing camera","Cruise control"]', '/cars/bmw-x2.png', 9, true),
  ('20000000-0000-0000-0000-000000000010', 'bmw-330e', 'BMW 330e', 'BMW', '330e', 'luxury', 'automatic', 5, 4, 'hybrid', true,
   8500, 8300, 8100, 'J', 2,
   'Our flagship. Arrive like it.',
   'A plug-in hybrid executive sedan for the trip that deserves it — a wedding, an anniversary, a client meeting. Silent on electric power through town, effortless everywhere else.',
   'Special occasions and business travel',
   '["Air conditioning","Bluetooth","Leather seats","Unlimited mileage","Premium sound system","Cruise control","Hybrid engine"]', '/cars/bmw-330e.png', 10, true),
  ('20000000-0000-0000-0000-000000000011', 'mini-cooper-convertible', 'Mini Cooper Convertible', 'Mini', 'Cooper Convertible', 'convertible', 'automatic', 4, 2, 'petrol', true,
   6800, 6600, 6400, 'K', 2,
   'Roof down, coast road, no particular hurry.',
   'Not the practical choice — the memorable one. Built for the drive along Flic-en-Flac at golden hour, not for hauling luggage. Pack light and take the long way.',
   'A scenic drive, not a full holiday',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Convertible roof"]', '/cars/mini-cooper-convertible.png', 11, true),
  ('20000000-0000-0000-0000-000000000012', 'ford-ranger', 'Ford Ranger', 'Ford', 'Ranger', 'pickup', 'automatic', 5, 5, 'petrol', true,
   6700, 6500, 6300, 'L', 4,
   'For gear that doesn''t fit in a boot.',
   'Double-cab comfort with genuine load-bed space — dive equipment, surfboards, market hauls. Built for travellers whose holiday needs more room than a sedan can offer.',
   'Watersports gear and equipment-heavy trips',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Load bed"]', '/cars/ford-ranger.png', 12, true)
on conflict (slug) do update set
  name = excluded.name, make = excluded.make, model = excluded.model, category = excluded.category,
  transmission = excluded.transmission, seats = excluded.seats, doors = excluded.doors, fuel_type = excluded.fuel_type,
  air_conditioning = excluded.air_conditioning,
  rate_1_2_mur = excluded.rate_1_2_mur, rate_3_5_mur = excluded.rate_3_5_mur, rate_6_plus_mur = excluded.rate_6_plus_mur,
  rate_class = excluded.rate_class, luggage_capacity = excluded.luggage_capacity,
  tagline = excluded.tagline, description = excluded.description, best_for = excluded.best_for,
  features = excluded.features, image_path = excluded.image_path, display_order = excluded.display_order, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Hotels (5) — 3 active, 1 pending, 1 inactive
-- ────────────────────────────────────────────────────────────────────────
insert into hotels (id, name, slug, location_id, contact_name, contact_email, contact_phone, contract_status, commission_rate, pickup_notes, is_active)
values
  ('40000000-0000-0000-0000-000000000001', 'Sunset Lagoon Resort & Spa', 'sunset-lagoon-resort-spa', '10000000-0000-0000-0000-000000000001',
   'Marc Antoine', 'reservations@sunsetlagoon.mu', '+230 263 8800', 'active', 12,
   'Guests collected from the main lobby; please allow 10 minutes after calling ahead.', true),
  ('40000000-0000-0000-0000-000000000002', 'Azure Beach Hotel', 'azure-beach-hotel', '10000000-0000-0000-0000-000000000004',
   'Priya Ramgoolam', 'frontdesk@azurebeach.mu', '+230 265 5521', 'active', 10,
   'Concierge desk coordinates handover; cars parked in the guest lot beside reception.', true),
  ('40000000-0000-0000-0000-000000000003', 'Le Récif Resort', 'le-recif-resort', '10000000-0000-0000-0000-000000000002',
   'Yohann Perrine', 'concierge@lerecif.mu', '+230 453 7710', 'active', 15,
   'Ask for the concierge on arrival; keys are held at the front desk for early pickups.', true),
  ('40000000-0000-0000-0000-000000000004', 'Coral Bay Hotel', 'coral-bay-hotel', '10000000-0000-0000-0000-000000000003',
   'Ken Appadoo', 'info@coralbay.mu', '+230 415 2290', 'pending', 8,
   'Contract under negotiation; do not schedule deliveries until active.', true),
  ('40000000-0000-0000-0000-000000000005', 'Windward Bay Hotel', 'windward-bay-hotel', '10000000-0000-0000-0000-000000000005',
   'Vanessa Li', 'reservations@windwardbay.mu', '+230 450 6600', 'inactive', 10,
   'Partnership paused — hotel under renovation.', false)
on conflict (slug) do update set
  name = excluded.name, location_id = excluded.location_id, contact_name = excluded.contact_name,
  contact_email = excluded.contact_email, contact_phone = excluded.contact_phone, contract_status = excluded.contract_status,
  commission_rate = excluded.commission_rate, pickup_notes = excluded.pickup_notes, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Add-ons (6)
-- ────────────────────────────────────────────────────────────────────────
insert into add_ons (id, slug, name, description, price_mur, price_type, max_quantity, is_active)
values
  ('50000000-0000-0000-0000-000000000001', 'additional-driver', 'Additional driver', 'Add a second named driver to the rental agreement.', 300, 'per_booking', 3, true),
  ('50000000-0000-0000-0000-000000000002', 'baby-seat', 'Baby seat', 'Rear-facing or forward-facing child seat, fitted before pickup.', 200, 'per_booking', 3, true),
  ('50000000-0000-0000-0000-000000000003', 'airport-delivery', 'Airport delivery', 'Car delivered to and collected from SSR International Airport.', 800, 'per_booking', 1, true),
  ('50000000-0000-0000-0000-000000000004', 'hotel-delivery', 'Hotel delivery', 'Car delivered to and collected from your partner hotel.', 500, 'per_booking', 1, true),
  ('50000000-0000-0000-0000-000000000005', 'gps', 'GPS', 'Dedicated GPS navigation unit, pre-loaded with island maps.', 150, 'per_day', 1, true),
  ('50000000-0000-0000-0000-000000000006', 'full-insurance', 'Full insurance upgrade', 'Reduces the standard excess to zero for the full rental period.', 400, 'per_day', 1, true)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price_mur = excluded.price_mur,
  price_type = excluded.price_type, max_quantity = excluded.max_quantity, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Vehicles (24) — 2-3 per category, weighted toward the cheaper tiers
-- (mirroring a realistic fleet mix), 17 available / 5 booked / 2
-- maintenance so counts line up with the 5 "active" bookings below (a
-- vehicle only flips to "booked" once a rental is actually under way,
-- not merely confirmed for the future). vehicles table was cleared above
-- as part of the full fleet changeover.
-- ────────────────────────────────────────────────────────────────────────
insert into vehicles (id, category_id, code, registration, location_id, status, mileage_km, year, colour, acquired_at)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'CELERIO-001', '1024 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 18000, 2023, 'Silver', '2023-02-10'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'CELERIO-002', '2031 FE 23', '10000000-0000-0000-0000-000000000002', 'available', 15500, 2023, 'White', '2023-08-02'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'CELERIO-003', '3041 BM 21', '10000000-0000-0000-0000-000000000003', 'booked', 41000, 2021, 'Grey', '2021-06-20'),

  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002', 'VITZ-001', '1101 GB 23', '10000000-0000-0000-0000-000000000001', 'available', 29500, 2022, 'White', '2022-04-19'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'VITZ-002', '4104 TB 23', '10000000-0000-0000-0000-000000000004', 'booked', 34500, 2022, 'Blue', '2022-08-14'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', 'VITZ-003', '5105 LM 19', '10000000-0000-0000-0000-000000000005', 'available', 62000, 2020, 'Silver', '2020-07-22'),

  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'RAIZE-001', '1201 GB 21', '10000000-0000-0000-0000-000000000001', 'available', 33000, 2022, 'Blue', '2022-02-17'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003', 'RAIZE-002', '2203 FE 20', '10000000-0000-0000-0000-000000000002', 'available', 19500, 2023, 'White', '2023-05-29'),

  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', 'BREZZA-001', '3204 BM 23', '10000000-0000-0000-0000-000000000003', 'booked', 37000, 2022, 'Blue', '2022-06-11'),
  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000004', 'BREZZA-002', '4205 TB 21', '10000000-0000-0000-0000-000000000004', 'available', 44000, 2021, 'White', '2021-09-26'),

  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000005', 'ERTIGA-001', '1301 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 51000, 2020, 'Brown', '2020-05-08'),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000005', 'ERTIGA-002', '6404 SA 23', '10000000-0000-0000-0000-000000000006', 'available', 24000, 2023, 'Brown', '2023-04-22'),

  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000006', 'COROLLA-001', '2601 FE 21', '10000000-0000-0000-0000-000000000002', 'booked', 47000, 2021, 'Black', '2021-05-27'),
  ('30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000006', 'COROLLA-002', '1401 GB 19', '10000000-0000-0000-0000-000000000001', 'available', 52000, 2021, 'Black', '2021-03-30'),

  ('30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000007', 'CERATO-001', '3302 BM 21', '10000000-0000-0000-0000-000000000003', 'available', 33000, 2022, 'White', '2022-02-20'),
  ('30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000007', 'CERATO-002', '5303 LM 20', '10000000-0000-0000-0000-000000000005', 'available', 68000, 2019, 'White', '2019-11-12'),

  ('30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000008', 'SPORTAGE-001', '1202 GB 22', '10000000-0000-0000-0000-000000000001', 'booked', 19500, 2023, 'Grey', '2023-05-29'),
  ('30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000008', 'SPORTAGE-002', '4051 TB 22', '10000000-0000-0000-0000-000000000004', 'available', 15200, 2024, 'Grey', '2024-01-08'),

  ('30000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000009', 'X2-001', '1501 GB 22', '10000000-0000-0000-0000-000000000001', 'maintenance', 31000, 2022, 'Orange', '2022-09-09'),
  ('30000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000009', 'X2-002', '2102 FE 21', '10000000-0000-0000-0000-000000000002', 'available', 21000, 2023, 'Orange', '2023-03-05'),

  ('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000010', '330E-001', '1701 GB 24', '10000000-0000-0000-0000-000000000001', 'available', 16500, 2023, 'White', '2023-10-01'),

  ('30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000011', 'MINICONV-001', '5061 LM 20', '10000000-0000-0000-0000-000000000002', 'available', 46000, 2021, 'Red', '2021-11-30'),

  ('30000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000012', 'RANGER-001', '6206 SA 22', '10000000-0000-0000-0000-000000000006', 'maintenance', 22500, 2023, 'Yellow', '2023-01-15'),
  ('30000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000012', 'RANGER-002', '3103 BM 22', '10000000-0000-0000-0000-000000000003', 'available', 22000, 2023, 'Yellow', '2023-03-12')
on conflict (code) do update set
  category_id = excluded.category_id, registration = excluded.registration, location_id = excluded.location_id,
  status = excluded.status, mileage_km = excluded.mileage_km, year = excluded.year, colour = excluded.colour,
  acquired_at = excluded.acquired_at;

-- ────────────────────────────────────────────────────────────────────────
-- Settings
-- ────────────────────────────────────────────────────────────────────────
insert into settings (key, value)
values
  ('company_name', '"Rent Next Car Hire"'),
  ('company_tagline', '"Elevate Your Driving Experience"'),
  ('company_phone', '"+230 5500 1415"'),
  ('company_website', '"www.rentnext.net"'),
  ('currency', '"MUR"'),
  ('default_pickup_time', '"10:00"'),
  ('default_return_time', '"10:00"'),
  ('minimum_rental_days', '2'),
  ('booking_email', '"booking@rentnext.net"')
on conflict (key) do update set value = excluded.value;

-- Customers (25) — 5 French, 5 British, 5 German, 5 South African,
-- 3 Indian, 2 Réunionese. Six are linked to an active partner hotel,
-- matching the six hotel-sourced bookings below.
insert into customers (id, first_name, last_name, email, phone, country, hotel_id, flight_number)
values
  ('60000000-0000-0000-0000-000000000001', 'Marie', 'Dubois', 'marie.dubois@gmail.com', '+33 6 12 34 56 78', 'France', null, null),
  ('60000000-0000-0000-0000-000000000002', 'Julien', 'Lefevre', 'julien.lefevre@outlook.fr', '+33 6 23 45 67 89', 'France', null, null),
  ('60000000-0000-0000-0000-000000000003', 'Camille', 'Rousseau', 'camille.rousseau@yahoo.fr', '+33 6 34 56 78 90', 'France', '40000000-0000-0000-0000-000000000001', null),
  ('60000000-0000-0000-0000-000000000004', 'Antoine', 'Girard', 'antoine.girard@gmail.com', '+33 6 45 67 89 01', 'France', null, null),
  ('60000000-0000-0000-0000-000000000005', 'Sophie', 'Moreau', 'sophie.moreau@orange.fr', '+33 6 56 78 90 12', 'France', null, null),
  ('60000000-0000-0000-0000-000000000006', 'James', 'Whitfield', 'james.whitfield@gmail.com', '+44 7700 900123', 'United Kingdom', null, null),
  ('60000000-0000-0000-0000-000000000007', 'Emma', 'Clarke', 'emma.clarke@outlook.com', '+44 7700 900456', 'United Kingdom', null, null),
  ('60000000-0000-0000-0000-000000000008', 'Oliver', 'Bennett', 'oliver.bennett@gmail.com', '+44 7700 900789', 'United Kingdom', null, null),
  ('60000000-0000-0000-0000-000000000009', 'Charlotte', 'Hughes', 'charlotte.hughes@hotmail.co.uk', '+44 7700 900234', 'United Kingdom', '40000000-0000-0000-0000-000000000002', null),
  ('60000000-0000-0000-0000-000000000010', 'Henry', 'Sutton', 'henry.sutton@gmail.com', '+44 7700 900567', 'United Kingdom', null, null),
  ('60000000-0000-0000-0000-000000000011', 'Lukas', 'Hoffmann', 'lukas.hoffmann@gmail.com', '+49 151 23456789', 'Germany', null, null),
  ('60000000-0000-0000-0000-000000000012', 'Anna', 'Schneider', 'anna.schneider@web.de', '+49 151 34567890', 'Germany', null, null),
  ('60000000-0000-0000-0000-000000000013', 'Felix', 'Bauer', 'felix.bauer@gmx.de', '+49 151 45678901', 'Germany', '40000000-0000-0000-0000-000000000003', null),
  ('60000000-0000-0000-0000-000000000014', 'Laura', 'Wagner', 'laura.wagner@gmail.com', '+49 151 56789012', 'Germany', null, null),
  ('60000000-0000-0000-0000-000000000015', 'Maximilian', 'Fischer', 'max.fischer@web.de', '+49 151 67890123', 'Germany', null, null),
  ('60000000-0000-0000-0000-000000000016', 'Pieter', 'van der Merwe', 'pieter.vandermerwe@gmail.com', '+27 82 123 4567', 'South Africa', null, null),
  ('60000000-0000-0000-0000-000000000017', 'Johan', 'Botha', 'johan.botha@mweb.co.za', '+27 83 234 5678', 'South Africa', null, null),
  ('60000000-0000-0000-0000-000000000018', 'Elsie', 'Nel', 'elsie.nel@gmail.com', '+27 84 345 6789', 'South Africa', '40000000-0000-0000-0000-000000000001', null),
  ('60000000-0000-0000-0000-000000000019', 'Riaan', 'Pretorius', 'riaan.pretorius@outlook.com', '+27 82 456 7890', 'South Africa', null, 'MK460'),
  ('60000000-0000-0000-0000-000000000020', 'Chantel', 'du Plessis', 'chantel.duplessis@gmail.com', '+27 83 567 8901', 'South Africa', null, null),
  ('60000000-0000-0000-0000-000000000021', 'Rohan', 'Mehta', 'rohan.mehta@gmail.com', '+91 98765 43210', 'India', null, 'AI2543'),
  ('60000000-0000-0000-0000-000000000022', 'Ananya', 'Sharma', 'ananya.sharma@gmail.com', '+91 98765 12345', 'India', '40000000-0000-0000-0000-000000000002', null),
  ('60000000-0000-0000-0000-000000000023', 'Vikram', 'Nair', 'vikram.nair@outlook.in', '+91 98765 67890', 'India', null, null),
  ('60000000-0000-0000-0000-000000000024', 'Jean-Luc', 'Payet', 'jeanluc.payet@gmail.com', '+262 692 12 34 56', 'Réunion', null, null),
  ('60000000-0000-0000-0000-000000000025', 'Nadège', 'Hoareau', 'nadege.hoareau@orange.fr', '+262 693 23 45 67', 'Réunion', '40000000-0000-0000-0000-000000000003', null);

-- Bookings (16): 4 completed, 5 active (today), 7 upcoming (5 confirmed,
-- 2 requested with no vehicle assigned). 5 are hotel-sourced, each matched
-- to a hotel actually at that booking's pickup location. Reference numbers
-- and created_at are computed from each booking's own pickup date so they
-- stay internally consistent on every re-seed. car_total_mur/addons_total_mur/
-- total_mur are inserted as 0 placeholders and computed below via joins to
-- vehicle_categories and booking_add_ons — not hand-multiplied — so the
-- real fleet's rates can change without the arithmetic here going stale.
insert into bookings (id, reference, customer_id, category_id, vehicle_id, pickup_location_id, return_location_id, pickup_at, return_at, days, status, car_total_mur, addons_total_mur, total_mur, source, hotel_id, notes, created_at)
values
  -- Completed
  ('70000000-0000-0000-0000-000000000001', 'CR-' || to_char(now() - interval '25 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '20 days', now() - interval '15 days', 5, 'completed', 0, 0, 0, 'website', null, null, now() - interval '20 days'),
  ('70000000-0000-0000-0000-000000000002', 'CR-' || to_char(now() - interval '33 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '28 days', now() - interval '23 days', 5, 'completed', 0, 0, 0, 'website', null, null, now() - interval '28 days'),
  ('70000000-0000-0000-0000-000000000003', 'CR-' || to_char(now() - interval '19 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '15 days', now() - interval '11 days', 4, 'completed', 0, 0, 0, 'hotel', '40000000-0000-0000-0000-000000000001',
   'Guest requested a car seat waiting in the room, not fitted at pickup.', now() - interval '15 days'),
  ('70000000-0000-0000-0000-000000000004', 'CR-' || to_char(now() - interval '37 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000024',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '30 days', now() - interval '23 days', 7, 'completed', 0, 0, 0, 'phone', null, null, now() - interval '30 days'),

  -- Active (today)
  ('70000000-0000-0000-0000-000000000005', 'CR-' || to_char(now() - interval '5 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '2 days', now() + interval '3 days', 5, 'active', 0, 0, 0, 'website', null, null, now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000006', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   now() - interval '1 days', now() + interval '4 days', 5, 'active', 0, 0, 0, 'hotel', '40000000-0000-0000-0000-000000000002', null, now() - interval '4 days'),
  ('70000000-0000-0000-0000-000000000007', 'CR-' || to_char(now() - interval '6 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '3 days', now() + interval '2 days', 5, 'active', 0, 0, 0, 'website', null, null, now() - interval '6 days'),
  ('70000000-0000-0000-0000-000000000008', 'CR-' || to_char(now() - interval '5 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '2 days', now() + interval '2 days', 4, 'active', 0, 0, 0, 'hotel', '40000000-0000-0000-0000-000000000003', null, now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000009', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000017',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '1 days', now() + interval '4 days', 5, 'active', 0, 0, 0, 'website', null, null, now() - interval '4 days'),

  -- Upcoming (next 3 weeks) — confirmed, vehicle assigned
  ('70000000-0000-0000-0000-000000000010', 'CR-' || to_char(now(), 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() + interval '3 days', now() + interval '8 days', 5, 'confirmed', 0, 0, 0, 'website', null, null, now()),
  ('70000000-0000-0000-0000-000000000011', 'CR-' || to_char(now() - interval '2 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000021',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() + interval '5 days', now() + interval '8 days', 3, 'confirmed', 0, 0, 0, 'website', null, null, now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000012', 'CR-' || to_char(now() - interval '3 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000022',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() + interval '7 days', now() + interval '10 days', 3, 'confirmed', 0, 0, 0, 'hotel', '40000000-0000-0000-0000-000000000003',
   'Special-occasion rental — confirm roof mechanism demo at handover.', now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000013', 'CR-' || to_char(now() - interval '1 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006',
   now() + interval '4 days', now() + interval '11 days', 7, 'confirmed', 0, 0, 0, 'website', null,
   'Flight MK460 — confirm landing time before dispatch.', now() - interval '1 days'),
  ('70000000-0000-0000-0000-000000000014', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-003',
   '60000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   now() + interval '8 days', now() + interval '12 days', 4, 'confirmed', 0, 0, 0, 'hotel', '40000000-0000-0000-0000-000000000002', null, now() - interval '4 days'),
  -- Requested, no vehicle assigned yet
  ('70000000-0000-0000-0000-000000000015', 'CR-' || to_char(now() - interval '1 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000007', null,
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() + interval '2 days', now() + interval '6 days', 4, 'requested', 0, 0, 0, 'phone', null, null, now() - interval '1 days'),
  ('70000000-0000-0000-0000-000000000016', 'CR-' || to_char(now(), 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000008', null,
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   now() + interval '12 days', now() + interval '16 days', 4, 'requested', 0, 0, 0, 'walk_in', null, null, now());

-- Booking add-ons — attached to just over half the bookings
insert into booking_add_ons (booking_id, add_on_id, quantity, unit_price_mur, total_mur)
values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 1, 150, 750),   -- B1 gps x5 days
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 1, 500, 500),   -- B3 hotel delivery
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 1, 200, 200),   -- B3 baby seat
  ('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 1, 300, 300),   -- B5 additional driver
  ('70000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000004', 1, 500, 500),   -- B6 hotel delivery
  ('70000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000004', 1, 500, 500),   -- B8 hotel delivery
  ('70000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000005', 4, 150, 600),   -- B8 gps x4 days
  ('70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000006', 5, 400, 2000),  -- B9 full insurance x5 days
  ('70000000-0000-0000-0000-000000000012', '50000000-0000-0000-0000-000000000004', 1, 500, 500),   -- B12 hotel delivery
  ('70000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000003', 1, 800, 800),   -- B13 airport delivery
  ('70000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000004', 1, 500, 500),   -- B14 hotel delivery
  ('70000000-0000-0000-0000-000000000014', '50000000-0000-0000-0000-000000000002', 1, 200, 200);   -- B14 baby seat

-- Compute pricing from the live fleet rather than hand-multiplying: the
-- duration-tiered rate (mirroring lib/pricing.ts's selectDailyRate — the
-- application's single source of truth for this rule; this SQL exists
-- only because seed data generation can't call TypeScript) x days from
-- vehicle_categories, add-on totals summed from booking_add_ons (0 where
-- a booking has none), and the grand total as their sum.
update bookings b set car_total_mur =
  (case
    when b.days <= 2 then vc.rate_1_2_mur
    when b.days <= 5 then vc.rate_3_5_mur
    else vc.rate_6_plus_mur
  end) * b.days
from vehicle_categories vc
where vc.id = b.category_id;

update bookings b set addons_total_mur = coalesce(
  (select sum(ba.total_mur) from booking_add_ons ba where ba.booking_id = b.id), 0
);

update bookings set total_mur = car_total_mur + addons_total_mur;


-- Payments — one paid row for every confirmed/active/completed booking
-- (the two 'requested' bookings, 15 and 16, have none yet).
insert into payments (booking_id, amount_mur, method, status, reference, paid_at)
select b.id, b.total_mur,
  (array['cash','card','transfer','online'])[1 + (row_number() over (order by b.id))::int % 4],
  'paid',
  'TXN-' || lpad((100000 + row_number() over (order by b.id))::text, 6, '0'),
  b.created_at + interval '2 hours'
from bookings b
where b.status in ('confirmed', 'active', 'completed');

-- ───────────────────────────────────────────────────────────────────────
-- Booking reference counters — resync from the seeded bookings.
-- The references above are built directly from each booking's dates, not
-- through generate_booking_reference(), so the counter table never heard
-- about them. Without this, the first real booking on a day that already
-- has a seeded booking (e.g. re-seeding on demo morning) would be issued
-- CR-<today>-001 again and fail on the unique constraint.
-- ───────────────────────────────────────────────────────────────────────
delete from booking_reference_counters;
insert into booking_reference_counters (reference_date, last_sequence)
select to_date(split_part(reference, '-', 2), 'YYYYMMDD'), max(split_part(reference, '-', 3)::int)
from bookings
group by 1;


-- ───────────────────────────────────────────────────────────────────────
-- Location page content + rental FAQs (migration 0009). Same text as the
-- 0009 backfill — keep the two in sync. DRAFT copy for the client to
-- confirm: drive times are approximate light-traffic estimates.
-- ───────────────────────────────────────────────────────────────────────
update locations set opening_hours = 'Daily, 08:00 – 18:00';
update locations set
  drive_times = '[{"place":"Cap Malheureux","minutes":10},{"place":"Pamplemousses Botanical Garden","minutes":20},{"place":"Port Louis","minutes":35},{"place":"SSR International Airport","minutes":75}]',
  faqs = '[{"question":"Is parking easy in Grand Baie?","answer":"Most hotels have free parking, and there are bays along Royal Road. The town centre gets busy in the evening, so park a short walk away and stroll in."},{"question":"Can you bring the car to my hotel in Grand Baie?","answer":"Yes. Choose hotel delivery when you book and we hand the car over at your hotel, including at our partner hotels on the north coast."}]'
where slug = 'grand-baie';

update locations set
  drive_times = '[{"place":"Port Louis","minutes":35},{"place":"Black River Gorges viewpoint","minutes":35},{"place":"Chamarel","minutes":40},{"place":"Le Morne","minutes":40},{"place":"SSR International Airport","minutes":60}]',
  faqs = '[{"question":"Is Flic-en-Flac a good base for the south-west?","answer":"Yes. The coast road runs south to Tamarin, Chamarel and Le Morne, and inland roads climb to Black River Gorges, all within about 40 minutes."},{"question":"Can I return the car at the airport instead?","answer":"Yes. Choose a different return location when you book and drop the car at SSR International Airport before your flight."}]'
where slug = 'flic-en-flac';

update locations set
  drive_times = '[{"place":"Trou d''Eau Douce (Ile aux Cerfs boats)","minutes":15},{"place":"SSR International Airport","minutes":50},{"place":"Port Louis","minutes":60},{"place":"Grand Baie","minutes":60}]',
  faqs = '[{"question":"How do I get to Ile aux Cerfs from Belle Mare?","answer":"Drive about 15 minutes south to Trou d''Eau Douce, where the boats leave from the jetty. There is parking near the departure point."},{"question":"Do you deliver to the Belle Mare resorts?","answer":"Yes. Choose hotel delivery when you book and we bring the car to your hotel on the east coast."}]'
where slug = 'belle-mare';

update locations set
  drive_times = '[{"place":"Grand Baie","minutes":10},{"place":"Pamplemousses Botanical Garden","minutes":20},{"place":"Port Louis","minutes":30},{"place":"SSR International Airport","minutes":75}]',
  faqs = '[{"question":"Is Trou-aux-Biches quieter than Grand Baie?","answer":"Yes. It sits on the same calm north-west lagoon with the same easy road access, just without Grand Baie''s evening traffic."},{"question":"Can I pick up here and return in Grand Baie?","answer":"Yes. Choose a different return location when you book; the two branches are about ten minutes apart."}]'
where slug = 'trou-aux-biches';

update locations set
  drive_times = '[{"place":"Chamarel and the Seven Coloured Earths","minutes":25},{"place":"Black River Gorges viewpoint","minutes":40},{"place":"Flic-en-Flac","minutes":40},{"place":"SSR International Airport","minutes":75}]',
  faqs = '[{"question":"Which car suits the roads around Le Morne?","answer":"Any of our cars handles the coast road. For the climb to Chamarel and Black River Gorges, a car with a bit more power, like the Toyota Raize, is more comfortable."},{"question":"Where do I pick the car up at Le Morne?","answer":"At our counter near the resorts at the foot of the mountain, or delivered to your hotel if you choose hotel delivery."}]'
where slug = 'le-morne';

update locations set
  drive_times = '[{"place":"Mahébourg","minutes":15},{"place":"Blue Bay","minutes":15},{"place":"Port Louis","minutes":50},{"place":"Belle Mare","minutes":50},{"place":"Grand Baie","minutes":75}]',
  faqs = '[{"question":"What happens if my flight is delayed?","answer":"Add your flight number when you book. We track incoming flights, so a delay doesn''t lose you the car."},{"question":"Where do I collect the car at the airport?","answer":"At our counter, a short walk from the arrivals hall. Airport pickups carry a small delivery charge, shown in your booking total."}]'
where slug = 'ssr-airport';

insert into settings (key, value) values ('rental_faqs', '[
  {"question":"What do I need to rent a car?","answer":"A valid driving licence, your passport and a credit card in the main driver''s name. If your licence isn''t in English or French, bring an International Driving Permit too."},
  {"question":"Is there a minimum age?","answer":"Yes. The minimum age depends on the car. Tell us the driver''s age when you book and we''ll confirm before your booking is final."},
  {"question":"What is the fuel policy?","answer":"Full to full. The car comes with a full tank; return it full, or we refill it at the pump price."},
  {"question":"Do you take a deposit?","answer":"A refundable deposit is held on your credit card at pickup and released when the car comes back in the same condition. The amount depends on the car."}
]')
on conflict (key) do update set value = excluded.value;

commit;
