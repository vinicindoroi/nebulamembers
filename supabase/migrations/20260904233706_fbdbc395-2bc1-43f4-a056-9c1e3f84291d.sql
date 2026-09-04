GRANT SELECT (id, course_id, module_id, title, position, duration_min, duration, description, created_at, chapters, default_playback_rate, autoplay_next, allow_download, is_free, is_premium, access_level, offer_id) ON public.lessons TO authenticated;

ALTER VIEW public.lesson_content SET (security_invoker = off);
GRANT SELECT ON public.lesson_content TO authenticated;