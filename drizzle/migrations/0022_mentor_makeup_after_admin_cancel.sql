ALTER TABLE public.mentor_bookings ADD COLUMN IF NOT EXISTS makeup_pending boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.mentor_bookings.makeup_pending IS 'True when the mentor cancelled this call; the student may book a new call without the minimum notice until they book again.';

-- Backfill: chamadas canceladas pelo mentor hoje (09/11/2026)
UPDATE public.mentor_bookings b SET makeup_pending = true
WHERE b.status = 'cancelled'
  AND (b.starts_at AT TIME ZONE 'America/Sao_Paulo')::date = DATE '2026-11-09'
  AND NOT public.has_role(b.user_id, 'admin')
  AND NOT EXISTS (SELECT 1 FROM public.mentor_bookings o WHERE o.user_id = b.user_id AND o.status IN ('booked','done') AND o.created_at > b.created_at AND o.starts_at > b.starts_at);

CREATE OR REPLACE FUNCTION public.cancel_mentor_booking(_id uuid, _reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.mentor_bookings; by_admin boolean;
BEGIN
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _id;
  by_admin := public.has_role(auth.uid(), 'admin');
  IF b IS NULL OR (b.user_id <> auth.uid() AND NOT by_admin) THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;
  IF b.status <> 'booked' THEN RAISE EXCEPTION 'Esse agendamento não pode ser cancelado.'; END IF;
  IF b.starts_at < now() AND NOT by_admin THEN
    RAISE EXCEPTION 'Essa call já passou.';
  END IF;
  UPDATE public.mentor_bookings SET status = 'cancelled',
    change_reason = nullif(left(trim(coalesce(_reason,'')),500),''),
    makeup_pending = (by_admin AND b.user_id <> auth.uid())
  WHERE id = _id;
END $function$;

CREATE OR REPLACE FUNCTION public.book_mentor_call(_starts_at timestamp with time zone, _notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.mentor_schedule_settings;
  uid uuid := auth.uid();
  local_ts timestamp;
  ends timestamptz;
  ok boolean;
  extra boolean;
  makeup boolean;
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
  SELECT EXISTS (SELECT 1 FROM public.mentor_bookings m WHERE m.user_id = uid AND m.status = 'cancelled' AND m.makeup_pending) INTO makeup;
  IF _starts_at < now() THEN RAISE EXCEPTION 'Esse horário já passou.'; END IF;
  IF NOT extra THEN
    IF NOT makeup AND _starts_at < now() + make_interval(hours => s.min_notice_hours) THEN
      RAISE EXCEPTION 'Esse horário exige pelo menos % horas de antecedência.', s.min_notice_hours;
    END IF;
    IF _starts_at > now() + make_interval(days => s.max_days_ahead) THEN
      RAISE EXCEPTION 'Esse horário está fora do período disponível.';
    END IF;
    local_ts := _starts_at AT TIME ZONE s.timezone;
    IF local_ts::date = ANY (s.blocked_dates) THEN RAISE EXCEPTION 'Esse dia não está disponível.'; END IF;
    IF EXISTS (SELECT 1 FROM public.mentor_blocked_slots x WHERE x.starts_at = _starts_at) THEN
      RAISE EXCEPTION 'Esse horário não está disponível.';
    END IF;
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
  UPDATE public.mentor_bookings SET makeup_pending = false WHERE user_id = uid AND makeup_pending;
  RETURN new_id;
END;
$function$;