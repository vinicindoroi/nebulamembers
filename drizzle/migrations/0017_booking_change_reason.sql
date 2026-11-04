ALTER TABLE public.mentor_bookings ADD COLUMN IF NOT EXISTS change_reason text;

DROP FUNCTION IF EXISTS public.cancel_mentor_booking(uuid);
CREATE FUNCTION public.cancel_mentor_booking(_id uuid, _reason text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
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
  UPDATE public.mentor_bookings SET status = 'cancelled',
    change_reason = nullif(left(trim(coalesce(_reason,'')),500),'') WHERE id = _id;
END $f$;
GRANT EXECUTE ON FUNCTION public.cancel_mentor_booking(uuid, text) TO authenticated;

DROP FUNCTION IF EXISTS public.admin_reschedule_booking(uuid, timestamptz);
CREATE FUNCTION public.admin_reschedule_booking(_id uuid, _starts_at timestamptz, _reason text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE
  b public.mentor_bookings;
  s public.mentor_schedule_settings;
  ends timestamptz;
  r text := nullif(left(trim(coalesce(_reason,'')),500),'');
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Sem permissão.'; END IF;
  SELECT * INTO b FROM public.mentor_bookings WHERE id = _id;
  IF b IS NULL OR b.status <> 'booked' THEN RAISE EXCEPTION 'Agendamento não encontrado.'; END IF;
  SELECT * INTO s FROM public.mentor_schedule_settings WHERE id = 1;
  ends := _starts_at + make_interval(mins => s.slot_minutes);
  PERFORM pg_advisory_xact_lock(hashtext('mentor_booking'));
  IF EXISTS (SELECT 1 FROM public.mentor_bookings x WHERE x.id <> _id AND x.status = 'booked' AND x.starts_at < ends AND x.ends_at > _starts_at) THEN
    RAISE EXCEPTION 'Já existe uma call nesse horário.';
  END IF;
  UPDATE public.mentor_bookings SET starts_at = _starts_at, ends_at = ends, change_reason = r WHERE id = _id;
  INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
  VALUES ('Sua call foi remarcada',
    'Nova data: ' || to_char(_starts_at AT TIME ZONE s.timezone, 'DD/MM "às" HH24:MI') || '.' || coalesce(' Motivo: ' || r, ''),
    'user', now(), b.user_id);
END $f$;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid, timestamptz, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_mentor_booking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE
  tz text := coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo');
  who text; whenx text; t text; c text;
  why text := coalesce(' Motivo: ' || NEW.change_reason, '');
BEGIN
  SELECT coalesce(nullif(full_name,''), email, 'Aluno') INTO who FROM public.profiles WHERE id = NEW.user_id;
  whenx := to_char(NEW.starts_at AT TIME ZONE tz, 'DD/MM "às" HH24:MI');
  IF TG_OP = 'INSERT' THEN
    t := 'Nova call agendada'; c := who || ' marcou uma call para ' || whenx || '.';
  ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    t := 'Call cancelada'; c := who || ' — call de ' || whenx || ' foi cancelada.' || why;
    IF auth.uid() IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
      VALUES ('Sua call foi cancelada', 'A call de ' || whenx || ' foi cancelada pelo mentor.' || why || ' Você pode agendar outro horário.', 'user', now(), NEW.user_id);
    END IF;
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
  SELECT t, c, 'admin', now(), r.user_id FROM public.user_roles r
  WHERE r.role = 'admin' AND r.user_id IS DISTINCT FROM auth.uid();
  RETURN NEW;
END $f$;