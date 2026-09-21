CREATE OR REPLACE FUNCTION public.plan_slug(_plan text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT lower(p->>'slug')
      FROM public.app_settings s, jsonb_array_elements(s.value) p
      WHERE s.key = 'plans_config'
        AND jsonb_typeof(s.value) = 'array'
        AND (
          lower(COALESCE(p->>'slug','')) = lower(trim(COALESCE(_plan,'')))
          OR lower(COALESCE(p->>'name','')) = lower(trim(COALESCE(_plan,'')))
        )
      LIMIT 1
    ),
    lower(trim(COALESCE(_plan,'')))
  );
$$;

CREATE OR REPLACE FUNCTION public.plan_level(_plan text)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (p->>'level')::integer
      FROM public.app_settings s, jsonb_array_elements(s.value) p
      WHERE s.key = 'plans_config'
        AND jsonb_typeof(s.value) = 'array'
        AND (
          lower(COALESCE(p->>'slug','')) = lower(trim(COALESCE(_plan,'')))
          OR lower(COALESCE(p->>'name','')) = lower(trim(COALESCE(_plan,'')))
        )
      LIMIT 1
    ),
    CASE lower(trim(COALESCE(_plan,'')))
      WHEN '' THEN 0
      WHEN 'pending' THEN -1
      WHEN 'pendente' THEN -1
      WHEN 'free' THEN 0
      WHEN 'pro' THEN 1
      WHEN 'premium' THEN 2
      ELSE 3
    END
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT
      public.plan_slug(p.plan) AS user_plan,
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
                  ELSE EXISTS (SELECT 1 FROM unnest(a.m_levels) AS u(x) WHERE public.plan_slug(x) = a.user_plan)
                END
            AND CASE
                  WHEN a.l_levels IS NULL OR cardinality(a.l_levels) = 0
                    THEN a.user_level >= public.plan_level(coalesce(nullif(a.l_level, ''), 'free'))
                  ELSE EXISTS (SELECT 1 FROM unnest(a.l_levels) AS u(x) WHERE public.plan_slug(x) = a.user_plan)
                END
          )
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.plan_slug(text) TO authenticated;