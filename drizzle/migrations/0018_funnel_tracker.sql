CREATE TABLE public.tracker_funnels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.tracker_funnels(workspace_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_funnels TO authenticated;
GRANT ALL ON public.tracker_funnels TO service_role;
ALTER TABLE public.tracker_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracker funnels" ON public.tracker_funnels FOR ALL TO authenticated
  USING (workspace_id = auth.uid()) WITH CHECK (workspace_id = auth.uid());

CREATE TABLE public.tracker_funnel_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  funnel_id uuid NOT NULL REFERENCES public.tracker_funnels(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracker_funnel_steps TO authenticated;
GRANT ALL ON public.tracker_funnel_steps TO service_role;
ALTER TABLE public.tracker_funnel_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracker steps" ON public.tracker_funnel_steps FOR ALL TO authenticated
  USING (workspace_id = auth.uid()) WITH CHECK (workspace_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.tracker_funnels f WHERE f.id = funnel_id AND f.workspace_id = auth.uid()));

CREATE TABLE public.tracker_funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  funnel_id uuid NOT NULL REFERENCES public.tracker_funnels(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  step text NOT NULL,
  amount numeric,
  currency text,
  transaction_id text,
  click_id text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  referrer text, user_agent text, ip text,
  is_bot boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (funnel_id, session_id, step)
);
CREATE INDEX ON public.tracker_funnel_events(funnel_id, created_at);
GRANT SELECT, DELETE ON public.tracker_funnel_events TO authenticated;
GRANT ALL ON public.tracker_funnel_events TO service_role;
ALTER TABLE public.tracker_funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tracker events read" ON public.tracker_funnel_events FOR SELECT TO authenticated USING (workspace_id = auth.uid());
CREATE POLICY "own tracker events delete" ON public.tracker_funnel_events FOR DELETE TO authenticated USING (workspace_id = auth.uid());