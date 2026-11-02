ALTER TABLE public.mentor_schedule_settings ADD COLUMN IF NOT EXISTS allowed_plans text[] NOT NULL DEFAULT '{individual}';
UPDATE public.mentor_schedule_settings SET allowed_plans = '{individual}' WHERE id = 1;

CREATE OR REPLACE FUNCTION public.can_access_mentor_schedule(_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin') OR EXISTS (
      SELECT 1 FROM public.profiles p, public.mentor_schedule_settings s
      WHERE p.id = _user_id AND s.id = 1
        AND public.plan_slug(p.plan) = ANY (s.allowed_plans)
    )
  );
$$;
REVOKE ALL ON FUNCTION public.can_access_mentor_schedule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_mentor_schedule(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.book_mentor_call(_starts_at timestamptz, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.mentor_schedule_settings;
  uid uuid := auth.uid();
  local_ts timestamp;
  ends timestamptz;
  ok boolean;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login para agendar.'; END IF;
  SELECT * INTO s FROM public.mentor_schedule_settings WHERE id = 1;
  IF s IS NULL OR NOT s.enabled THEN RAISE EXCEPTION 'Agendamentos estão fechados no momento.'; END IF;
  IF NOT public.can_access_mentor_schedule(uid) THEN
    RAISE EXCEPTION 'Seu plano não inclui agendamento de calls.';
  END IF;
  IF _starts_at < now() + make_interval(hours => s.min_notice_hours) THEN
    RAISE EXCEPTION 'Esse horário exige pelo menos % horas de antecedência.', s.min_notice_hours;
  END IF;
  IF _starts_at > now() + make_interval(days => s.max_days_ahead) THEN
    RAISE EXCEPTION 'Esse horário está fora do período disponível.';
  END IF;
  local_ts := _starts_at AT TIME ZONE s.timezone;
  ends := _starts_at + make_interval(mins => s.slot_minutes);
  IF local_ts::date = ANY (s.blocked_dates) THEN RAISE EXCEPTION 'Esse dia não está disponível.'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_availability a
    WHERE a.weekday = extract(dow FROM local_ts)::int
      AND local_ts::time >= a.start_time
      AND local_ts::time + make_interval(mins => s.slot_minutes) <= a.end_time
      AND local_ts::time + make_interval(mins => s.slot_minutes) > local_ts::time
      AND (extract(epoch FROM (local_ts::time - a.start_time))::int % (s.slot_minutes * 60)) = 0
  ) INTO ok;
  IF NOT ok THEN RAISE EXCEPTION 'Esse horário não está disponível.'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  IF EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    WHERE b.user_id = uid AND b.status IN ('booked','done')
      AND date_trunc('week', b.starts_at AT TIME ZONE s.timezone) = date_trunc('week', local_ts)
  ) THEN
    RAISE EXCEPTION 'Você já tem uma call marcada nesta semana. O limite é uma por semana.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.mentor_bookings b
    WHERE b.status = 'booked' AND b.starts_at < ends AND b.ends_at > _starts_at
  ) THEN
    RAISE EXCEPTION 'Esse horário acabou de ser reservado. Escolha outro.';
  END IF;
  INSERT INTO public.mentor_bookings (user_id, starts_at, ends_at, notes)
  VALUES (uid, _starts_at, ends, nullif(left(trim(coalesce(_notes, '')), 1000), ''))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;