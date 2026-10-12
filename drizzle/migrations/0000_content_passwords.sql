CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS password_protected boolean NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS password_protected boolean NOT NULL DEFAULT false;

CREATE TABLE public.content_passwords (
  target_type text NOT NULL CHECK (target_type IN ('module','lesson')),
  target_id uuid NOT NULL,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (target_type, target_id)
);
GRANT ALL ON public.content_passwords TO service_role;
ALTER TABLE public.content_passwords ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.content_unlocks (
  user_id uuid NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('module','lesson')),
  target_id uuid NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);
GRANT SELECT ON public.content_unlocks TO authenticated;
GRANT ALL ON public.content_unlocks TO service_role;
ALTER TABLE public.content_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own unlocks read" ON public.content_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_content_password(_type text, _id uuid, _password text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  IF _type NOT IN ('module','lesson') THEN RAISE EXCEPTION 'invalid type'; END IF;
  IF _password IS NULL OR length(trim(_password)) = 0 THEN
    DELETE FROM public.content_passwords WHERE target_type=_type AND target_id=_id;
    DELETE FROM public.content_unlocks WHERE target_type=_type AND target_id=_id;
    IF _type='module' THEN UPDATE public.modules SET password_protected=false WHERE id=_id;
    ELSE UPDATE public.lessons SET password_protected=false WHERE id=_id; END IF;
  ELSE
    INSERT INTO public.content_passwords(target_type,target_id,password_hash)
    VALUES (_type,_id,crypt(_password, gen_salt('bf')))
    ON CONFLICT (target_type,target_id) DO UPDATE SET password_hash=EXCLUDED.password_hash, updated_at=now();
    DELETE FROM public.content_unlocks WHERE target_type=_type AND target_id=_id;
    IF _type='module' THEN UPDATE public.modules SET password_protected=true WHERE id=_id;
    ELSE UPDATE public.lessons SET password_protected=true WHERE id=_id; END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.unlock_content(_type text, _id uuid, _password text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE h text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT password_hash INTO h FROM public.content_passwords WHERE target_type=_type AND target_id=_id;
  IF h IS NULL THEN RETURN true; END IF;
  IF crypt(coalesce(_password,''), h) = h THEN
    INSERT INTO public.content_unlocks(user_id,target_type,target_id) VALUES (auth.uid(),_type,_id) ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;
  RETURN false;
END $$;

REVOKE ALL ON FUNCTION public.set_content_password(text,uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlock_content(text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_content_password(text,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_content(text,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.content_unlocked(_lesson_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.lessons l LEFT JOIN public.modules m ON m.id = l.module_id
    WHERE l.id = _lesson_id AND (
      (coalesce(m.password_protected,false) AND NOT EXISTS (SELECT 1 FROM public.content_unlocks u WHERE u.user_id=auth.uid() AND u.target_type='module' AND u.target_id=m.id))
      OR (l.password_protected AND NOT EXISTS (SELECT 1 FROM public.content_unlocks u WHERE u.user_id=auth.uid() AND u.target_type='lesson' AND u.target_id=l.id))
    )
  )
$$;

CREATE OR REPLACE VIEW public.lesson_content WITH (security_invoker = false) AS
  SELECT id, course_id, module_id, video_url, video_path, content, poster_url, captions_url
  FROM public.lessons
  WHERE public.can_access_lesson(id) AND (public.has_role(auth.uid(),'admin') OR public.content_unlocked(id));

CREATE OR REPLACE VIEW public.lessons_public AS
 SELECT id, course_id, module_id, title, description, "position", duration_min, duration, is_free, is_premium,
    access_level, access_levels, chapters, default_playback_rate, autoplay_next, allow_download, poster_url, created_at, password_protected
   FROM public.lessons;