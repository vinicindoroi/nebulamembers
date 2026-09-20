-- 1) Colunas de seleção múltipla de planos
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS access_levels text[];
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS access_levels text[];

-- 2) View de listagem de aulas expõe access_levels (sem colunas de vídeo/conteúdo)
DROP VIEW IF EXISTS public.lessons_public;
CREATE VIEW public.lessons_public WITH (security_invoker = off) AS
  SELECT id, course_id, module_id, title, description, position, duration_min, duration,
         is_free, is_premium, access_level, access_levels, chapters, default_playback_rate, autoplay_next,
         allow_download, created_at
  FROM public.lessons;
REVOKE ALL ON public.lessons_public FROM anon;
GRANT SELECT ON public.lessons_public TO authenticated;
GRANT SELECT ON public.lessons_public TO service_role;

-- 3) can_access_lesson: lista de planos (quando definida) tem prioridade sobre a hierarquia
CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT
      lower(trim(coalesce(p.plan, ''))) AS user_plan,
      public.plan_level(p.plan) AS user_level,
      public.plan_level(coalesce(nullif(c.access_level, ''), 'free')) AS course_level,
      m.access_level AS m_level,
      m.access_levels AS m_levels,
      l.access_level AS l_level,
      l.access_levels AS l_levels,
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
      FROM ctx a
      WHERE a.user_level >= 0
        AND (
          a.is_free
          OR (
            a.user_level >= a.course_level
            AND CASE
                  WHEN a.m_levels IS NULL OR cardinality(a.m_levels) = 0
                    THEN a.user_level >= public.plan_level(coalesce(nullif(a.m_level, ''), 'free'))
                  ELSE EXISTS (SELECT 1 FROM unnest(a.m_levels) AS u(x) WHERE lower(x) = a.user_plan)
                END
            AND CASE
                  WHEN a.l_levels IS NULL OR cardinality(a.l_levels) = 0
                    THEN a.user_level >= public.plan_level(coalesce(nullif(a.l_level, ''), 'free'))
                  ELSE EXISTS (SELECT 1 FROM unnest(a.l_levels) AS u(x) WHERE lower(x) = a.user_plan)
                END
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO service_role;