CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access_context AS (
    SELECT
      lower(trim(COALESCE(p.plan, ''))) AS user_plan,
      lower(trim(COALESCE(c.access_level, 'free'))) AS course_level,
      lower(trim(COALESCE(m.access_level, 'free'))) AS module_level,
      lower(trim(COALESCE(l.access_level, 'free'))) AS lesson_level,
      l.is_free
    FROM public.lessons l
    JOIN public.courses c ON c.id = l.course_id
    LEFT JOIN public.modules m ON m.id = l.module_id
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE l.id = _lesson_id
  )
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM access_context a
      WHERE
        a.user_plan NOT IN ('', 'pending', 'pendente')
        AND (
          a.is_free
          OR (
            CASE
              WHEN a.course_level IN ('', 'free', 'free_preview') THEN true
              WHEN a.course_level = 'pro' THEN a.user_plan = 'pro' OR a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pending', 'pendente')
              WHEN a.course_level = 'premium' THEN a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pro', 'pending', 'pendente')
              ELSE a.user_plan = a.course_level
            END
          )
          AND (
            CASE
              WHEN a.module_level IN ('', 'free', 'free_preview') THEN true
              WHEN a.module_level = 'pro' THEN a.user_plan = 'pro' OR a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pending', 'pendente')
              WHEN a.module_level = 'premium' THEN a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pro', 'pending', 'pendente')
              ELSE a.user_plan = a.module_level
            END
          )
          AND (
            CASE
              WHEN a.lesson_level IN ('', 'free', 'free_preview') THEN true
              WHEN a.lesson_level = 'pro' THEN a.user_plan = 'pro' OR a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pending', 'pendente')
              WHEN a.lesson_level = 'premium' THEN a.user_plan = 'premium' OR a.user_plan NOT IN ('free', 'pro', 'pending', 'pendente')
              ELSE a.user_plan = a.lesson_level
            END
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_access_lesson(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO service_role;