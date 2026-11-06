CREATE TABLE public.mentor_blocked_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at TIMESTAMPTZ NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mentor_blocked_slots TO authenticated;
GRANT ALL ON public.mentor_blocked_slots TO service_role;

ALTER TABLE public.mentor_blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read blocked slots"
  ON public.mentor_blocked_slots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage blocked slots"
  ON public.mentor_blocked_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));