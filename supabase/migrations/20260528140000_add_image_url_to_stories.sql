-- Add image_url column to community_stories
ALTER TABLE public.community_stories 
ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;
