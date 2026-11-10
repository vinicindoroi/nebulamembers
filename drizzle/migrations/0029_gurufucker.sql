CREATE TABLE public.gurufucker_configs (
  user_id uuid PRIMARY KEY,
  api_token text NOT NULL DEFAULT '',
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  funnel jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gurufucker_configs TO authenticated;
GRANT ALL ON public.gurufucker_configs TO service_role;
ALTER TABLE public.gurufucker_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own gurufucker config" ON public.gurufucker_configs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.gurufucker_jobs (
  user_id uuid PRIMARY KEY,
  active boolean NOT NULL DEFAULT false,
  total integer NOT NULL DEFAULT 0,
  remaining integer NOT NULL DEFAULT 0,
  interval_sec integer NOT NULL DEFAULT 10,
  random_enabled boolean NOT NULL DEFAULT false,
  random_min_sec integer NOT NULL DEFAULT 5,
  random_max_sec integer NOT NULL DEFAULT 30,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_run_at timestamptz,
  last_status text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gurufucker_jobs_limits CHECK (total BETWEEN 0 AND 5000 AND remaining BETWEEN 0 AND 5000 AND interval_sec >= 1 AND random_min_sec >= 1 AND random_max_sec >= 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gurufucker_jobs TO authenticated;
GRANT ALL ON public.gurufucker_jobs TO service_role;
ALTER TABLE public.gurufucker_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own gurufucker job" ON public.gurufucker_jobs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX gurufucker_jobs_due_idx ON public.gurufucker_jobs (next_run_at) WHERE active = true;

CREATE TABLE public.gurufucker_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fired_at timestamptz NOT NULL DEFAULT now(),
  ok boolean NOT NULL,
  status_code integer,
  order_id text,
  buyer_id text,
  step_index integer NOT NULL DEFAULT 0,
  product_name text,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  source text NOT NULL DEFAULT 'manual',
  error text
);
GRANT SELECT, DELETE ON public.gurufucker_logs TO authenticated;
GRANT ALL ON public.gurufucker_logs TO service_role;
ALTER TABLE public.gurufucker_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own gurufucker logs" ON public.gurufucker_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Delete own gurufucker logs" ON public.gurufucker_logs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX gurufucker_logs_user_idx ON public.gurufucker_logs (user_id, fired_at DESC);