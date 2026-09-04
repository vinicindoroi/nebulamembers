REVOKE SELECT (video_url, video_path, content, poster_url, captions_url) ON public.lessons FROM authenticated;

CREATE OR REPLACE VIEW public.lesson_content
WITH (security_invoker = on) AS
SELECT id, course_id, module_id, video_url, video_path, content, poster_url, captions_url
FROM public.lessons
WHERE public.can_access_lesson(id);
GRANT SELECT ON public.lesson_content TO authenticated;