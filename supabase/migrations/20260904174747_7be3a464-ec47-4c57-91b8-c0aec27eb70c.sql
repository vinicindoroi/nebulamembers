REVOKE EXECUTE ON FUNCTION public.admin_list_profiles() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;