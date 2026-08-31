DROP VIEW IF EXISTS public.public_profiles;

DROP POLICY IF EXISTS "profiles read own or staff" ON public.profiles;
CREATE POLICY "profiles read auth" ON public.profiles
FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, full_name, avatar_url, bio, instagram, plan, xp, last_seen_at, status, created_at, updated_at)
ON public.profiles TO authenticated;
REVOKE ALL ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.* FROM public.profiles p
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')
  ORDER BY p.created_at DESC
$$;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;