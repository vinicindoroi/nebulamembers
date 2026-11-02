CREATE OR REPLACE FUNCTION public.enforce_mentor_group_week()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid; tz text;
BEGIN
  IF NEW.status <> 'booked' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id AND OLD.status = 'booked' THEN RETURN NEW; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  SELECT group_id INTO gid FROM public.member_group_members WHERE member_id = NEW.user_id;
  IF gid IS NULL THEN RETURN NEW; END IF;
  SELECT coalesce(timezone, 'America/Sao_Paulo') INTO tz FROM public.mentor_schedule_settings WHERE id = 1;
  tz := coalesce(tz, 'America/Sao_Paulo');
  IF EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    JOIN public.member_group_members gm ON gm.member_id = b.user_id
    WHERE gm.group_id = gid AND b.id IS DISTINCT FROM NEW.id AND b.status IN ('booked', 'done')
      AND date_trunc('week', b.starts_at AT TIME ZONE tz) = date_trunc('week', NEW.starts_at AT TIME ZONE tz)
  ) THEN
    RAISE EXCEPTION 'Seu grupo já tem uma call nesta semana. O limite é uma call por semana para todo o grupo.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_mentor_group_week() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentor_group_weekly_limit BEFORE INSERT OR UPDATE OF starts_at, user_id, status ON public.mentor_bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_mentor_group_week();

CREATE OR REPLACE FUNCTION public.mentor_group_booked_weeks()
RETURNS TABLE(week_start date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT date_trunc('week', b.starts_at AT TIME ZONE coalesce(s.timezone, 'America/Sao_Paulo'))::date
  FROM public.member_group_members me
  JOIN public.member_group_members peer ON peer.group_id = me.group_id
  JOIN public.mentor_bookings b ON b.user_id = peer.member_id
  CROSS JOIN public.mentor_schedule_settings s
  WHERE me.member_id = auth.uid() AND s.id = 1
    AND public.can_access_mentor_schedule(auth.uid())
    AND b.status IN ('booked', 'done');
$$;
REVOKE ALL ON FUNCTION public.mentor_group_booked_weeks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_group_booked_weeks() TO authenticated;