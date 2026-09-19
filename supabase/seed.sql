-- seed.sql
-- RentNext demo data. Safe to re-run before every demo: catalogue/location/
-- hotel/add-on/vehicle rows are upserted (ON CONFLICT), while the
-- transactional tables (customers, bookings, booking_add_ons, payments) are
-- cleared and reinserted every run so all dates stay relative to "now" —
-- this script assumes those four tables only ever hold demo data.
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
   'Car Rental in Grand Baie | Reliable Cars from Rs 1,200/day',
   'Pick up your rental car in Grand Baie, Mauritius'' liveliest coastal town. Wide fleet, hotel delivery, and flexible pickup across the north coast.',
   'Grand Baie is Mauritius'' liveliest coastal town, a natural base for exploring the island''s northern beaches. Our branch sits minutes from the public beach, La Croisette shopping centre and the main strip of restaurants and dive operators. Renting here puts you within a short drive of Pereybère, Trou-aux-Biches and the catamaran departure points for Ile aux Cerfs day trips. Parking is straightforward at most hotels and along Royal Road, though the town centre gets busy in the evening. Roads are well signposted and mostly two-lane; a small car is genuinely enough for the coastal routes, while an SUV suits longer trips south towards Port Louis or across to the east coast. Our team hands over the car with a full tank and a laminated map of nearby fuel stations and parking bays.',
   1, true),
  ('10000000-0000-0000-0000-000000000002', 'flic-en-flac', 'Flic-en-Flac', 'branch', 'Black River', 'Wolmar Road, Flic-en-Flac, Black River', -20.2764, 57.3644, true,
   'Car Rental in Flic-en-Flac | Reliable Cars from Rs 1,200/day',
   'Rent a car on Mauritius'' west coast in Flic-en-Flac. Close to the lagoon, Le Morne and Black River Gorges, with hotel delivery available.',
   'Flic-en-Flac anchors the west coast, known for its long public beach and calm lagoon swimming. Picking up here suits travellers based on the west coast or heading south towards Le Morne and Black River Gorges National Park. The branch is a short walk from Wolmar''s hotel strip and the main beachfront promenade, with free public parking along the beach road most of the day. Sunset views over the lagoon make this one of the most photographed stretches of coastline on the island, and the road south hugs the coast almost the whole way to Le Morne. Fuel stations are plentiful along the coastal road, and the drive inland to Chamarel and the Seven Coloured Earths takes under thirty minutes, making a west-coast pickup a strong choice for day-trippers.',
   2, true),
  ('10000000-0000-0000-0000-000000000003', 'belle-mare', 'Belle Mare', 'branch', 'Flacq', 'Coastal Road, Belle Mare, Flacq', -20.1859, 57.7717, true,
   'Car Rental in Belle Mare | Reliable Cars from Rs 1,200/day',
   'Rent a car in Belle Mare on Mauritius'' east coast, close to the island''s largest resorts and the Ile aux Cerfs boat departures.',
   'Belle Mare on the east coast is where Mauritius'' largest resort hotels sit, backed by some of the island''s calmest, most sheltered lagoon water. A car picked up here opens up the east coast at your own pace — the public beach, nearby golf courses, and the short drive to Trou d''Eau Douce for the Ile aux Cerfs boat departures. The coastal road is quiet compared with the north, with easy roadside and hotel parking throughout. Belle Mare works well as a base for a slower-paced stay, with day trips inland to Grand Bassin or across to the capital comfortably reachable in under an hour. Our office coordinates directly with the resorts along this stretch for hotel-to-car handovers, so pickup rarely means leaving your hotel grounds.',
   3, true),
  ('10000000-0000-0000-0000-000000000004', 'trou-aux-biches', 'Trou-aux-Biches', 'branch', 'Pamplemousses', 'Royal Road, Trou-aux-Biches, Pamplemousses', -20.0339, 57.5461, true,
   'Car Rental in Trou-aux-Biches | Reliable Cars from Rs 1,200/day',
   'Rent a car in Trou-aux-Biches, a quiet north-west lagoon town close to Grand Baie and Cap Malheureux.',
   'Trou-aux-Biches sits on the calm north-west lagoon, a quieter alternative to Grand Baie with the same easy road access to the island''s northern attractions. The branch is close to the public beach and the row of guesthouses and small hotels along the coast road, with straightforward free parking nearby. From here it''s a short hop to Grand Baie''s restaurants and nightlife, or north to Cap Malheureux and the picturesque red-roofed church at the island''s tip. The roads north are flat, well maintained and easy for first-time visitors to navigate. Snorkelling boat trips depart directly from the public beach a few minutes'' walk from our counter, making an early pickup and a morning on the water an easy combination.',
   4, true),
  ('10000000-0000-0000-0000-000000000005', 'le-morne', 'Le Morne', 'branch', 'Savanne', 'Coastal Road, La Gaulette, Le Morne, Savanne', -20.4547, 57.3106, true,
   'Car Rental in Le Morne | Reliable Cars from Rs 1,200/day',
   'Rent a car at Le Morne on Mauritius'' south-west coast, beneath the UNESCO-listed mountain and close to Black River Gorges.',
   'Le Morne sits beneath the UNESCO-listed mountain of the same name, at the quieter south-western tip of the island, prized by kitesurfers for its reliable wind and by everyone else for the view. A car from here makes the most of the south coast — Black River Gorges National Park, the wild coastline towards Baie du Cap, and the calmer roads compared with the busier north. Our counter is close to the resort cluster at the foot of the mountain, with hotel and public parking both available nearby. The drive to Chamarel and the Seven Coloured Earths takes about twenty minutes, and the road north to Flic-en-Flac hugs the coast for one of the most scenic short drives on the island.',
   5, true),
  ('10000000-0000-0000-0000-000000000006', 'ssr-airport', 'SSR International Airport', 'airport', 'Grand Port', 'SSR International Airport, Plaine Magnien, Grand Port', -20.4302, 57.6836, true,
   'Car Rental at SSR International Airport | Reliable Cars from Rs 1,200/day',
   'Pick up your rental car on arrival at SSR International Airport, Mauritius. No transfer needed — start driving the moment you land.',
   'Picking up at SSR International Airport in Plaine Magnien means your rental starts the moment you land, with no transfer needed before your holiday begins. Our counter is a short walk from the arrivals hall, and we track incoming flights so a delay never means a wasted booking. From the airport it''s a quick drive to the south-east coast, Blue Bay''s marine park, or north towards the resort belt at Belle Mare and Grand Baie. Returning here at the end of your stay is just as simple — drop the car and walk straight to check-in. Airport pickups carry a small delivery charge, covering the extra coordination with the terminal, and are the fastest way to be on the road within minutes of touching down in Mauritius.',
   6, true)
