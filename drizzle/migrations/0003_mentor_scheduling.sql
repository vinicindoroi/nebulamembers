CREATE TABLE public.mentor_schedule_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  slot_minutes integer NOT NULL DEFAULT 60 CHECK (slot_minutes BETWEEN 10 AND 240),
  min_notice_hours integer NOT NULL DEFAULT 12 CHECK (min_notice_hours >= 0),
  max_days_ahead integer NOT NULL DEFAULT 30 CHECK (max_days_ahead BETWEEN 1 AND 365),
  meeting_link text,
  instructions text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  blocked_dates date[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.mentor_schedule_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
GRANT SELECT, INSERT, UPDATE ON public.mentor_schedule_settings TO authenticated;
GRANT ALL ON public.mentor_schedule_settings TO service_role;
ALTER TABLE public.mentor_schedule_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule settings readable" ON public.mentor_schedule_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "schedule settings admin insert" ON public.mentor_schedule_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "schedule settings admin update" ON public.mentor_schedule_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mentor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_availability TO authenticated;
GRANT ALL ON public.mentor_availability TO service_role;
ALTER TABLE public.mentor_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "availability readable" ON public.mentor_availability FOR SELECT TO authenticated USING (true);
CREATE POLICY "availability admin write" ON public.mentor_availability FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mentor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked' CHECK (status IN ('booked','cancelled','done')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX mentor_bookings_slot_unique ON public.mentor_bookings (starts_at) WHERE status = 'booked';
CREATE INDEX mentor_bookings_user_idx ON public.mentor_bookings (user_id, starts_at);
GRANT SELECT, UPDATE, DELETE ON public.mentor_bookings TO authenticated;
GRANT ALL ON public.mentor_bookings TO service_role;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings own or admin read" ON public.mentor_bookings FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bookings admin update" ON public.mentor_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "bookings admin delete" ON public.mentor_bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.mentor_busy_slots(_from timestamptz, _to timestamptz)
RETURNS TABLE (starts_at timestamptz, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.starts_at, b.ends_at FROM public.mentor_bookings b
  WHERE auth.uid() IS NOT NULL AND b.status = 'booked' AND b.starts_at < _to AND b.ends_at > _from;
$$;
REVOKE ALL ON FUNCTION public.mentor_busy_slots(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mentor_busy_slots(timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.book_mentor_call(_starts_at timestamptz, _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.mentor_schedule_settings;
  uid uuid := auth.uid();
  local_ts timestamp;
  ends timestamptz;
  ok boolean;
  plan text;
  new_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Faça login para agendar.'; END IF;
  SELECT * INTO s FROM public.mentor_schedule_settings WHERE id = 1;
  IF s IS NULL OR NOT s.enabled THEN RAISE EXCEPTION 'Agendamentos estão fechados no momento.'; END IF;
  SELECT lower(trim(coalesce(p.plan, ''))) INTO plan FROM public.profiles p WHERE p.id = uid;
  IF coalesce(plan, '') IN ('', 'pending', 'pendente') AND NOT public.has_role(uid, 'admin') THEN
    RAISE EXCEPTION 'Seu acesso ainda não foi liberado.';
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
REVOKE ALL ON FUNCTION public.book_mentor_call(timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_mentor_call(timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_mentor_booking(_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b public.mentor_bookings;
BEGIN
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _id;
  IF b IS NULL OR (b.user_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;
  IF b.status <> 'booked' THEN RAISE EXCEPTION 'Esse agendamento não pode ser cancelado.'; END IF;
  IF b.starts_at < now() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Essa call já passou.';
  END IF;
  UPDATE public.mentor_bookings SET status = 'cancelled' WHERE id = _id;
END;
$$;
REVOKE ALL ON FUNCTION public.cancel_mentor_booking(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_mentor_booking(uuid) TO authenticated;