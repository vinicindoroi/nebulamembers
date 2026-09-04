REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
REVOKE EXECUTE ON FUNCTION public.assign_default_role() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_default_role() TO service_role;