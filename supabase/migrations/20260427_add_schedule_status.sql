-- Add status column to schedules table
-- Possible values: 'scheduled', 'in_transit', 'completed'
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';
