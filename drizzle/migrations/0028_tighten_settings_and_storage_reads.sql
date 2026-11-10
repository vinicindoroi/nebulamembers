CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND public.plan_level(p.plan) >= 0)
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_member(uuid) TO authenticated, service_role;

-- offers: only active offers, only for members with an assigned plan
DROP POLICY IF EXISTS "offers read auth" ON public.offers;
CREATE POLICY "offers read active members" ON public.offers
  FOR SELECT TO authenticated
  USING (active AND public.is_active_member(auth.uid()));

-- mentor schedule settings: only people allowed to use scheduling (admins included)
DROP POLICY IF EXISTS "schedule settings readable" ON public.mentor_schedule_settings;
CREATE POLICY "schedule settings readable by schedule users" ON public.mentor_schedule_settings
  FOR SELECT TO authenticated
  USING (public.can_access_mentor_schedule(auth.uid()));

-- mentor availability: same audience
DROP POLICY IF EXISTS "availability readable" ON public.mentor_availability;
CREATE POLICY "availability readable by schedule users" ON public.mentor_availability
  FOR SELECT TO authenticated
  USING (public.can_access_mentor_schedule(auth.uid()));

-- player settings: only members with an assigned plan
DROP POLICY IF EXISTS "player_settings read auth" ON public.player_settings;
CREATE POLICY "player_settings read active members" ON public.player_settings
  FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid()));

-- lesson attachments: only for lessons the user can access and has unlocked
DROP POLICY IF EXISTS "Authenticated users can read attachments" ON public.lesson_attachments;
CREATE POLICY "attachments readable with lesson access" ON public.lesson_attachments
  FOR SELECT TO authenticated
  USING (public.can_access_lesson(lesson_id) AND public.content_unlocked(lesson_id));

-- storage: avatars
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_active_member(auth.uid()))
  );

-- storage: community
DROP POLICY IF EXISTS "community_read" ON storage.objects;
CREATE POLICY "community_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'community'
    AND (
      (storage.foldername(name))[1] = (auth.uid())::text
      OR ((storage.foldername(name))[1] = 'stories' AND (storage.foldername(name))[2] = (auth.uid())::text)
      OR public.is_active_member(auth.uid())
    )
  );

-- storage: course banners
DROP POLICY IF EXISTS "course banners member read" ON storage.objects;
CREATE POLICY "course banners member read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'course-banners' AND public.is_active_member(auth.uid()));