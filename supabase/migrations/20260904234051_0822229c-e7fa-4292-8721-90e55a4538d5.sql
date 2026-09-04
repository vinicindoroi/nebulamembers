-- Reset lesson table privileges (column-level grants broke "select *" reads)
REVOKE ALL ON public.lessons FROM anon;
REVOKE ALL ON public.lessons FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;

-- Direct table reads only for admins or lessons the user can access (protects video/content columns)
DROP POLICY IF EXISTS "lessons read auth" ON public.lessons;
DROP POLICY IF EXISTS "lessons read accessible" ON public.lessons;
CREATE POLICY "lessons read accessible" ON public.lessons
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.can_access_lesson(id));

-- Safe public listing of lessons (no video/content columns) so locked lessons still show up
DROP VIEW IF EXISTS public.lessons_public;
CREATE VIEW public.lessons_public WITH (security_invoker = off) AS
  SELECT id, course_id, module_id, title, description, position, duration_min, duration,
         is_free, is_premium, access_level, chapters, default_playback_rate, autoplay_next,
         allow_download, created_at
  FROM public.lessons;
REVOKE ALL ON public.lessons_public FROM anon;
GRANT SELECT ON public.lessons_public TO authenticated;
GRANT SELECT ON public.lessons_public TO service_role;

-- Keep the protected content view readable
GRANT SELECT ON public.lesson_content TO authenticated;