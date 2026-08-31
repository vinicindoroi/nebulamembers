-- Add columns expected by the admin lesson form
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS duration int,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
