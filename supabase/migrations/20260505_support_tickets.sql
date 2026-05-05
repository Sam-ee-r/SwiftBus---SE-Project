-- ============================================================
-- SUPPORT TICKETS & MESSAGES
-- Passenger ↔ Admin ticket-based communication system
-- ============================================================

-- 1. support_tickets — one per conversation thread
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  unread_by_admin BOOLEAN NOT NULL DEFAULT TRUE,
  unread_by_passenger BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. support_messages — individual messages inside a ticket
CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('passenger','admin')),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_passenger ON public.support_tickets(passenger_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket   ON public.support_messages(ticket_id);

-- 4. Auto-update updated_at on support_tickets when a new message arrives
CREATE OR REPLACE FUNCTION public.update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_ticket_ts ON public.support_messages;
CREATE TRIGGER trg_update_ticket_ts
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timestamp();

-- 5. Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Passengers: read & create own tickets
CREATE POLICY "Passengers can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = passenger_id);

CREATE POLICY "Passengers can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = passenger_id);

-- Admins: full access to all tickets
CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Messages: passengers see own ticket messages
CREATE POLICY "Passengers can view own messages"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND passenger_id = auth.uid())
  );

CREATE POLICY "Passengers can send messages in own tickets"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND passenger_id = auth.uid())
  );

-- Messages: admins full access
CREATE POLICY "Admins can view all messages"
  ON public.support_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can send messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    public.has_role(auth.uid(), 'admin')
  );

-- 6. Enable Realtime for live message delivery
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
