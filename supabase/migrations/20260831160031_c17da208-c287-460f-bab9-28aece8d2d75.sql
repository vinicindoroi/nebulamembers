create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  location text,
  plan text default 'Free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read all auth" on public.profiles for select to authenticated using (true);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );
  return new;
end; $$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tag text,
  cover_url text,
  created_at timestamptz not null default now()
);
alter table public.courses enable row level security;
create policy "courses read auth" on public.courses for select to authenticated using (true);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0,
  duration_min int default 10,
  created_at timestamptz not null default now()
);
create index lessons_course_idx on public.lessons(course_id, position);
alter table public.lessons enable row level security;
create policy "lessons read auth" on public.lessons for select to authenticated using (true);

create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "progress read own" on public.lesson_progress for select to authenticated using (auth.uid() = user_id);
create policy "progress insert own" on public.lesson_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progress delete own" on public.lesson_progress for delete to authenticated using (auth.uid() = user_id);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts(created_at desc);
alter table public.posts enable row level security;
create policy "posts read auth" on public.posts for select to authenticated using (true);
create policy "posts insert own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts update own" on public.posts for update to authenticated using (auth.uid() = user_id);
create policy "posts delete own" on public.posts for delete to authenticated using (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);
alter table public.comments enable row level security;
create policy "comments read auth" on public.comments for select to authenticated using (true);
create policy "comments insert own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments delete own" on public.comments for delete to authenticated using (auth.uid() = user_id);

create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes read auth" on public.post_likes for select to authenticated using (true);
create policy "likes insert own" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "likes delete own" on public.post_likes for delete to authenticated using (auth.uid() = user_id);

CREATE TYPE public.app_role AS ENUM ('admin','moderator','member');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role)
$$;

CREATE POLICY "roles read self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS email text;

CREATE POLICY "profiles admin update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin delete" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#8b5cf6',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cat read auth" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  cover_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mod read auth" ON public.modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "mod admin write" ON public.modules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS price numeric(10,2) DEFAULT 0;
CREATE POLICY "courses admin write" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS captions_url text,
  ADD COLUMN IF NOT EXISTS chapters jsonb,
  ADD COLUMN IF NOT EXISTS default_playback_rate numeric(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS autoplay_next boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS duration int,
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false;
CREATE POLICY "lessons admin write" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS resume_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "comments admin all" ON public.comments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url text;
CREATE POLICY "posts admin all" ON public.posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "likes admin all" ON public.post_likes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tx self read" ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "tx admin all" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'percent',
  value numeric(10,2) NOT NULL,
  expires_at timestamptz,
  max_uses int,
  uses int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp read auth" ON public.coupons FOR SELECT TO authenticated USING (true);
CREATE POLICY "cp admin write" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  audience text NOT NULL DEFAULT 'all',
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read auth" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notif admin write" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reads own" ON public.notification_reads FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "reads insert own" ON public.notification_reads FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logs admin read" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "logs insert auth" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

DROP POLICY IF EXISTS "lesson videos read auth" ON storage.objects;
CREATE POLICY "lesson videos read auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'lesson-videos');
DROP POLICY IF EXISTS "lesson videos write admin" ON storage.objects;
CREATE POLICY "lesson videos write admin" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "lesson videos update admin" ON storage.objects;
CREATE POLICY "lesson videos update admin" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "lesson videos delete admin" ON storage.objects;
CREATE POLICY "lesson videos delete admin" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));

create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);
create index idx_lesson_attachments_lesson on public.lesson_attachments(lesson_id);
alter table public.lesson_attachments enable row level security;
create policy "Authenticated users can read attachments" on public.lesson_attachments
  for select to authenticated using (true);
create policy "Admins can manage attachments" on public.lesson_attachments
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Authenticated users can download attachments" on storage.objects
  for select to authenticated using (bucket_id = 'lesson-attachments');
create policy "Admins can upload attachments" on storage.objects
  for insert to authenticated with check (bucket_id = 'lesson-attachments' and public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete attachments" on storage.objects
  for delete to authenticated using (bucket_id = 'lesson-attachments' and public.has_role(auth.uid(), 'admin'));

CREATE POLICY "community_read" ON storage.objects FOR SELECT USING (bucket_id = 'community');
CREATE POLICY "community_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community');
CREATE POLICY "community_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'community'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR ((storage.foldername(name))[1] = 'stories' AND (storage.foldername(name))[2] = auth.uid()::text)
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );

CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE TABLE public.player_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accent_color text NOT NULL DEFAULT '#8b5cf6',
  controls_bg text NOT NULL DEFAULT 'rgba(0,0,0,0.85)',
  progress_color text NOT NULL DEFAULT '#8b5cf6',
  logo_url text,
  watermark_enabled boolean NOT NULL DEFAULT false,
  watermark_text text,
  watermark_position text NOT NULL DEFAULT 'top-right',
  watermark_opacity numeric(3,2) NOT NULL DEFAULT 0.5,
  block_right_click boolean NOT NULL DEFAULT true,
  block_download boolean NOT NULL DEFAULT true,
  block_devtools boolean NOT NULL DEFAULT false,
  speed_control boolean NOT NULL DEFAULT true,
  bookmarks_enabled boolean NOT NULL DEFAULT true,
  notes_enabled boolean NOT NULL DEFAULT true,
  autoplay_next boolean NOT NULL DEFAULT true,
  resume_playback boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_settings read auth" ON public.player_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "player_settings admin write" ON public.player_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.player_settings (id) VALUES ('00000000-0000-4000-8000-000000000001');
