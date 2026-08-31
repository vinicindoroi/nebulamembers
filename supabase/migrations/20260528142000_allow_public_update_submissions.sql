-- Allow anyone (anonymous/public) to update submissions (leads)
-- This is critical so that when a user edits their responses on the success screen,
-- the update query (which specifies the exact UUID) successfully runs on Supabase.
CREATE POLICY "Allow public update" ON public.form_submissions
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);