on conflict (slug) do update set
  name = excluded.name, type = excluded.type, region = excluded.region, address = excluded.address,
  latitude = excluded.latitude, longitude = excluded.longitude, is_pickup_point = excluded.is_pickup_point,
  seo_title = excluded.seo_title, seo_description = excluded.seo_description, intro_content = excluded.intro_content,
  display_order = excluded.display_order, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Vehicle categories (8)
-- ────────────────────────────────────────────────────────────────────────
insert into vehicle_categories (id, slug, name, make, model, category, transmission, seats, doors, fuel_type, air_conditioning, daily_rate_mur, description, features, display_order, is_active)
values
  ('20000000-0000-0000-0000-000000000001', 'toyota-vitz', 'Toyota Vitz', 'Toyota', 'Vitz', 'economy', 'automatic', 5, 5, 'petrol', true, 1200,
   'A compact, fuel-efficient hatchback that''s the easiest way to get around Mauritius. Automatic transmission, a tight turning circle and low running costs make it ideal for couples or solo travellers sticking to town and coastal roads.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage"]', 1, true),
  ('20000000-0000-0000-0000-000000000002', 'suzuki-swift', 'Suzuki Swift', 'Suzuki', 'Swift', 'economy', 'automatic', 5, 5, 'petrol', true, 1300,
   'A sportier alternative to the Vitz with the same easy-to-drive automatic gearbox. Comfortable for two with light luggage, and nimble enough for narrow hotel driveways and busy town centres across the island.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage"]', 2, true),
  ('20000000-0000-0000-0000-000000000003', 'toyota-axio', 'Toyota Axio', 'Toyota', 'Axio', 'comfort', 'automatic', 5, 5, 'petrol', true, 1500,
   'A roomier sedan with a proper boot, suited to couples or small families who want more space than a hatchback without stepping up to an SUV. Smooth and quiet on both coastal and inland roads.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Power windows"]', 3, true),
  ('20000000-0000-0000-0000-000000000004', 'nissan-note', 'Nissan Note', 'Nissan', 'Note', 'comfort', 'automatic', 5, 5, 'petrol', true, 1450,
   'A practical hatchback with a surprisingly large boot for its size, popular with families who need to fit luggage, a stroller and beach gear without upgrading to a larger, pricier category.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage"]', 4, true),
  ('20000000-0000-0000-0000-000000000005', 'toyota-noah', 'Toyota Noah', 'Toyota', 'Noah', 'comfort', 'automatic', 7, 5, 'petrol', true, 2400,
   'A seven-seat family van with sliding doors, built for groups and families travelling together. Easy to load, comfortable on longer drives, and the natural choice for an island tour with everyone in one car.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","7 seats","Sliding doors"]', 5, true),
  ('20000000-0000-0000-0000-000000000006', 'suzuki-vitara', 'Suzuki Vitara', 'Suzuki', 'Vitara', 'suv', 'automatic', 5, 5, 'petrol', true, 2800,
   'A compact SUV with a higher driving position and confident handling on Mauritius'' hillier inland roads. Comfortable for four adults with luggage, and equally at home on the coast or heading up to Chamarel.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","Reversing camera"]', 6, true),
  ('20000000-0000-0000-0000-000000000007', 'nissan-xtrail', 'Nissan X-Trail', 'Nissan', 'X-Trail', 'suv', 'automatic', 7, 5, 'petrol', true, 3200,
   'A larger seven-seat SUV for bigger groups who still want SUV ground clearance and comfort. Spacious, well-equipped and the most capable option in the fleet for a full day of exploring inland.',
   '["Air conditioning","Bluetooth","USB charging","Unlimited mileage","7 seats","Reversing camera"]', 7, true),
  ('20000000-0000-0000-0000-000000000008', 'mercedes-c-class', 'Mercedes C-Class', 'Mercedes-Benz', 'C-Class', 'premium', 'automatic', 5, 5, 'petrol', true, 5500,
   'Our premium option for travellers who want a genuinely comfortable, well-appointed sedan — ideal for business trips, special occasions, or simply a more refined way to see the island.',
   '["Air conditioning","Bluetooth","Leather seats","Unlimited mileage","Premium sound system","Cruise control"]', 8, true)
