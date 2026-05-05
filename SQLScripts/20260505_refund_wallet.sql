-- ============================================================
-- REFUND REQUESTS & WALLET SYSTEM
-- Passenger refund workflow + store credit wallet
-- ============================================================

-- 1. Add wallet_balance to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 2. refund_requests — one per cancelled booking
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_amount   NUMERIC(10,2) NOT NULL,
  refund_percentage INTEGER NOT NULL,
  refund_amount     NUMERIC(10,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);

-- 3. wallet_transactions — full ledger
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('refund','payment')),
  description TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_refund_requests_passenger ON public.refund_requests(passenger_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status    ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_user           ON public.wallet_transactions(user_id);

-- 5. RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Passengers: read own refund requests
CREATE POLICY "Passengers view own refunds"
  ON public.refund_requests FOR SELECT
  USING (auth.uid() = passenger_id);

CREATE POLICY "Passengers create refund requests"
  ON public.refund_requests FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- Admins: full access to refund requests
CREATE POLICY "Admins view all refunds"
  ON public.refund_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update refunds"
  ON public.refund_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Wallet transactions: passengers read own
CREATE POLICY "Passengers view own wallet"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Passengers insert wallet txn"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins: full access to wallet (for refund crediting)
CREATE POLICY "Admins view all wallet txns"
  ON public.wallet_transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert wallet txn"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update wallet_balance on profiles
-- (profiles already has RLS; this adds an update policy for admins)
CREATE POLICY "Admins update profiles wallet"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow passengers to read their own wallet_balance
-- (they can already read own profile via existing policy)

-- 6. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.refund_requests;
