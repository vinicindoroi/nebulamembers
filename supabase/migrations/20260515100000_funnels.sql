-- ============================================================
-- Migration: Create funnels and funnel_events tables
-- ============================================================

-- Helper function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Table: funnels
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  funnel_type TEXT NOT NULL DEFAULT 'funnelytics',
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  tracking_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON public.funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnels_organization_id ON public.funnels(organization_id);

-- Enable RLS
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own funnels"
ON public.funnels FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnels"
ON public.funnels FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnels"
ON public.funnels FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnels"
ON public.funnels FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_funnels_updated_at
BEFORE UPDATE ON public.funnels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnels;

-- ============================================================
-- Table: funnel_events (for tracking/analytics)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  visitor_id TEXT,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  ttclid TEXT,
  gclid TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_id ON public.funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_node ON public.funnel_events(funnel_id, node_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON public.funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON public.funnel_events(visitor_id);

-- Enable RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- Users can view events from their funnels
CREATE POLICY "Users can view their funnel events"
ON public.funnel_events FOR SELECT TO authenticated
USING (
  funnel_id IN (SELECT id FROM public.funnels WHERE user_id = auth.uid())
);

-- Allow inserts from tracking script (anonymous or authenticated)
CREATE POLICY "Allow event inserts"
ON public.funnel_events FOR INSERT
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_events;

-- Function to generate tracking token
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;
