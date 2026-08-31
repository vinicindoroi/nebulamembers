-- Track which notifications each user has read
CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reads own" ON public.notification_reads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "reads insert own" ON public.notification_reads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
