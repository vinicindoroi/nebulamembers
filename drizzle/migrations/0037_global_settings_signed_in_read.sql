DROP POLICY IF EXISTS "Allow public read global_settings" ON public.global_settings;
CREATE POLICY "Signed-in users read global_settings" ON public.global_settings
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);
REVOKE ALL ON public.global_settings FROM anon;
GRANT SELECT ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;