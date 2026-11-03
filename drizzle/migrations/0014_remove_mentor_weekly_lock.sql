DROP TRIGGER IF EXISTS mentor_group_weekly_limit ON public.mentor_bookings;
DROP FUNCTION IF EXISTS public.enforce_mentor_group_week();
DROP FUNCTION IF EXISTS public.mentor_group_booked_weeks();