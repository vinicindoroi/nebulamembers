REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_default_role() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_tracking_token() FROM anon, authenticated;