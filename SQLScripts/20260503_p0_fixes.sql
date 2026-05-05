-- ============================================================
-- P0 Audit Fix Migration
-- Run this ENTIRE script in Supabase SQL Editor > Run
-- ============================================================

-- ── 1. notifications table ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT        NOT NULL,
  message    TEXT        NOT NULL,
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications"   ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Auth users can insert notifications" ON public.notifications;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Any authenticated session can create a notification for any user_id
-- (needed so the driver can notify passengers on their booking)
CREATE POLICY "Auth users can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');


-- ── 2. schedules: ensure required columns exist ───────────
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS status        TEXT             NOT NULL DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS trip_progress DECIMAL(8,6)     NOT NULL DEFAULT 0.0;


-- ── 3. Driver UPDATE policy on schedules ─────────────────
-- Lets a driver update status/trip_progress on schedules
-- where their assigned bus matches.
DROP POLICY IF EXISTS "Drivers can update trip status" ON public.schedules;

CREATE POLICY "Drivers can update trip status"
  ON public.schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id  = auth.uid()
        AND d.bus_id   = schedules.bus_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers d
      WHERE d.user_id  = auth.uid()
        AND d.bus_id   = schedules.bus_id
    )
  );


-- ── 4. Public SELECT on schedules (shareable tracking links) ─
DROP POLICY IF EXISTS "Public can view schedules" ON public.schedules;
CREATE POLICY "Public can view schedules"
  ON public.schedules FOR SELECT
  USING (true);
