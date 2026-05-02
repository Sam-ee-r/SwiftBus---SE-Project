-- ==========================================================
-- Audit Fix Migration — Run this in Supabase SQL Editor
-- ==========================================================

-- 1. Create notifications table (was missing entirely)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Any authenticated user can insert (needed for driver → passenger notifications)
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- 2. Allow drivers to UPDATE their own bus's schedules (status + trip_progress)
DROP POLICY IF EXISTS "Drivers can update trip status" ON public.schedules;
CREATE POLICY "Drivers can update trip status"
  ON public.schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
      AND d.bus_id = schedules.bus_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id = auth.uid()
      AND d.bus_id = schedules.bus_id
    )
  );


-- 3. Ensure trip_progress column exists
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS trip_progress DECIMAL(8,6) DEFAULT 0.0;

-- 4. Ensure status column exists
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';

-- 5. Public SELECT on schedules (for shareable tracking links)
DROP POLICY IF EXISTS "Public can view schedules" ON public.schedules;
CREATE POLICY "Public can view schedules"
  ON public.schedules FOR SELECT
  USING (true);
