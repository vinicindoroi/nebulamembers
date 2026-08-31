-- Create global_settings table for public brand configs
CREATE TABLE IF NOT EXISTS public.global_settings (
  id text PRIMARY KEY DEFAULT 'current',
  name text NOT NULL DEFAULT 'Membros',
  logo_url text NOT NULL DEFAULT '/nebula_logo.png',
  primary_color text NOT NULL DEFAULT '#8b5cf6',
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 'current')
);

-- Pre-populate default global settings
INSERT INTO public.global_settings (id, name, logo_url, primary_color)
VALUES ('current', 'Membros', '/nebula_logo.png', '#8b5cf6')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for global_settings
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to global_settings
CREATE POLICY "Allow public read global_settings" ON public.global_settings
  FOR SELECT TO public USING (true);

-- Allow admins/moderators to modify global_settings
CREATE POLICY "Allow admin all global_settings" ON public.global_settings
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Create private_settings table for sensitive integration keys
CREATE TABLE IF NOT EXISTS public.private_settings (
  id text PRIMARY KEY DEFAULT 'current',
  gateway text NOT NULL DEFAULT 'stripe',
  public_key text NOT NULL DEFAULT '',
  smtp_host text NOT NULL DEFAULT '',
  sender text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  webhook_url text NOT NULL DEFAULT '',
  min_password_len integer NOT NULL DEFAULT 8,
  require_2fa_admins boolean NOT NULL DEFAULT false,
  deploy_hook_url text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 'current')
);

-- Pre-populate default private settings
INSERT INTO public.private_settings (id)
VALUES ('current')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS for private_settings
ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;

-- Allow ONLY admins/moderators to perform any operation on private_settings
CREATE POLICY "Allow admin all private_settings" ON public.private_settings
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );

-- Create community_stories table
CREATE TABLE IF NOT EXISTS public.community_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text NOT NULL,
  gradient text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Ensure image_url column exists if table was already created
ALTER TABLE public.community_stories ADD COLUMN IF NOT EXISTS image_url text;

-- Enable RLS for community_stories
ALTER TABLE public.community_stories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read community stories
CREATE POLICY "Allow authenticated read stories" ON public.community_stories
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert stories with their own user_id
CREATE POLICY "Allow authenticated insert stories" ON public.community_stories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow owner or admins to delete stories
CREATE POLICY "Allow owners and admins to delete stories" ON public.community_stories
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );
