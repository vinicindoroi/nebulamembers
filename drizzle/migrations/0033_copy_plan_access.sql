CREATE OR REPLACE FUNCTION public.admin_copy_plan_access(_from text, _to text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE f text := lower(trim(coalesce(_from,''))); t text := lower(trim(coalesce(_to,'')));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF f = '' OR t = '' OR f = t THEN RAISE EXCEPTION 'Planos inválidos.'; END IF;
  UPDATE public.courses SET access_levels = array_append(access_levels, t)
    WHERE EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = f)
      AND NOT EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = t);
  UPDATE public.modules SET access_levels = array_append(access_levels, t)
    WHERE EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = f)
      AND NOT EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = t);
  UPDATE public.lessons SET access_levels = array_append(access_levels, t)
    WHERE EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = f)
      AND NOT EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = t);
  UPDATE public.member_offers SET access_levels = array_append(access_levels, t)
    WHERE EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = f)
      AND NOT EXISTS (SELECT 1 FROM unnest(access_levels) x WHERE lower(trim(x)) = t);
  UPDATE public.mentor_schedule_settings SET allowed_plans = array_append(allowed_plans, t)
    WHERE EXISTS (SELECT 1 FROM unnest(allowed_plans) x WHERE lower(trim(x)) = f)
      AND NOT EXISTS (SELECT 1 FROM unnest(allowed_plans) x WHERE lower(trim(x)) = t);
END $function$;

REVOKE ALL ON FUNCTION public.admin_copy_plan_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_copy_plan_access(text, text) TO authenticated, service_role;