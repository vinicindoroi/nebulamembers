CREATE TABLE public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Parcela',
  amount numeric(12,2),
  due_date date NOT NULL,
  note text,
  paid_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_reminders_user_due_idx ON public.payment_reminders (user_id, due_date);
CREATE INDEX payment_reminders_open_due_idx ON public.payment_reminders (due_date) WHERE paid_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_reminders TO authenticated;
GRANT ALL ON public.payment_reminders TO service_role;

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payment reminders" ON public.payment_reminders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Members read own payment reminders" ON public.payment_reminders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND public.is_member_approved());