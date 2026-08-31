-- Lesson Videos: storage bucket + extra player fields

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-videos', 'lesson-videos', false)
ON CONFLICT (id) DO NOTHING;

-- Read: any authenticated user
DROP POLICY IF EXISTS "lesson videos read auth" ON storage.objects;
CREATE POLICY "lesson videos read auth" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'lesson-videos');

-- Write: admins only
DROP POLICY IF EXISTS "lesson videos write admin" ON storage.objects;
CREATE POLICY "lesson videos write admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "lesson videos update admin" ON storage.objects;
CREATE POLICY "lesson videos update admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "lesson videos delete admin" ON storage.objects;
CREATE POLICY "lesson videos delete admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'lesson-videos' AND public.has_role(auth.uid(),'admin'));

-- Player config columns
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS poster_url text,
  ADD COLUMN IF NOT EXISTS captions_url text,
  ADD COLUMN IF NOT EXISTS chapters jsonb,
  ADD COLUMN IF NOT EXISTS default_playback_rate numeric(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS autoplay_next boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_download boolean DEFAULT false;

-- Resume position per user/lesson
ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS resume_seconds integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
