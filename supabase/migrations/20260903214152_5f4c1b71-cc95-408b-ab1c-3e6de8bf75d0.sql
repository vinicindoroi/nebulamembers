ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'free';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'free';
UPDATE public.modules SET access_level = 'pro' WHERE is_premium = true AND access_level = 'free';
UPDATE public.lessons SET access_level = 'pro' WHERE is_premium = true AND access_level = 'free';