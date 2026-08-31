REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_default_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_tracking_token() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_email_in_leads(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_in_leads(text) TO anon, authenticated;