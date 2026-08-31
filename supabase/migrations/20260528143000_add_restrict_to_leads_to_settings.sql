-- Add restrict_to_leads column to global_settings table
ALTER TABLE public.global_settings 
  ADD COLUMN IF NOT EXISTS restrict_to_leads boolean NOT NULL DEFAULT false;

-- Create check_email_in_leads secure check function
-- It uses SECURITY DEFINER so that anonymous public users can check if their
-- own email is in the leads table, without exposing general read permissions to anyone else.
CREATE OR REPLACE FUNCTION public.check_email_in_leads(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.form_submissions
    WHERE email = lower(trim(check_email))
  );
END;
$$;
