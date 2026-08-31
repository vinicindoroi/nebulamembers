-- Migration: Create funnel_events table and tracking infrastructure
-- Run this in your Supabase SQL Editor if the table doesn't exist yet

-- Add tracking_token to funnels table
ALTER TABLE public.funnels ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

-- Create funnel_events table for tracking real-time events
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_id ON public.funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_node ON public.funnel_events(funnel_id, node_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON public.funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON public.funnel_events(visitor_id);

-- Enable RLS
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view org funnel events" ON public.funnel_events;
DROP POLICY IF EXISTS "Allow anonymous event inserts" ON public.funnel_events;
DROP POLICY IF EXISTS "Users can view own funnel events" ON public.funnel_events;

-- Users can view events from their own funnels
CREATE POLICY "Users can view own funnel events"
ON public.funnel_events
FOR SELECT
USING (
  funnel_id IN (
    SELECT id FROM public.funnels WHERE user_id = auth.uid()
  )
);

-- Allow anonymous inserts (from tracking script via edge function with service role)
CREATE POLICY "Allow anonymous event inserts"
ON public.funnel_events
FOR INSERT
WITH CHECK (true);

-- Enable realtime for live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'funnel_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_events;
  END IF;
END $$;
