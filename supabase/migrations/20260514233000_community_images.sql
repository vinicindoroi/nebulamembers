-- Add image support to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for community images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community',
  'community',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload, anyone can read
CREATE POLICY "community_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'community');

CREATE POLICY "community_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'community');

CREATE POLICY "community_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'community' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Enable realtime for community tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
