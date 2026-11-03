CREATE TABLE public.mentor_booking_links (
  booking_id uuid PRIMARY KEY REFERENCES public.mentor_bookings(id) ON DELETE CASCADE,
  url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_booking_links TO authenticated;
GRANT ALL ON public.mentor_booking_links TO service_role;
ALTER TABLE public.mentor_booking_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "links admin all" ON public.mentor_booking_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.my_call_link(_booking_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.url FROM public.mentor_booking_links l
  JOIN public.mentor_bookings b ON b.id = l.booking_id
  WHERE l.booking_id = _booking_id AND b.user_id = auth.uid() AND b.status = 'booked'
    AND now() >= b.starts_at - interval '10 minutes' AND now() <= b.ends_at
$$;
GRANT EXECUTE ON FUNCTION public.my_call_link(uuid) TO authenticated;