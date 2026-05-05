-- Add seat_price to schedules

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS seat_price DECIMAL(10,2) DEFAULT 0.00;

-- Optionally, update existing schedules with a default price based on route distance (example)
-- UPDATE public.schedules s
-- SET seat_price = (r.distance_km * 0.5)
-- FROM public.routes r
-- WHERE s.route_id = r.id
;
