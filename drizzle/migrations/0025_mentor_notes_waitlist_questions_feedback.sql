-- 1) Anotações por call (aluno vê tudo)
CREATE TABLE public.mentor_call_notes (
  booking_id uuid PRIMARY KEY REFERENCES public.mentor_bookings(id) ON DELETE CASCADE,
  summary text NOT NULL DEFAULT '',
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_call_notes TO authenticated;
GRANT ALL ON public.mentor_call_notes TO service_role;
ALTER TABLE public.mentor_call_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call notes admin all" ON public.mentor_call_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "call notes owner read" ON public.mentor_call_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.mentor_bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_call_notes()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE b public.mentor_bookings; tz text := coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo');
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO b FROM public.mentor_bookings WHERE id = NEW.booking_id;
    IF b.id IS NOT NULL THEN
      INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
      VALUES ('Anotações da sua call', 'O mentor deixou anotações e tarefas da call de ' || to_char(b.starts_at AT TIME ZONE tz, 'DD/MM') || '. Veja em Agendamento.', 'user', now(), b.user_id);
    END IF;
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER mentor_call_notes_notify BEFORE INSERT OR UPDATE ON public.mentor_call_notes
  FOR EACH ROW EXECUTE FUNCTION public.notify_call_notes();

-- 2) Lista de espera (avisa todos; quem marcar primeiro leva)
CREATE TABLE public.mentor_waitlist (
  user_id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.mentor_waitlist TO authenticated;
GRANT ALL ON public.mentor_waitlist TO service_role;
ALTER TABLE public.mentor_waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "waitlist read own or admin" ON public.mentor_waitlist FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "waitlist join self" ON public.mentor_waitlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_mentor_schedule(auth.uid()));
CREATE POLICY "waitlist leave own or admin" ON public.mentor_waitlist FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_mentor_waitlist(_starts timestamptz, _except uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE tz text := coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo');
BEGIN
  IF _starts IS NULL OR _starts <= now() THEN RETURN; END IF;
  INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
  SELECT 'Abriu um horário na agenda',
    'Horário livre: ' || to_char(_starts AT TIME ZONE tz, 'DD/MM "às" HH24:MI') || '. Quem marcar primeiro fica com ele.',
    'user', now(), w.user_id
  FROM public.mentor_waitlist w
  WHERE w.user_id IS DISTINCT FROM _except
    AND NOT EXISTS (SELECT 1 FROM public.mentor_bookings x WHERE x.user_id = w.user_id AND x.status = 'booked' AND x.ends_at > now());
END $f$;
REVOKE EXECUTE ON FUNCTION public.notify_mentor_waitlist(timestamptz, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mentor_waitlist_on_booking()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'booked' THEN DELETE FROM public.mentor_waitlist WHERE user_id = NEW.user_id; END IF;
  ELSIF OLD.status = 'booked' AND NEW.status = 'cancelled' THEN
    PERFORM public.notify_mentor_waitlist(OLD.starts_at, NEW.user_id);
  ELSIF OLD.status = 'booked' AND NEW.status = 'booked' AND NEW.starts_at <> OLD.starts_at THEN
    PERFORM public.notify_mentor_waitlist(OLD.starts_at, NEW.user_id);
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER mentor_bookings_waitlist AFTER INSERT OR UPDATE OF status, starts_at ON public.mentor_bookings
  FOR EACH ROW EXECUTE FUNCTION public.mentor_waitlist_on_booking();

CREATE OR REPLACE FUNCTION public.mentor_waitlist_on_extra_slot()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
BEGIN
  PERFORM public.notify_mentor_waitlist(NEW.starts_at, NULL);
  RETURN NEW;
END $f$;
CREATE TRIGGER mentor_extra_slots_waitlist AFTER INSERT ON public.mentor_extra_slots
  FOR EACH ROW EXECUTE FUNCTION public.mentor_waitlist_on_extra_slot();

-- 3) Dúvidas privadas nas aulas
CREATE TABLE public.lesson_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL CHECK (char_length(trim(content)) BETWEEN 1 AND 2000),
  answer text CHECK (answer IS NULL OR char_length(answer) <= 4000),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_questions_lesson_user ON public.lesson_questions(lesson_id, user_id);
CREATE INDEX lesson_questions_open ON public.lesson_questions(created_at) WHERE answer IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_questions TO authenticated;
GRANT ALL ON public.lesson_questions TO service_role;
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions read own or admin" ON public.lesson_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "questions ask own" ON public.lesson_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND answer IS NULL AND answered_at IS NULL AND public.can_access_lesson(lesson_id));
CREATE POLICY "questions answer admin" ON public.lesson_questions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "questions delete own open or admin" ON public.lesson_questions FOR DELETE TO authenticated
  USING ((user_id = auth.uid() AND answer IS NULL) OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_lesson_question()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE who text; lt text;
BEGIN
  SELECT title INTO lt FROM public.lessons WHERE id = NEW.lesson_id;
  IF TG_OP = 'INSERT' THEN
    SELECT coalesce(nullif(full_name,''), email, 'Aluno') INTO who FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
    SELECT 'Nova dúvida na aula', who || ' perguntou em "' || coalesce(lt,'aula') || '": ' || left(NEW.content, 140), 'admin', now(), r.user_id
    FROM public.user_roles r WHERE r.role = 'admin' AND r.user_id IS DISTINCT FROM NEW.user_id;
  ELSIF NEW.answer IS NOT NULL AND (OLD.answer IS NULL OR OLD.answer <> NEW.answer) THEN
    INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
    VALUES ('O mentor respondeu sua dúvida', 'Na aula "' || coalesce(lt,'aula') || '": ' || left(NEW.answer, 140), 'user', now(), NEW.user_id);
  END IF;
  RETURN NEW;
END $f$;
CREATE TRIGGER lesson_questions_notify AFTER INSERT OR UPDATE OF answer ON public.lesson_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_lesson_question();

-- 4) Pesquisa depois da call (com nome)
CREATE TABLE public.mentor_call_feedback (
  booking_id uuid PRIMARY KEY REFERENCES public.mentor_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text CHECK (comment IS NULL OR char_length(comment) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mentor_call_feedback TO authenticated;
GRANT ALL ON public.mentor_call_feedback TO service_role;
ALTER TABLE public.mentor_call_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback read own or admin" ON public.mentor_call_feedback FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "feedback insert own done call" ON public.mentor_call_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.mentor_bookings b WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.status = 'done'));

CREATE OR REPLACE FUNCTION public.notify_call_feedback()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $f$
DECLARE who text;
BEGIN
  SELECT coalesce(nullif(full_name,''), email, 'Aluno') INTO who FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(title, content, audience, sent_at, recipient_id)
  SELECT 'Nova avaliação de call', who || ' deu nota ' || NEW.rating || '/5' || coalesce(': ' || left(NEW.comment, 140), '.'), 'admin', now(), r.user_id
  FROM public.user_roles r WHERE r.role = 'admin';
  RETURN NEW;
END $f$;
CREATE TRIGGER mentor_call_feedback_notify AFTER INSERT ON public.mentor_call_feedback
  FOR EACH ROW EXECUTE FUNCTION public.notify_call_feedback();