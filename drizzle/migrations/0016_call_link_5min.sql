CREATE OR REPLACE FUNCTION public.my_call_link(_booking_id uuid)
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT l.url FROM public.mentor_booking_links l
  JOIN public.mentor_bookings b ON b.id = l.booking_id
  WHERE l.booking_id = _booking_id AND b.user_id = auth.uid() AND b.status = 'booked'
    AND now() >= b.starts_at - interval '5 minutes' AND now() <= b.ends_at
$function$;