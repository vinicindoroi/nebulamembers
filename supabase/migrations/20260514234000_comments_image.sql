-- Add image support to comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS image_url text;
