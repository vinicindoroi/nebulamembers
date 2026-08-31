-- Trigger function to automatically confirm all new email signups
-- Sets email_confirmed_at and confirmed_at immediately on registration
CREATE OR REPLACE FUNCTION public.auto_confirm_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.email_confirmed_at := now();
  NEW.confirmed_at := now();
  RETURN NEW;
END;
$$;

-- Clean up any existing trigger first
DROP TRIGGER IF EXISTS tr_auto_confirm_users ON auth.users;

-- Create the trigger on the auth.users table
CREATE TRIGGER tr_auto_confirm_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_users();
