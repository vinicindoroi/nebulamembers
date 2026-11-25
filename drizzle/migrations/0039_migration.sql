CREATE OR REPLACE FUNCTION public.is_group_peer(_other uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _other = auth.uid() OR EXISTS (
    SELECT 1 FROM public.member_group_members me
    JOIN public.member_group_members peer ON peer.group_id = me.group_id
    WHERE me.member_id = auth.uid() AND peer.member_id = _other);
$$;
REVOKE ALL ON FUNCTION public.is_group_peer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_peer(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_group_bookings()
RETURNS TABLE(id uuid, starts_at timestamptz, ends_at timestamptz, booked_by text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id, b.starts_at, b.ends_at, coalesce(nullif(split_part(p.full_name,' ',1),''),'Colega')
  FROM public.mentor_bookings b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  WHERE public.is_member_approved() AND b.status = 'booked' AND b.ends_at > now()
    AND b.user_id <> auth.uid() AND public.is_group_peer(b.user_id)
  ORDER BY b.starts_at;
$$;
REVOKE ALL ON FUNCTION public.my_group_bookings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_group_bookings() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_call_link(_booking_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT l.url FROM public.mentor_booking_links l
  JOIN public.mentor_bookings b ON b.id = l.booking_id
  WHERE l.booking_id = _booking_id AND public.is_group_peer(b.user_id) AND b.status = 'booked'
    AND now() >= b.starts_at - interval '5 minutes' AND now() <= b.ends_at
$$;
GRANT EXECUTE ON FUNCTION public.my_call_link(uuid) TO authenticated;