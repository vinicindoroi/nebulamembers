CREATE OR REPLACE FUNCTION public.admin_add_call(_user_id uuid, _starts_at timestamptz, _status text DEFAULT 'done', _notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  s public.mentor_schedule_settings;
  ends timestamptz;
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  IF _status NOT IN ('done','booked') THEN RAISE EXCEPTION 'Status inválido.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id) THEN RAISE EXCEPTION 'Aluno não encontrado.'; END IF;
  SELECT * INTO s FROM public.mentor_schedule_settings WHERE id = 1;
  ends := _starts_at + make_interval(mins => coalesce(s.slot_minutes, 60));
  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  IF _status = 'booked' THEN
    IF ends <= now() THEN RAISE EXCEPTION 'Esse horário já passou. Registre como realizada.'; END IF;
    IF EXISTS (SELECT 1 FROM public.mentor_bookings b WHERE b.user_id = _user_id AND b.status = 'booked' AND b.ends_at > now()) THEN
      RAISE EXCEPTION 'Esse aluno já tem uma call marcada.';
    END IF;
    IF EXISTS (SELECT 1 FROM public.mentor_bookings b WHERE b.status = 'booked' AND b.starts_at < ends AND b.ends_at > _starts_at) THEN
      RAISE EXCEPTION 'Já existe uma call nesse horário.';
    END IF;
  END IF;
  INSERT INTO public.mentor_bookings (user_id, starts_at, ends_at, status, notes)
  VALUES (_user_id, _starts_at, ends, _status, nullif(left(trim(coalesce(_notes,'')),1000),''))
  RETURNING id INTO new_id;
  UPDATE public.mentor_bookings SET makeup_pending = false WHERE user_id = _user_id AND makeup_pending;
  IF _status = 'booked' THEN
    INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
    VALUES ('Call marcada pelo mentor',
      'Sua call foi marcada para ' || to_char(_starts_at AT TIME ZONE coalesce(s.timezone,'America/Sao_Paulo'), 'DD/MM "às" HH24:MI') || '.',
      'user', now(), _user_id);
  END IF;
  RETURN new_id;
END $function$;

REVOKE ALL ON FUNCTION public.admin_add_call(uuid, timestamptz, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_call(uuid, timestamptz, text, text) TO authenticated;