on conflict (slug) do update set
  name = excluded.name, make = excluded.make, model = excluded.model, category = excluded.category,
  transmission = excluded.transmission, seats = excluded.seats, doors = excluded.doors, fuel_type = excluded.fuel_type,
  air_conditioning = excluded.air_conditioning, daily_rate_mur = excluded.daily_rate_mur, description = excluded.description,
  features = excluded.features, display_order = excluded.display_order, is_active = excluded.is_active;

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
insert into add_ons (id, slug, name, description, price_mur, price_type, is_active)
values
  ('50000000-0000-0000-0000-000000000001', 'additional-driver', 'Additional driver', 'Add a second named driver to the rental agreement.', 300, 'per_booking', true),
  ('50000000-0000-0000-0000-000000000002', 'baby-seat', 'Baby seat', 'Rear-facing or forward-facing child seat, fitted before pickup.', 200, 'per_booking', true),
  ('50000000-0000-0000-0000-000000000003', 'airport-delivery', 'Airport delivery', 'Car delivered to and collected from SSR International Airport.', 800, 'per_booking', true),
  ('50000000-0000-0000-0000-000000000004', 'hotel-delivery', 'Hotel delivery', 'Car delivered to and collected from your partner hotel.', 500, 'per_booking', true),
  ('50000000-0000-0000-0000-000000000005', 'gps', 'GPS', 'Dedicated GPS navigation unit, pre-loaded with island maps.', 150, 'per_day', true),
  ('50000000-0000-0000-0000-000000000006', 'full-insurance', 'Full insurance upgrade', 'Reduces the standard excess to zero for the full rental period.', 400, 'per_day', true)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price_mur = excluded.price_mur,
  price_type = excluded.price_type, is_active = excluded.is_active;

