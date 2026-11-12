-- Database-level approval gate.
-- Accounts whose plan is empty / "pending" / "pendente" cannot read or write
-- platform content until an admin assigns a level. Mirrors src/lib/approval.ts.

-- 1. The predicate every gated policy uses.
--    SECURITY DEFINER so it can read profiles/user_roles/app_settings without RLS recursion.
CREATE OR REPLACE FUNCTION public.is_member_approved(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND public.plan_slug(p.plan) NOT IN ('', 'pending', 'pendente')
    )
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_member_approved(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_member_approved(uuid) TO anon, authenticated;

-- 2. Views run as their owner, so RLS on the base tables does not protect them.
--    Gate each view with the same predicate (uncorrelated scalar subquery = evaluated once).
CREATE OR REPLACE VIEW public.lesson_content AS
 SELECT id,
    course_id,
    module_id,
    video_url,
    video_path,
    content,
    poster_url,
    captions_url
   FROM lessons
  WHERE (SELECT public.is_member_approved())
    AND can_access_lesson(id)
    AND (has_role(auth.uid(), 'admin'::app_role) OR content_unlocked(id));

CREATE OR REPLACE VIEW public.lessons_public AS
 SELECT id,
    course_id,
    module_id,
    title,
    description,
    "position",
    duration_min,
    duration,
    is_free,
    is_premium,
    access_level,
    access_levels,
    chapters,
    default_playback_rate,
    autoplay_next,
    allow_download,
    poster_url,
    created_at,
    password_protected
   FROM lessons
  WHERE (SELECT public.is_member_approved());

CREATE OR REPLACE VIEW public.public_profiles AS
 SELECT id,
    full_name,
    avatar_url,
    bio,
    xp,
    instagram,
    last_seen_at,
    status
   FROM profiles
  WHERE (SELECT public.is_member_approved());

REVOKE ALL ON public.lesson_content FROM anon;
REVOKE ALL ON public.public_profiles FROM anon;

-- 3. Catalog tables: readable only by approved members (admins included).
DROP POLICY IF EXISTS "app_settings read auth" ON public.app_settings;
CREATE POLICY "app_settings read auth" ON public.app_settings
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "cat read auth" ON public.categories;
CREATE POLICY "cat read auth" ON public.categories
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "courses read auth" ON public.courses;
CREATE POLICY "courses read auth" ON public.courses
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "mod read auth" ON public.modules;
CREATE POLICY "mod read auth" ON public.modules
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

-- 4. Community / forum: read and write require approval.
DROP POLICY IF EXISTS "comments read auth" ON public.comments;
CREATE POLICY "comments read auth" ON public.comments
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "comments insert own" ON public.comments;
CREATE POLICY "comments insert own" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "Allow authenticated read stories" ON public.community_stories;
CREATE POLICY "Allow authenticated read stories" ON public.community_stories
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "Allow authenticated insert stories" ON public.community_stories;
CREATE POLICY "Allow authenticated insert stories" ON public.community_stories
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_posts_read" ON public.forum_posts;
CREATE POLICY "forum_posts_read" ON public.forum_posts
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_posts_insert" ON public.forum_posts;
CREATE POLICY "forum_posts_insert" ON public.forum_posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_replies_read" ON public.forum_replies;
CREATE POLICY "forum_replies_read" ON public.forum_replies
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_replies_insert" ON public.forum_replies;
CREATE POLICY "forum_replies_insert" ON public.forum_replies
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_likes_read" ON public.forum_likes;
CREATE POLICY "forum_likes_read" ON public.forum_likes
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_likes_insert" ON public.forum_likes;
CREATE POLICY "forum_likes_insert" ON public.forum_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_tags_read" ON public.forum_tags;
CREATE POLICY "forum_tags_read" ON public.forum_tags
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_post_tags_read" ON public.forum_post_tags;
CREATE POLICY "forum_post_tags_read" ON public.forum_post_tags
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "forum_post_tags_insert" ON public.forum_post_tags;
CREATE POLICY "forum_post_tags_insert" ON public.forum_post_tags
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "posts read auth" ON public.posts;
CREATE POLICY "posts read auth" ON public.posts
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "posts_insert own" ON public.posts;
CREATE POLICY "posts_insert own" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "likes read auth" ON public.post_likes;
CREATE POLICY "likes read auth" ON public.post_likes
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "likes insert own" ON public.post_likes;
CREATE POLICY "likes insert own" ON public.post_likes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

-- 5. Notifications are platform announcements: only after approval.
DROP POLICY IF EXISTS "notif read own" ON public.notifications;
CREATE POLICY "notif read own" ON public.notifications
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved())
    AND (recipient_id IS NULL OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin')));

-- 6. Lesson interactions: only after approval.
DROP POLICY IF EXISTS "progress insert own" ON public.lesson_progress;
CREATE POLICY "progress insert own" ON public.lesson_progress
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "bookmarks insert own" ON public.lesson_bookmarks;
CREATE POLICY "bookmarks insert own" ON public.lesson_bookmarks
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "video_progress upsert own" ON public.lesson_video_progress;
CREATE POLICY "video_progress upsert own" ON public.lesson_video_progress
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "questions ask own" ON public.lesson_questions;
CREATE POLICY "questions ask own" ON public.lesson_questions
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_member_approved()));

-- 7. Mentor slots: readable after approval, extra slots are admin-created only.
DROP POLICY IF EXISTS "Students can read blocked slots" ON public.mentor_blocked_slots;
CREATE POLICY "Students can read blocked slots" ON public.mentor_blocked_slots
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "auth read extra slots" ON public.mentor_extra_slots;
CREATE POLICY "auth read extra slots" ON public.mentor_extra_slots
  FOR SELECT TO authenticated
  USING ((SELECT public.is_member_approved()));

DROP POLICY IF EXISTS "admin insert extra slots" ON public.mentor_extra_slots;
CREATE POLICY "admin insert extra slots" ON public.mentor_extra_slots
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
