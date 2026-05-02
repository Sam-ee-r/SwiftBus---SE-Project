-- ──────────────────────────────────────────────────────────────────────────
-- Complaints & Suggestions Table
-- ──────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.complaints (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type         TEXT NOT NULL DEFAULT 'complaint'
               CHECK (type IN ('complaint', 'suggestion', 'feedback')),
  subject      TEXT NOT NULL,
  message      TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open'
               CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  resolved_at  TIMESTAMPTZ,
  admin_reply  TEXT
);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Users can manage their own complaints
CREATE POLICY "Users can view own complaints"
  ON public.complaints FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and update all complaints
CREATE POLICY "Admins can manage all complaints"
  ON public.complaints FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