-- ────────────────────────────────────────────────────────────────────────
-- Vehicles (30) — 21 usually-available, but ~19 available / 8 booked /
-- 3 maintenance right now so counts line up with the 8 "active" bookings
-- below (a vehicle only flips to "booked" once a rental is actually under
-- way, not merely confirmed for the future).
-- ────────────────────────────────────────────────────────────────────────
insert into vehicles (id, category_id, code, registration, location_id, status, mileage_km, year, colour, acquired_at)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'VITZ-001', '1024 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 18000, 2023, 'White', '2023-02-10'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'VITZ-002', '1025 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 27000, 2022, 'Silver', '2022-05-14'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', 'VITZ-003', '1026 GB 21', '10000000-0000-0000-0000-000000000001', 'maintenance', 41000, 2021, 'Grey', '2021-06-20'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'VITZ-004', '2031 FE 23', '10000000-0000-0000-0000-000000000002', 'available', 15500, 2023, 'White', '2023-08-02'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', 'VITZ-005', '2032 FE 22', '10000000-0000-0000-0000-000000000002', 'booked', 58000, 2020, 'Blue', '2020-03-11'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001', 'VITZ-006', '3041 BM 21', '10000000-0000-0000-0000-000000000003', 'available', 32000, 2022, 'Red', '2022-01-25'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', 'VITZ-007', '3042 BM 23', '10000000-0000-0000-0000-000000000003', 'booked', 71000, 2019, 'White', '2019-09-17'),
  ('30000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', 'VITZ-008', '4051 TB 22', '10000000-0000-0000-0000-000000000004', 'available', 15200, 2024, 'Silver', '2024-01-08'),
  ('30000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', 'VITZ-009', '5061 LM 20', '10000000-0000-0000-0000-000000000005', 'booked', 46000, 2021, 'Grey', '2021-11-30'),

  ('30000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', 'SWIFT-001', '1101 GB 23', '10000000-0000-0000-0000-000000000001', 'available', 29500, 2022, 'Blue', '2022-04-19'),
  ('30000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000002', 'SWIFT-002', '2102 FE 21', '10000000-0000-0000-0000-000000000002', 'available', 21000, 2023, 'White', '2023-03-05'),
  ('30000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000002', 'SWIFT-003', '3103 BM 22', '10000000-0000-0000-0000-000000000003', 'booked', 62000, 2020, 'Red', '2020-07-22'),
  ('30000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000002', 'SWIFT-004', '4104 TB 23', '10000000-0000-0000-0000-000000000004', 'available', 34500, 2022, 'Silver', '2022-08-14'),
  ('30000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000002', 'SWIFT-005', '5105 LM 19', '10000000-0000-0000-0000-000000000005', 'maintenance', 89000, 2018, 'Grey', '2018-12-01'),

  ('30000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000003', 'AXIO-001', '1201 GB 21', '10000000-0000-0000-0000-000000000001', 'available', 48000, 2021, 'White', '2021-02-17'),
  ('30000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000003', 'AXIO-002', '1202 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 19500, 2023, 'Silver', '2023-05-29'),
  ('30000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000003', 'AXIO-003', '2203 FE 20', '10000000-0000-0000-0000-000000000002', 'booked', 55000, 2020, 'Blue', '2020-10-03'),
  ('30000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000003', 'AXIO-004', '3204 BM 23', '10000000-0000-0000-0000-000000000003', 'available', 37000, 2022, 'Grey', '2022-06-11'),
  ('30000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000003', 'AXIO-005', '4205 TB 21', '10000000-0000-0000-0000-000000000004', 'available', 44000, 2021, 'White', '2021-09-26'),
  ('30000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000003', 'AXIO-006', '6206 SA 22', '10000000-0000-0000-0000-000000000006', 'available', 22500, 2023, 'Red', '2023-01-15'),

  ('30000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000004', 'NOTE-001', '1301 GB 22', '10000000-0000-0000-0000-000000000001', 'booked', 51000, 2020, 'Silver', '2020-05-08'),
  ('30000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000004', 'NOTE-002', '3302 BM 21', '10000000-0000-0000-0000-000000000003', 'available', 33000, 2022, 'White', '2022-02-20'),
  ('30000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000004', 'NOTE-003', '5303 LM 20', '10000000-0000-0000-0000-000000000005', 'available', 68000, 2019, 'Blue', '2019-11-12'),

  ('30000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000005', 'NOAH-001', '1401 GB 19', '10000000-0000-0000-0000-000000000001', 'available', 52000, 2021, 'White', '2021-03-30'),
  ('30000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000005', 'NOAH-002', '2402 FE 22', '10000000-0000-0000-0000-000000000002', 'booked', 39000, 2022, 'Silver', '2022-07-04'),
  ('30000000-0000-0000-0000-000000000026', '20000000-0000-0000-0000-000000000005', 'NOAH-003', '4403 TB 21', '10000000-0000-0000-0000-000000000004', 'maintenance', 94000, 2018, 'Grey', '2018-08-19'),
  ('30000000-0000-0000-0000-000000000027', '20000000-0000-0000-0000-000000000005', 'NOAH-004', '6404 SA 23', '10000000-0000-0000-0000-000000000006', 'available', 24000, 2023, 'White', '2023-04-22'),

  ('30000000-0000-0000-0000-000000000028', '20000000-0000-0000-0000-000000000006', 'VITARA-001', '1501 GB 22', '10000000-0000-0000-0000-000000000001', 'available', 31000, 2022, 'Blue', '2022-09-09'),

  ('30000000-0000-0000-0000-000000000029', '20000000-0000-0000-0000-000000000007', 'XTRAIL-001', '2601 FE 21', '10000000-0000-0000-0000-000000000002', 'booked', 47000, 2021, 'Grey', '2021-05-27'),

  ('30000000-0000-0000-0000-000000000030', '20000000-0000-0000-0000-000000000008', 'CCLASS-001', '1701 GB 24', '10000000-0000-0000-0000-000000000001', 'available', 16500, 2023, 'Black', '2023-10-01')
on conflict (code) do update set
  category_id = excluded.category_id, registration = excluded.registration, location_id = excluded.location_id,
  status = excluded.status, mileage_km = excluded.mileage_km, year = excluded.year, colour = excluded.colour,
  acquired_at = excluded.acquired_at;

-- ────────────────────────────────────────────────────────────────────────
-- Settings
-- ────────────────────────────────────────────────────────────────────────
insert into settings (key, value)
values
  ('company_name', '"RentNext Mauritius"'),
  ('currency', '"MUR"'),
  ('default_pickup_time', '"10:00"'),
  ('default_return_time', '"10:00"'),
  ('minimum_rental_days', '2'),
  ('booking_email', '"bookings@rentnext.mu"')
on conflict (key) do update set value = excluded.value;

-- ────────────────────────────────────────────────────────────────────────
-- Transactional demo data — cleared and reinserted every run so dates
-- stay relative to "now". Order matters: children before parents.
-- ────────────────────────────────────────────────────────────────────────
delete from payments;
delete from booking_add_ons;
delete from bookings;
delete from customers;

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

-- Bookings (25): 6 completed, 8 active (today), 11 upcoming (9 confirmed,
-- 2 requested with no vehicle assigned). 6 are hotel-sourced. Reference
-- numbers and created_at are computed from each booking's own pickup date
-- so they stay internally consistent on every re-seed.
insert into bookings (id, reference, customer_id, category_id, vehicle_id, pickup_location_id, return_location_id, pickup_at, return_at, days, status, car_total_mur, addons_total_mur, total_mur, source, hotel_id, notes, created_at)
values
  -- Completed
  ('70000000-0000-0000-0000-000000000001', 'CR-' || to_char(now() - interval '25 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '22 days', now() - interval '17 days', 5, 'completed', 6000, 750, 6750, 'website', null, null, now() - interval '25 days'),
  ('70000000-0000-0000-0000-000000000002', 'CR-' || to_char(now() - interval '31 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000017',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '28 days', now() - interval '23 days', 5, 'completed', 7500, 0, 7500, 'website', null, null, now() - interval '31 days'),
  ('70000000-0000-0000-0000-000000000003', 'CR-' || to_char(now() - interval '18 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000010',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '15 days', now() - interval '11 days', 4, 'completed', 5200, 700, 5900, 'hotel', '40000000-0000-0000-0000-000000000001',
   'Guest requested a car seat waiting in the room, not fitted at pickup.', now() - interval '18 days'),
  ('70000000-0000-0000-0000-000000000004', 'CR-' || to_char(now() - interval '33 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000024',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '30 days', now() - interval '23 days', 7, 'completed', 16800, 0, 16800, 'phone', null, null, now() - interval '33 days'),
  ('70000000-0000-0000-0000-000000000005', 'CR-' || to_char(now() - interval '15 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   now() - interval '12 days', now() - interval '8 days', 4, 'completed', 4800, 300, 5100, 'website', null, null, now() - interval '15 days'),
  ('70000000-0000-0000-0000-000000000006', 'CR-' || to_char(now() - interval '43 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000029',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '40 days', now() - interval '33 days', 7, 'completed', 22400, 0, 22400, 'website', null, null, now() - interval '43 days'),

  -- Active (today)
  ('70000000-0000-0000-0000-000000000007', 'CR-' || to_char(now() - interval '5 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '2 days', now() + interval '3 days', 5, 'active', 6000, 2750, 8750, 'website', null, null, now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000008', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '1 days', now() + interval '4 days', 5, 'active', 6000, 0, 6000, 'website', null, null, now() - interval '4 days'),
  ('70000000-0000-0000-0000-000000000009', 'CR-' || to_char(now() - interval '6 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000005',
   now() - interval '3 days', now() + interval '2 days', 5, 'active', 6000, 700, 6700, 'hotel', '40000000-0000-0000-0000-000000000002', null, now() - interval '6 days'),
  ('70000000-0000-0000-0000-000000000010', 'CR-' || to_char(now() - interval '5 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000012',
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() - interval '2 days', now() + interval '2 days', 4, 'active', 5200, 0, 5200, 'phone', null, null, now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000011', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000017',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '1 days', now() + interval '4 days', 5, 'active', 7500, 750, 8250, 'website', null, null, now() - interval '4 days'),
  ('70000000-0000-0000-0000-000000000012', 'CR-' || to_char(now() - interval '7 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000012', '20000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000021',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() - interval '4 days', now() + interval '1 days', 5, 'active', 7250, 0, 7250, 'website', null, null, now() - interval '7 days'),
  ('70000000-0000-0000-0000-000000000013', 'CR-' || to_char(now() - interval '5 days', 'YYYYMMDD') || '-003',
   '60000000-0000-0000-0000-000000000013', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000025',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '2 days', now() + interval '5 days', 7, 'active', 16800, 500, 17300, 'hotel', '40000000-0000-0000-0000-000000000003', null, now() - interval '5 days'),
  ('70000000-0000-0000-0000-000000000014', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-003',
   '60000000-0000-0000-0000-000000000014', '20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000029',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() - interval '1 days', now() + interval '6 days', 7, 'active', 22400, 0, 22400, 'website', null, null, now() - interval '4 days'),

  -- Upcoming (next 3 weeks) — confirmed, vehicle assigned
  ('70000000-0000-0000-0000-000000000015', 'CR-' || to_char(now(), 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000015', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() + interval '3 days', now() + interval '8 days', 5, 'confirmed', 6000, 1050, 7050, 'website', null, null, now()),
  ('70000000-0000-0000-0000-000000000016', 'CR-' || to_char(now() - interval '2 days', 'YYYYMMDD') || '-001',
   '60000000-0000-0000-0000-000000000016', '20000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000028',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005',
   now() + interval '5 days', now() + interval '12 days', 7, 'confirmed', 19600, 0, 19600, 'website', null,
   'One-way rental — returning at Le Morne, not Grand Baie.', now() - interval '2 days'),
  -- Requested, no vehicle assigned yet
  ('70000000-0000-0000-0000-000000000017', 'CR-' || to_char(now() - interval '1 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000003', null,
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() + interval '2 days', now() + interval '6 days', 4, 'requested', 6000, 0, 6000, 'phone', null, null, now() - interval '1 days'),
  ('70000000-0000-0000-0000-000000000018', 'CR-' || to_char(now() - interval '3 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000016',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() + interval '7 days', now() + interval '11 days', 4, 'confirmed', 6000, 500, 6500, 'hotel', '40000000-0000-0000-0000-000000000001', null, now() - interval '3 days'),
  ('70000000-0000-0000-0000-000000000019', 'CR-' || to_char(now() - interval '1 days', 'YYYYMMDD') || '-003',
   '60000000-0000-0000-0000-000000000019', '20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000027',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001',
   now() + interval '4 days', now() + interval '11 days', 7, 'confirmed', 16800, 800, 17600, 'website', null,
   'Flight MK460 — confirm landing time before dispatch. One-way to Grand Baie.', now() - interval '1 days'),
  ('70000000-0000-0000-0000-000000000020', 'CR-' || to_char(now() - interval '6 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000030',
   '10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   now() + interval '10 days', now() + interval '15 days', 5, 'confirmed', 27500, 2750, 30250, 'website', null, null, now() - interval '6 days'),
  ('70000000-0000-0000-0000-000000000021', 'CR-' || to_char(now() - interval '2 days', 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000021', '20000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000020',
   '10000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000006',
   now() + interval '6 days', now() + interval '9 days', 3, 'confirmed', 4500, 800, 5300, 'website', null,
   'Flight AI2543.', now() - interval '2 days'),
  ('70000000-0000-0000-0000-000000000022', 'CR-' || to_char(now() - interval '4 days', 'YYYYMMDD') || '-004',
   '60000000-0000-0000-0000-000000000022', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004',
   now() + interval '8 days', now() + interval '12 days', 4, 'confirmed', 4800, 700, 5500, 'hotel', '40000000-0000-0000-0000-000000000002', null, now() - interval '4 days'),
  ('70000000-0000-0000-0000-000000000023', 'CR-' || to_char(now() - interval '1 days', 'YYYYMMDD') || '-004',
   '60000000-0000-0000-0000-000000000023', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000011',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() + interval '9 days', now() + interval '13 days', 4, 'confirmed', 5200, 0, 5200, 'website', null, null, now() - interval '1 days'),
  -- Requested, no vehicle assigned yet
  ('70000000-0000-0000-0000-000000000024', 'CR-' || to_char(now(), 'YYYYMMDD') || '-002',
   '60000000-0000-0000-0000-000000000024', '20000000-0000-0000-0000-000000000004', null,
   '10000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003',
   now() + interval '12 days', now() + interval '16 days', 4, 'requested', 5800, 0, 5800, 'walk_in', null, null, now()),
  ('70000000-0000-0000-0000-000000000025', 'CR-' || to_char(now() - interval '2 days', 'YYYYMMDD') || '-003',
   '60000000-0000-0000-0000-000000000025', '20000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   now() + interval '14 days', now() + interval '17 days', 3, 'confirmed', 3600, 500, 4100, 'hotel', '40000000-0000-0000-0000-000000000003', null, now() - interval '2 days');

-- Booking add-ons — attached to roughly half the bookings
insert into booking_add_ons (booking_id, add_on_id, quantity, unit_price_mur, total_mur)
values
  ('70000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', 1, 150, 750),                                     -- B1 gps x5 days
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 1, 200, 200),                                     -- B3 baby seat
  ('70000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000004', 1, 500, 500),                                     -- B3 hotel delivery
  ('70000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001', 1, 300, 300),                                     -- B5 additional driver
  ('70000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000005', 1, 150, 750),                                     -- B7 gps x5 days
  ('70000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000006', 1, 400, 2000),                                    -- B7 full insurance x5 days
  ('70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000004', 1, 500, 500),                                     -- B9 hotel delivery
  ('70000000-0000-0000-0000-000000000009', '50000000-0000-0000-0000-000000000002', 1, 200, 200),                                     -- B9 baby seat
  ('70000000-0000-0000-0000-000000000011', '50000000-0000-0000-0000-000000000005', 1, 150, 750),                                     -- B11 gps x5 days
  ('70000000-0000-0000-0000-000000000013', '50000000-0000-0000-0000-000000000004', 1, 500, 500),                                     -- B13 hotel delivery
  ('70000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000005', 1, 150, 750),                                     -- B15 gps x5 days
  ('70000000-0000-0000-0000-000000000015', '50000000-0000-0000-0000-000000000001', 1, 300, 300),                                     -- B15 additional driver
  ('70000000-0000-0000-0000-000000000018', '50000000-0000-0000-0000-000000000004', 1, 500, 500),                                     -- B18 hotel delivery
  ('70000000-0000-0000-0000-000000000019', '50000000-0000-0000-0000-000000000003', 1, 800, 800),                                     -- B19 airport delivery
  ('70000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000006', 1, 400, 2000),                                    -- B20 full insurance x5 days
  ('70000000-0000-0000-0000-000000000020', '50000000-0000-0000-0000-000000000005', 1, 150, 750),                                     -- B20 gps x5 days
  ('70000000-0000-0000-0000-000000000021', '50000000-0000-0000-0000-000000000003', 1, 800, 800),                                     -- B21 airport delivery
  ('70000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000004', 1, 500, 500),                                     -- B22 hotel delivery
  ('70000000-0000-0000-0000-000000000022', '50000000-0000-0000-0000-000000000002', 1, 200, 200),                                     -- B22 baby seat
  ('70000000-0000-0000-0000-000000000025', '50000000-0000-0000-0000-000000000004', 1, 500, 500);                                     -- B25 hotel delivery

-- Payments — one paid row for every confirmed/active/completed booking
-- (the two 'requested' bookings, 17 and 24, have none yet).
insert into payments (booking_id, amount_mur, method, status, reference, paid_at)
select b.id, b.total_mur,
  (array['cash','card','transfer','online'])[1 + (row_number() over (order by b.id))::int % 4],
  'paid',
  'TXN-' || lpad((100000 + row_number() over (order by b.id))::text, 6, '0'),
  b.created_at + interval '2 hours'
from bookings b
where b.status in ('confirmed', 'active', 'completed');

commit;