CREATE TRIGGER player_settings_set_updated_at BEFORE UPDATE ON public.player_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.lesson_video_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  "current_time" numeric(10,2) NOT NULL DEFAULT 0,
  duration numeric(10,2),
  playback_rate numeric(3,2) NOT NULL DEFAULT 1.0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
ALTER TABLE public.lesson_video_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "video_progress read own" ON public.lesson_video_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "video_progress upsert own" ON public.lesson_video_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_progress update own" ON public.lesson_video_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  time_seconds numeric(10,2) NOT NULL,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_bookmarks_user_lesson ON public.lesson_bookmarks(user_id, lesson_id);
ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks read own" ON public.lesson_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bookmarks insert own" ON public.lesson_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks delete own" ON public.lesson_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

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
INSERT INTO public.forum_tags (name, slug, color) VALUES
  ('Discussão', 'discussao', '#6366f1'),
  ('Dúvida', 'duvida', '#f59e0b'),
  ('Tutorial', 'tutorial', '#10b981'),
  ('Serviço', 'servico', '#ec4899'),
  ('Recurso', 'recurso', '#06b6d4'),
  ('Feedback', 'feedback', '#8b5cf6');

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

CREATE TABLE public.forum_post_tags (
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
ALTER TABLE public.forum_post_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "forum_post_tags_read" ON public.forum_post_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_post_tags_insert" ON public.forum_post_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_post_tags_delete" ON public.forum_post_tags FOR DELETE TO authenticated USING (true);

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

CREATE TRIGGER forum_posts_set_updated_at BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.funnel_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.funnel_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own folders" ON public.funnel_folders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create folders" ON public.funnel_folders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folders" ON public.funnel_folders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own folders" ON public.funnel_folders FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.funnel_folders
  FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  funnel_type TEXT NOT NULL DEFAULT 'funnelytics',
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  viewport JSONB DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  tracking_token TEXT UNIQUE,
  folder_id UUID REFERENCES public.funnel_folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funnels_user_id ON public.funnels(user_id);
CREATE INDEX IF NOT EXISTS idx_funnels_organization_id ON public.funnels(organization_id);
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own funnels" ON public.funnels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own funnels" ON public.funnels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own funnels" ON public.funnels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own funnels" ON public.funnels FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  session_id TEXT,
  visitor_id TEXT,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT,
  ttclid TEXT,
  gclid TEXT,
  device_type TEXT,
  browser TEXT,
  country TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_funnel_id ON public.funnel_events(funnel_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_node ON public.funnel_events(funnel_id, node_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON public.funnel_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_session ON public.funnel_events(session_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON public.funnel_events(visitor_id);
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own funnel events" ON public.funnel_events FOR SELECT
  USING (funnel_id IN (SELECT id FROM public.funnels WHERE user_id = auth.uid()));
CREATE POLICY "Allow anonymous event inserts" ON public.funnel_events FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  color TEXT DEFAULT 'default',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_lesson_id ON public.user_notes(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_updated ON public.user_notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_tags ON public.user_notes USING GIN(tags);
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notes" ON public.user_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.user_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.user_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.user_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_user_notes_updated_at BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  mentorship text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert" ON public.form_submissions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update" ON public.form_submissions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow admin all" ON public.form_submissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE IF NOT EXISTS public.global_settings (
  id text PRIMARY KEY DEFAULT 'current',
  name text NOT NULL DEFAULT 'Membros',
  logo_url text NOT NULL DEFAULT '/nebula_logo.png',
  primary_color text NOT NULL DEFAULT '#8b5cf6',
  restrict_to_leads boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 'current')
);
INSERT INTO public.global_settings (id, name, logo_url, primary_color)
VALUES ('current', 'Membros', '/nebula_logo.png', '#8b5cf6') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read global_settings" ON public.global_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow admin all global_settings" ON public.global_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE IF NOT EXISTS public.private_settings (
  id text PRIMARY KEY DEFAULT 'current',
  gateway text NOT NULL DEFAULT 'stripe',
  public_key text NOT NULL DEFAULT '',
  smtp_host text NOT NULL DEFAULT '',
  sender text NOT NULL DEFAULT '',
  api_key text NOT NULL DEFAULT '',
  webhook_url text NOT NULL DEFAULT '',
  min_password_len integer NOT NULL DEFAULT 8,
  require_2fa_admins boolean NOT NULL DEFAULT false,
  deploy_hook_url text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT single_row CHECK (id = 'current')
);
INSERT INTO public.private_settings (id) VALUES ('current') ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin all private_settings" ON public.private_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE IF NOT EXISTS public.community_stories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_avatar text NOT NULL,
  gradient text NOT NULL,
  content text NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.community_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read stories" ON public.community_stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert stories" ON public.community_stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow owners and admins to delete stories" ON public.community_stories FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE OR REPLACE FUNCTION public.check_email_in_leads(check_email text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.form_submissions
    WHERE email = lower(trim(check_email))
  );
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.funnel_events;

DO $do$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', r.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO anon', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $do$;