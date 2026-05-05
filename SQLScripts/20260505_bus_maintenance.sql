-- Add odometer and maintenance tracking columns to buses table
ALTER TABLE public.buses
  ADD COLUMN IF NOT EXISTS total_km_driven    DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_since_service   DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_serviced_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS maintenance_alert_dismissed BOOLEAN NOT NULL DEFAULT false;

-- Maintenance service log table
CREATE TABLE IF NOT EXISTS public.bus_maintenance_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id          UUID REFERENCES public.buses(id) ON DELETE CASCADE NOT NULL,
  serviced_by     UUID REFERENCES auth.users(id),   -- admin or driver who logged it
  km_at_service   DECIMAL(10,2) NOT NULL,           -- total_km_driven at time of service
  serviced_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT
);

-- RLS on maintenance logs
ALTER TABLE public.bus_maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage maintenance logs"
  ON public.bus_maintenance_logs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Drivers can insert and read their own bus's logs
CREATE POLICY "Drivers can insert maintenance logs"
  ON public.bus_maintenance_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'driver'));

CREATE POLICY "Drivers can read maintenance logs"
  ON public.bus_maintenance_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'driver') OR public.has_role(auth.uid(), 'admin'));

-- Allow drivers to update km fields and maintenance_alert_dismissed on their assigned bus
CREATE POLICY "Drivers can update their bus odometer"
  ON public.buses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.bus_id = buses.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.drivers
      WHERE drivers.user_id = auth.uid()
        AND drivers.bus_id = buses.id
    )
  );
