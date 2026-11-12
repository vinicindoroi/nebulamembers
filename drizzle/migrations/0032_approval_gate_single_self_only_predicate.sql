-- Keep exactly one approval predicate, and make it speak only for the caller.
-- The legacy _user_id argument is deliberately ignored: every check runs against
-- auth.uid(), so nobody can probe another account's approval status.
DROP FUNCTION IF EXISTS public.is_member_approved();

CREATE OR REPLACE FUNCTION public.is_member_approved(_user_id uuid DEFAULT auth.uid())
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

GRANT EXECUTE ON FUNCTION public.is_member_approved(uuid) TO anon, authenticated, service_role;