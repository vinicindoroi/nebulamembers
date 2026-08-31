CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  checkout_url text NOT NULL DEFAULT '',
  badge_text text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers read auth" ON public.offers FOR SELECT TO authenticated USING (true);
CREATE POLICY "offers admin write" ON public.offers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS gradient_from text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS gradient_to text DEFAULT '#8b5cf6',
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;