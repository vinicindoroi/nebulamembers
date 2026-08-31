-- 1. profiles: restrict PII
DROP POLICY IF EXISTS "profiles read all auth" ON public.profiles;
CREATE POLICY "profiles read own or staff" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, avatar_url, bio, instagram, plan, xp, last_seen_at, status, created_at
FROM public.profiles;
REVOKE ALL ON public.public_profiles FROM PUBLIC, anon;
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT ALL ON public.public_profiles TO service_role;

-- 2. form_submissions: remove public update
DROP POLICY IF EXISTS "Allow public update" ON public.form_submissions;

-- 3. forum_post_tags: ownership
DROP POLICY IF EXISTS "forum_post_tags_insert" ON public.forum_post_tags;
DROP POLICY IF EXISTS "forum_post_tags_delete" ON public.forum_post_tags;
CREATE POLICY "forum_post_tags_insert" ON public.forum_post_tags
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.forum_posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))));
CREATE POLICY "forum_post_tags_delete" ON public.forum_post_tags
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.forum_posts p WHERE p.id = post_id AND (p.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))));

-- 4. app_settings: authenticated only
DROP POLICY IF EXISTS "app_settings read" ON public.app_settings;
CREATE POLICY "app_settings read auth" ON public.app_settings
FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.app_settings FROM anon;

-- 5. coupons: admin only
DROP POLICY IF EXISTS "cp read auth" ON public.coupons;
CREATE POLICY "cp read admin" ON public.coupons
FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- 6. storage community upload folder ownership
DROP POLICY IF EXISTS "community_upload" ON storage.objects;
CREATE POLICY "community_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);