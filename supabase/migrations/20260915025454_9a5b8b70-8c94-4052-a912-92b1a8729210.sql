CREATE OR REPLACE FUNCTION public.can_access_lesson(_lesson_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE l.id = _lesson_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR l.is_free
        OR l.access_level = 'free'
        OR (
          l.access_level IN ('pro','premium')
          AND lower(COALESCE(p.plan, '')) NOT IN ('', 'pending', 'pendente', 'free')
          AND (l.access_level = 'pro' OR lower(COALESCE(p.plan,'')) <> 'pro')
        )
      )
  )
$function$;