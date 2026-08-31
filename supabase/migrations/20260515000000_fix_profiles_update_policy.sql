-- Fix: the original "profiles update own" policy only has USING but no WITH CHECK.
-- Supabase requires WITH CHECK for UPDATE to validate the new row.
-- Drop and recreate with both clauses.
DROP POLICY IF EXISTS "profiles update own" ON public.profiles;
CREATE POLICY "profiles update own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
