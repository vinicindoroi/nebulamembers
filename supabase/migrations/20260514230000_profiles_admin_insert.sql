-- Allow admins to insert profiles for manual member creation
CREATE POLICY "profiles admin insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow profiles.id to have a default UUID so admins can insert without specifying one
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Drop the FK to auth.users so we can create "manual" profiles not tied to a login
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
