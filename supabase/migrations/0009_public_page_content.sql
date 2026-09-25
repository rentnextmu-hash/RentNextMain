-- 0009_public_page_content.sql
-- Content the public car and location pages (P3.3, P4.1) need that had
-- nowhere to live yet. All of it is editable data, not code — and all of
-- it is DRAFT copy for the client to confirm (drive times are approximate,
-- light-traffic estimates; opening hours match the 08:00-18:00 handover
-- times the booking flow offers).
--
--   1. locations.opening_hours, drive_times, faqs — the location page's
--      office block, "Getting around" list and two local FAQs.
--   2. settings.rental_faqs — the four rental questions on every car page
--      (licence, age, fuel, deposit). Deliberately general: no specific
--      deposit amount or minimum age is stated until the client gives them.
--   3. seo_title price placeholder. Every title said "from Rs 2,700/day"
--      (the Celerio's 3-5 day rate) as fixed text, which goes stale the
--      moment rates change. Titles now carry {from_price}, filled in by
--      the page from the live cheapest rate.
--
--   4. location_fleet_counts view — public per-location car counts.
--
-- The same content is in seed.sql so a freshly seeded database has it
-- too; these UPDATEs backfill the already-seeded live project.

alter table locations
  add column opening_hours text,
  add column drive_times jsonb not null default '[]',   -- [{ "place": "Port Louis", "minutes": 35 }]
  add column faqs jsonb not null default '[]';          -- [{ "question": "...", "answer": "..." }]

update locations set
  opening_hours = 'Daily, 08:00 – 18:00',
  seo_title = replace(seo_title, 'Rs 2,700/day', '{from_price}/day')
where seo_title like '%Rs 2,700/day%' or opening_hours is null;

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
on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────────────
-- 4. location_fleet_counts — "N cars based here" on the public location
-- pages. Same pattern as 0005's category_available_counts: `vehicles` is
-- staff-only RLS, so this view (running with its owner's privileges)
-- exposes only an aggregate count per location — no codes, registrations
-- or statuses. Counts cars that can be rented (available or booked), not
-- ones in maintenance or retired.
-- ────────────────────────────────────────────────────────────────────────
create view public.location_fleet_counts as
select location_id, count(*)::int as vehicle_count
from vehicles
where status in ('available', 'booked')
group by location_id;

grant select on public.location_fleet_counts to anon, authenticated;
