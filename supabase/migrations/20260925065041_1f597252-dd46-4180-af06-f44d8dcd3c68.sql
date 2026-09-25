DROP VIEW IF EXISTS public.lessons_public;
CREATE VIEW public.lessons_public WITH (security_invoker = off) AS
  SELECT id, course_id, module_id, title, description, position, duration_min, duration,
         is_free, is_premium, access_level, access_levels, chapters, default_playback_rate, autoplay_next,
         allow_download, poster_url, created_at
  FROM public.lessons;
REVOKE ALL ON public.lessons_public FROM anon;
GRANT SELECT ON public.lessons_public TO authenticated;
GRANT SELECT ON public.lessons_public TO service_role;