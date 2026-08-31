-- Forum tags
CREATE TABLE public.forum_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#8b5cf6',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_tags_read" ON public.forum_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_tags_admin" ON public.forum_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default tags
INSERT INTO public.forum_tags (name, slug, color) VALUES
  ('Discussão', 'discussao', '#6366f1'),
  ('Dúvida', 'duvida', '#f59e0b'),
  ('Tutorial', 'tutorial', '#10b981'),
  ('Serviço', 'servico', '#ec4899'),
  ('Recurso', 'recurso', '#06b6d4'),
  ('Feedback', 'feedback', '#8b5cf6');

-- Forum posts
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 10000),
  image_url text,
  is_service boolean NOT NULL DEFAULT false,
  service_price text,
  pinned boolean NOT NULL DEFAULT false,
  views int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forum_posts_created_idx ON public.forum_posts(created_at DESC);
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_posts_read" ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_insert" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_posts_update_own" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_posts_delete_own" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_posts_admin" ON public.forum_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Forum post <-> tag relationship
CREATE TABLE public.forum_post_tags (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
ALTER TABLE public.forum_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_post_tags_read" ON public.forum_post_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_post_tags_insert" ON public.forum_post_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_post_tags_delete" ON public.forum_post_tags FOR DELETE TO authenticated USING (true);

-- Forum replies
CREATE TABLE public.forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX forum_replies_post_idx ON public.forum_replies(post_id, created_at);
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_replies_read" ON public.forum_replies FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_replies_insert" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_replies_delete_own" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "forum_replies_admin" ON public.forum_replies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Forum likes
CREATE TABLE public.forum_likes (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
ALTER TABLE public.forum_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_likes_read" ON public.forum_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_likes_insert" ON public.forum_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "forum_likes_delete" ON public.forum_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;

-- Updated_at trigger
CREATE TRIGGER forum_posts_set_updated_at BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
