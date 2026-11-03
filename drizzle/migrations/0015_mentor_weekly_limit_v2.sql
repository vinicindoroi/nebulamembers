CREATE OR REPLACE FUNCTION public.enforce_mentor_week()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE gid uuid; tz text;
BEGIN
  IF NEW.status <> 'booked' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.starts_at IS NOT DISTINCT FROM OLD.starts_at AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id AND OLD.status = 'booked' THEN RETURN NEW; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  SELECT group_id INTO gid FROM public.member_group_members WHERE member_id = NEW.user_id LIMIT 1;
  SELECT timezone INTO tz FROM public.mentor_schedule_settings WHERE id = 1;
  tz := coalesce(tz, 'America/Sao_Paulo');
  IF EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    WHERE b.id IS DISTINCT FROM NEW.id AND b.status IN ('booked','done')
      AND date_trunc('week', b.starts_at AT TIME ZONE tz) = date_trunc('week', NEW.starts_at AT TIME ZONE tz)
      AND (b.user_id = NEW.user_id OR (gid IS NOT NULL AND b.user_id IN (SELECT member_id FROM public.member_group_members WHERE group_id = gid)))
  ) THEN
    RAISE EXCEPTION 'Já existe uma call nesta semana. Escolha um dia da próxima semana.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_mentor_week() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER mentor_weekly_limit BEFORE INSERT OR UPDATE OF starts_at, user_id, status ON public.mentor_bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_mentor_week();

CREATE OR REPLACE FUNCTION public.mentor_my_booked_weeks()
RETURNS TABLE(week_start date) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT date_trunc('week', b.starts_at AT TIME ZONE coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo'))::date
  FROM public.mentor_bookings b
  WHERE b.status IN ('booked','done')
    AND (b.user_id = auth.uid() OR b.user_id IN (
      SELECT peer.member_id FROM public.member_group_members me
      JOIN public.member_group_members peer ON peer.group_id = me.group_id
      WHERE me.member_id = auth.uid()));
$$;
REVOKE ALL ON FUNCTION public.mentor_my_booked_weeks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_my_booked_weeks() TO authenticated;