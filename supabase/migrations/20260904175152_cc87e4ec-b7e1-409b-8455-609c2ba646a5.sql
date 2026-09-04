-- Aulas: linha visível, mas colunas sensíveis só para quem tem acesso
REVOKE SELECT ON public.lessons FROM authenticated;
GRANT SELECT (id, course_id, module_id, title, description, position, duration, duration_min, is_free, is_premium, access_level, offer_id, created_at, chapters, allow_download, autoplay_next, default_playback_rate) ON public.lessons TO authenticated;

CREATE OR REPLACE FUNCTION public.can_read_lesson_content(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_access_lesson(_lesson_id)
$$;
REVOKE EXECUTE ON FUNCTION public.can_read_lesson_content(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_read_lesson_content(uuid) TO authenticated, service_role;

GRANT SELECT (video_url, video_path, content, poster_url, captions_url) ON public.lessons TO authenticated;

DROP POLICY IF EXISTS "lessons read auth" ON public.lessons;
CREATE POLICY "lessons read auth" ON public.lessons FOR SELECT TO authenticated USING (true);

-- Storage: remove o fallback que liberava arquivos sem aula vinculada
DROP POLICY IF EXISTS "lesson videos read by access" ON storage.objects;
CREATE POLICY "lesson videos read by access" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'lesson-videos'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.lessons l
        WHERE (l.video_path = storage.objects.name OR l.poster_url = storage.objects.name)
          AND public.can_access_lesson(l.id)
      )
    )
  );