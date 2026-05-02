-- Run this in Supabase SQL Editor to generate all routes, buses, and schedules!

DO $$
DECLARE
  cities public.pakistan_city[] := ARRAY['Karachi', 'Lahore', 'Islamabad', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Hyderabad']::public.pakistan_city[];
  city1 public.pakistan_city;
  city2 public.pakistan_city;
  r_id UUID;
  b_id UUID;
  dist DECIMAL;
  d DATE;
  travel_days INT := 14;
  start_date DATE := CURRENT_DATE;
  bus_number TEXT;
BEGIN
  -- Unassign drivers from buses so we can delete buses safely
  UPDATE public.drivers SET bus_id = NULL;
  
  -- Clear existing data
  TRUNCATE public.bookings CASCADE;
  TRUNCATE public.schedules CASCADE;
  DELETE FROM public.buses;
  DELETE FROM public.routes;

  FOR i IN 1..array_length(cities, 1) LOOP
    FOR j IN 1..array_length(cities, 1) LOOP
      IF i != j THEN
        city1 := cities[i];
        city2 := cities[j];
        
        -- Rough distance estimation for realism
        dist := 100 + (abs(i-j) * 150) + (floor(random() * 50));

        -- Insert route
        INSERT INTO public.routes (departure, destination, distance_km)
        VALUES (city1, city2, dist)
        RETURNING id INTO r_id;

        -- Insert bus for this route (e.g. BUS-KarLah-402)
        bus_number := 'BUS-' || substring(city1::text, 1, 3) || substring(city2::text, 1, 3) || '-' || (floor(random() * 900) + 100)::int;
        
        INSERT INTO public.buses (bus_no, capacity, route_id)
        VALUES (bus_number, 40, r_id)
        RETURNING id INTO b_id;

        -- Insert schedules for 14 days
        FOR d_offset IN 0..(travel_days - 1) LOOP
          d := start_date + d_offset;
          
          INSERT INTO public.schedules (
            bus_id, 
            departure_time, 
            arrival_time, 
            travel_date, 
            seat_price, 
            status, 
            trip_progress
          )
          VALUES (
            b_id,
            '10:00:00',
            '18:00:00',
            d,
            dist * 4.0, -- Rs. 4 per km
            'scheduled',
            0.0
          );
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
END $$;
