-- Incremental migration: remove route_id from buses and ensure schedules present

-- Ensure schedules table exists (safe)
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES public.buses(id) NOT NULL,
  route_id UUID REFERENCES public.routes(id) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  travel_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Remove foreign key constraint if exists and drop route_id column from buses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'buses' AND column_name = 'route_id'
  ) THEN
    -- Drop FK constraint if present
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'buses_route_id_fkey'
    ) THEN
      ALTER TABLE public.buses DROP CONSTRAINT IF EXISTS buses_route_id_fkey;
    END IF;

    ALTER TABLE public.buses DROP COLUMN IF EXISTS route_id;
  END IF;
END$$;

-- Note: This migration only removes the column from buses schema. It does NOT automatically create schedules for existing data.
-- If you want to migrate existing bus->route assignments to schedules, run a data-migration separately.
