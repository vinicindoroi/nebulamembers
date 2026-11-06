CREATE TABLE public.mentor_extra_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_at timestamptz NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.mentor_extra_slots TO authenticated;
GRANT ALL ON public.mentor_extra_slots TO service_role;
ALTER TABLE public.mentor_extra_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read extra slots" ON public.mentor_extra_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert extra slots" ON public.mentor_extra_slots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete extra slots" ON public.mentor_extra_slots FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.book_mentor_call(_starts_at timestamp with time zone, _notes text DEFAULT NULL::text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s public.mentor_schedule_settings;
  uid uuid := auth.uid();
  local_ts timestamp;
  ends timestamptz;
  ok boolean;
  extra boolean;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login para agendar.'; END IF;
  SELECT * INTO s FROM public.mentor_schedule_settings WHERE id = 1;
  IF s IS NULL OR NOT s.enabled THEN RAISE EXCEPTION 'Agendamentos estão fechados no momento.'; END IF;
  IF NOT public.can_access_mentor_schedule(uid) THEN
    RAISE EXCEPTION 'Seu plano não inclui agendamento de calls.';
  END IF;
  ends := _starts_at + make_interval(mins => s.slot_minutes);
  SELECT EXISTS (SELECT 1 FROM public.mentor_extra_slots e WHERE e.starts_at = _starts_at) INTO extra;
  IF extra THEN
    IF _starts_at < now() THEN RAISE EXCEPTION 'Esse horário já passou.'; END IF;
  ELSE
    IF _starts_at < now() + make_interval(hours => s.min_notice_hours) THEN
      RAISE EXCEPTION 'Esse horário exige pelo menos % horas de antecedência.', s.min_notice_hours;
    END IF;
    IF _starts_at > now() + make_interval(days => s.max_days_ahead) THEN
      RAISE EXCEPTION 'Esse horário está fora do período disponível.';
    END IF;
    local_ts := _starts_at AT TIME ZONE s.timezone;
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
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  IF EXISTS (SELECT 1 FROM public.mentor_bookings b WHERE b.user_id = uid AND b.status = 'booked' AND b.ends_at > now()) THEN
    RAISE EXCEPTION 'Você já tem uma call marcada. Cancele-a para marcar outra.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.mentor_bookings b WHERE b.status = 'booked' AND b.starts_at < ends AND b.ends_at > _starts_at) THEN
    RAISE EXCEPTION 'Esse horário acabou de ser reservado. Escolha outro.';
  END IF;
  INSERT INTO public.mentor_bookings (user_id, starts_at, ends_at, notes)
  VALUES (uid, _starts_at, ends, nullif(left(trim(coalesce(_notes, '')), 1000), ''))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;