-- Drop the old overly-restrictive storage policy for community delete
DROP POLICY IF EXISTS "community_delete_own" ON storage.objects;

-- Create a robust delete policy supporting:
-- 1. Standard post images (first folder is user_id)
-- 2. Story images (first folder is 'stories', second folder is user_id)
-- 3. Admins or moderators deleting any media in the bucket
CREATE POLICY "community_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'community' 
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR (
        (storage.foldername(name))[1] = 'stories' 
        AND (storage.foldername(name))[2] = auth.uid()::text
      )
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );
