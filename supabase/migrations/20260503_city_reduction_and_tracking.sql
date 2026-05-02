-- ============================================================
-- Migration: Reduce cities + add trip_progress to schedules
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop all existing route/schedule/booking data so we can safely change the enum
TRUNCATE public.bookings CASCADE;
TRUNCATE public.schedules CASCADE;
TRUNCATE public.routes CASCADE;

-- Step 2: Drop foreign key usage, recreate enum with only 8 major cities
-- We need to temporarily change the column type to TEXT, recreate enum, then restore.
ALTER TABLE public.routes ALTER COLUMN departure TYPE TEXT;
ALTER TABLE public.routes ALTER COLUMN destination TYPE TEXT;

DROP TYPE IF EXISTS public.pakistan_city CASCADE;

CREATE TYPE public.pakistan_city AS ENUM (
  'Karachi',
  'Lahore',
  'Islamabad',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Hyderabad'
);

ALTER TABLE public.routes ALTER COLUMN departure TYPE public.pakistan_city USING departure::public.pakistan_city;
ALTER TABLE public.routes ALTER COLUMN destination TYPE public.pakistan_city USING destination::public.pakistan_city;

-- Step 3: Add trip_progress column to schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS trip_progress DECIMAL(8,6) DEFAULT 0.0;

-- Step 4: Make schedules publicly readable (for the shareable tracking page)
DROP POLICY IF EXISTS "Public can view schedules" ON public.schedules;
CREATE POLICY "Public can view schedules"
ON public.schedules FOR SELECT
USING (true);

-- Step 5: Seed the 8-city routes (logical direct connections only)
INSERT INTO public.routes (departure, destination, distance_km) VALUES
  ('Karachi',    'Hyderabad',  163),
  ('Hyderabad',  'Karachi',    163),
  ('Karachi',    'Multan',     1053),
  ('Multan',     'Karachi',    1053),
  ('Karachi',    'Quetta',     695),
  ('Quetta',     'Karachi',    695),
  ('Multan',     'Lahore',     348),
  ('Lahore',     'Multan',     348),
  ('Multan',     'Faisalabad', 266),
  ('Faisalabad', 'Multan',     266),
  ('Multan',     'Quetta',     666),
  ('Quetta',     'Multan',     666),
  ('Lahore',     'Islamabad',  375),
  ('Islamabad',  'Lahore',     375),
  ('Lahore',     'Faisalabad', 128),
  ('Faisalabad', 'Lahore',     128),
  ('Islamabad',  'Peshawar',   175),
  ('Peshawar',   'Islamabad',  175),
  ('Islamabad',  'Faisalabad', 259),
  ('Faisalabad', 'Islamabad',  259),
  ('Karachi',    'Lahore',     1212),
  ('Lahore',     'Karachi',    1212),
  ('Hyderabad',  'Multan',     900),
  ('Multan',     'Hyderabad',  900);
