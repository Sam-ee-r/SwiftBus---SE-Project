-- ─────────────────────────────────────────────────────────────
-- Refund Processing System
-- ─────────────────────────────────────────────────────────────

-- Create refunds table linked to payments
CREATE TABLE IF NOT EXISTS public.refunds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     UUID REFERENCES public.payments(id) ON DELETE CASCADE NOT NULL,
  booking_id     UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  reason         TEXT DEFAULT 'Booking cancelled by passenger',
  -- Tracks the state: pending → approved → processed | rejected
  status         TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'approved', 'processed', 'rejected')),
  requested_at   TIMESTAMPTZ DEFAULT now(),
  processed_at   TIMESTAMPTZ,
  processed_by   UUID REFERENCES auth.users(id),
  notes          TEXT
);

-- Enable RLS
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

-- Passengers can see their own refund requests
CREATE POLICY "Passengers can view own refunds"
  ON public.refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = refunds.booking_id
        AND bookings.passenger_id = auth.uid()
    )
  );

-- Passengers can create refund requests for their own bookings
CREATE POLICY "Passengers can request refunds"
  ON public.refunds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = refunds.booking_id
        AND bookings.passenger_id = auth.uid()
    )
  );

-- Admins can view and manage all refunds
CREATE POLICY "Admins can manage all refunds"
  ON public.refunds FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Mark payment refund_flag = true when a refund is processed
CREATE OR REPLACE FUNCTION public.handle_refund_processed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'processed' AND OLD.status <> 'processed' THEN
    UPDATE public.payments
      SET refund_flag = true
      WHERE id = NEW.payment_id;
    NEW.processed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_refund_status_change
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW EXECUTE FUNCTION public.handle_refund_processed();
