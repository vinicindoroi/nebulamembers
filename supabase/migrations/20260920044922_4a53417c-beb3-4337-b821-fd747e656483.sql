-- 1) Garante o campo "level" em cada plano do plans_config
UPDATE public.app_settings
SET value = (
  SELECT jsonb_agg(
    CASE
      WHEN p ? 'level' THEN p
      ELSE p || jsonb_build_object('level',
        CASE lower(COALESCE(p->>'slug',''))
          WHEN 'free' THEN 0
          WHEN 'pro' THEN 1
          WHEN 'premium' THEN 2
          WHEN 'nebula-members' THEN 2
          ELSE 3
        END)
    END
  )
  FROM jsonb_array_elements(value) p
),
updated_at = now()
WHERE key = 'plans_config' AND jsonb_typeof(value) = 'array';

-- 2) Função que resolve o nível numérico de um plano (slug) a partir do plans_config
CREATE OR REPLACE FUNCTION public.plan_level(_plan text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT (p->>'level')::integer
      FROM public.app_settings s,
           jsonb_array_elements(s.value) p
      WHERE s.key = 'plans_config'
        AND jsonb_typeof(s.value) = 'array'
        AND lower(COALESCE(p->>'slug','')) = lower(trim(COALESCE(_plan,'')))
      LIMIT 1
    ),
    CASE lower(trim(COALESCE(_plan,'')))
      WHEN '' THEN 0
      WHEN 'pending' THEN -1
      WHEN 'pendente' THEN -1
      WHEN 'free' THEN 0
      WHEN 'pro' THEN 1
      WHEN 'premium' THEN 2
      ELSE 3 -- plano personalizado legado sem config: mantém acesso alto
    END
  );
$$;

REVOKE ALL ON FUNCTION public.plan_level(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plan_level(text) FROM anon;
REVOKE ALL ON FUNCTION public.plan_level(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.plan_level(text) TO service_role;

-- 3) can_access_lesson agora compara níveis (maior herda os menores)
CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH access_context AS (
    SELECT
      public.plan_level(p.plan) AS user_level,
      greatest(
        public.plan_level(COALESCE(nullif(c.access_level,''),'free')),
        public.plan_level(COALESCE(nullif(m.access_level,''),'free')),
        public.plan_level(COALESCE(nullif(l.access_level,''),'free'))
      ) AS required_level,
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
      WHERE a.user_level >= 0
        AND (a.is_free OR a.user_level >= a.required_level)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_lesson(uuid) TO service_role;