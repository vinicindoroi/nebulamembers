CREATE TABLE public.monitored_sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  check_interval_seconds INT NOT NULL DEFAULT 300,
  notify_email BOOLEAN NOT NULL DEFAULT false,
  notify_push BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_ok BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitored_sites TO authenticated;
GRANT ALL ON public.monitored_sites TO service_role;
ALTER TABLE public.monitored_sites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sites" ON public.monitored_sites FOR ALL TO authenticated
  USING (workspace_id = auth.uid()) WITH CHECK (workspace_id = auth.uid());

CREATE TABLE public.uptime_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id UUID NOT NULL REFERENCES public.monitored_sites(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  status_code INT,
  response_ms INT,
  ok BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_uptime_checks_site_time ON public.uptime_checks (site_id, checked_at DESC);
CREATE INDEX idx_uptime_checks_ws_time ON public.uptime_checks (workspace_id, checked_at DESC);
GRANT SELECT ON public.uptime_checks TO authenticated;
GRANT ALL ON public.uptime_checks TO service_role;
ALTER TABLE public.uptime_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checks" ON public.uptime_checks FOR SELECT TO authenticated
  USING (workspace_id = auth.uid());