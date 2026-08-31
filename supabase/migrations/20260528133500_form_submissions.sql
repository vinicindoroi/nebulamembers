-- Create form_submissions table for capturing interactive form entries
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  mentorship text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous/public) to insert new submissions (leads)
CREATE POLICY "Allow public insert" ON public.form_submissions
  FOR INSERT TO public
  WITH CHECK (true);

-- Allow admins/moderators to perform all operations (select, update, delete)
CREATE POLICY "Allow admin all" ON public.form_submissions
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );
