-- Player settings (singleton row)
CREATE TABLE public.player_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Branding
  accent_color text NOT NULL DEFAULT '#8b5cf6',
  controls_bg text NOT NULL DEFAULT 'rgba(0,0,0,0.85)',
  progress_color text NOT NULL DEFAULT '#8b5cf6',
  logo_url text,
  watermark_enabled boolean NOT NULL DEFAULT false,
  watermark_text text,
  watermark_position text NOT NULL DEFAULT 'top-right',
  watermark_opacity numeric(3,2) NOT NULL DEFAULT 0.5,
  -- Protection
  block_right_click boolean NOT NULL DEFAULT true,
  block_download boolean NOT NULL DEFAULT true,
  block_devtools boolean NOT NULL DEFAULT false,
  -- Educational features
  speed_control boolean NOT NULL DEFAULT true,
  bookmarks_enabled boolean NOT NULL DEFAULT true,
  notes_enabled boolean NOT NULL DEFAULT true,
  autoplay_next boolean NOT NULL DEFAULT true,
  resume_playback boolean NOT NULL DEFAULT true,
  -- Timestamps
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_settings read auth" ON public.player_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "player_settings admin write" ON public.player_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default row
INSERT INTO public.player_settings (id) VALUES ('00000000-0000-4000-8000-000000000001');

-- Trigger updated_at
CREATE TRIGGER player_settings_set_updated_at
  BEFORE UPDATE ON public.player_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Lesson video progress tracking
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

CREATE POLICY "video_progress read own" ON public.lesson_video_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "video_progress upsert own" ON public.lesson_video_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_progress update own" ON public.lesson_video_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Bookmarks
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

CREATE POLICY "bookmarks read own" ON public.lesson_bookmarks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "bookmarks insert own" ON public.lesson_bookmarks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bookmarks delete own" ON public.lesson_bookmarks
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
