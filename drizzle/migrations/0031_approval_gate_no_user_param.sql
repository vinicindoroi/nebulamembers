-- The approval predicate must only ever speak for the caller: drop the optional
-- user_id argument so nobody can probe another account's approval status.
CREATE OR REPLACE FUNCTION public.is_member_approved()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND public.plan_slug(p.plan) NOT IN ('', 'pending', 'pendente')
    )
  );
$fn$;

GRANT EXECUTE ON FUNCTION public.is_member_approved() TO anon, authenticated, service_role;