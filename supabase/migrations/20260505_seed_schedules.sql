-- ============================================================
-- SwiftBus Seed: Schedules for Top 8 Cities — Next 7 Days
-- Works with EITHER the old full city names OR the new city codes.
-- Does NOT insert routes — only creates schedules for routes
-- that already exist in the database.
-- ============================================================

DO $$
DECLARE
  -- Works with both old names AND new codes (uses partial match approach)
  v_top8_patterns text[] := ARRAY[
    'KHI', 'Karachi',
    'LHE', 'Lahore',
    'ISB', 'Islamabad',
    'RWP', 'Rawalpindi',
    'FSD', 'Faisalabad',
    'MUX', 'Multan',
    'HYD', 'Hyderabad',
    'PEW', 'Peshawar'
  ];

  v_route         record;
  v_bus_ids       uuid[];
  v_bus_cnt       int;
  v_route_idx     int := 0;
  v_chosen_bus    uuid;
  v_day_offset    int;
  v_travel_day    date;
  v_dep_time      time;
  v_arr_time      time;
  v_travel_hrs    int;
  v_price         numeric(10,2);
  v_inserted      int := 0;
  v_skipped       int := 0;
BEGIN
  -- ── 1. Fetch all buses ────────────────────────────────────────────────
  SELECT array_agg(id ORDER BY bus_no)
    INTO v_bus_ids
    FROM public.buses;

  v_bus_cnt := coalesce(array_length(v_bus_ids, 1), 0);
  IF v_bus_cnt = 0 THEN
    RAISE EXCEPTION 'No buses found. Add buses via Admin → Manage Buses first.';
  END IF;

  RAISE NOTICE 'Found % bus(es).', v_bus_cnt;

  -- ── 2. Loop over ALL existing routes between any of the 8 cities ─────
  FOR v_route IN
    SELECT id, departure::text AS dep, destination::text AS dest, distance_km
    FROM public.routes
    WHERE departure::text = ANY(v_top8_patterns)
      AND destination::text = ANY(v_top8_patterns)
    ORDER BY departure::text, destination::text
  LOOP
    v_route_idx  := v_route_idx + 1;
    v_chosen_bus := v_bus_ids[(v_route_idx % v_bus_cnt) + 1];

    -- ── Calculate times ──────────────────────────────────────────────
    v_travel_hrs := GREATEST(2, ROUND(v_route.distance_km / 80.0)::int);

    v_dep_time := CASE
      WHEN v_route.distance_km > 1000 THEN '05:00'::time
      WHEN v_route.distance_km > 500  THEN '06:00'::time
      WHEN v_route.distance_km > 200  THEN '07:00'::time
      ELSE                                 '08:00'::time
    END;

    v_arr_time := v_dep_time + (v_travel_hrs || ' hours')::interval;
    v_price    := GREATEST(150, ROUND(v_route.distance_km * 2.5 / 50) * 50);

    -- ── Insert schedule for each of next 7 days ──────────────────────
    FOR v_day_offset IN 1..7 LOOP
      v_travel_day := CURRENT_DATE + v_day_offset;

      IF NOT EXISTS (
        SELECT 1 FROM public.schedules s
        WHERE s.route_id    = v_route.id
          AND s.travel_date = v_travel_day
      ) THEN
        INSERT INTO public.schedules
          (bus_id, route_id, travel_date, departure_time, arrival_time, seat_price, status, trip_progress)
        VALUES
          (v_chosen_bus, v_route.id, v_travel_day, v_dep_time, v_arr_time, v_price, 'scheduled', 0);
        v_inserted := v_inserted + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Complete: % routes found, % schedules inserted, % already existed.',
    v_route_idx, v_inserted, v_skipped;
END $$;

-- Verification: show what was created
SELECT
  r.departure::text  AS from_city,
  r.destination::text AS to_city,
  r.distance_km,
  COUNT(s.id)        AS schedules_created,
  MIN(s.travel_date)::text AS first_date,
  MAX(s.travel_date)::text AS last_date,
  MIN(s.seat_price)  AS fare_pkr
FROM public.schedules s
JOIN public.routes r ON r.id = s.route_id
WHERE s.travel_date BETWEEN CURRENT_DATE + 1 AND CURRENT_DATE + 8
  AND s.status = 'scheduled'
GROUP BY r.departure, r.destination, r.distance_km
ORDER BY r.departure::text, r.destination::text;
