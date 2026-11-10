CREATE TABLE public.mentor_booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.mentor_bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('cancelled','rescheduled')),
  old_starts_at timestamptz NOT NULL,
  new_starts_at timestamptz,
  reason text,
  by_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mentor_booking_events_created_idx ON public.mentor_booking_events (created_at DESC);

GRANT SELECT ON public.mentor_booking_events TO authenticated;
GRANT ALL ON public.mentor_booking_events TO service_role;
ALTER TABLE public.mentor_booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read booking history" ON public.mentor_booking_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.log_mentor_booking_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.mentor_booking_events(booking_id, user_id, kind, old_starts_at, reason, by_admin)
    VALUES (NEW.id, NEW.user_id, 'cancelled', OLD.starts_at, NEW.change_reason, auth.uid() IS DISTINCT FROM NEW.user_id);
  ELSIF NEW.starts_at IS DISTINCT FROM OLD.starts_at AND NEW.status = 'booked' THEN
    INSERT INTO public.mentor_booking_events(booking_id, user_id, kind, old_starts_at, new_starts_at, reason, by_admin)
    VALUES (NEW.id, NEW.user_id, 'rescheduled', OLD.starts_at, NEW.starts_at, NEW.change_reason, auth.uid() IS DISTINCT FROM NEW.user_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_mentor_booking_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER mentor_booking_events_log
AFTER UPDATE OF status, starts_at ON public.mentor_bookings
FOR EACH ROW EXECUTE FUNCTION public.log_mentor_booking_event();

-- Backfill past cancellations from the notices already sent
INSERT INTO public.mentor_booking_events(booking_id, user_id, kind, old_starts_at, reason, by_admin, created_at)
SELECT DISTINCT ON (b.user_id, b.starts_at) b.id, b.user_id, 'cancelled', b.starts_at, b.change_reason, true, n.created_at
FROM public.mentor_bookings b
JOIN public.notifications n ON n.title = 'Sua call foi cancelada' AND n.recipient_id = b.user_id
  AND n.content LIKE '%' || to_char(b.starts_at AT TIME ZONE coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI') || '%'
ORDER BY b.user_id, b.starts_at, (b.status = 'cancelled') DESC, n.created_at;

INSERT INTO public.mentor_booking_events(booking_id, user_id, kind, old_starts_at, reason, by_admin, created_at)
SELECT DISTINCT ON (b.id) b.id, b.user_id, 'cancelled', b.starts_at, b.change_reason, false, n.created_at
FROM public.mentor_bookings b
JOIN public.profiles p ON p.id = b.user_id
JOIN public.notifications n ON n.title = 'Call cancelada'
  AND n.content LIKE coalesce(nullif(p.full_name,''), p.email, 'Aluno') || ' — call de ' || to_char(b.starts_at AT TIME ZONE coalesce((SELECT timezone FROM public.mentor_schedule_settings WHERE id = 1), 'America/Sao_Paulo'), 'DD/MM "às" HH24:MI') || '%'
WHERE b.status = 'cancelled'
  AND NOT EXISTS (SELECT 1 FROM public.mentor_booking_events e WHERE e.booking_id = b.id)
ORDER BY b.id, n.created_at;