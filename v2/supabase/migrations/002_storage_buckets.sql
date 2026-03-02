-- =============================================================================
-- 002_storage_buckets.sql
-- Podcast App V2 - Storage buckets for audio files and user avatars
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bucket: audio
-- Stores generated podcast audio files (public read access)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  TRUE,
  104857600,  -- 100 MB
  ARRAY['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/aac']
);

-- ---------------------------------------------------------------------------
-- Bucket: avatars
-- Stores user profile avatar images (public read access)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  TRUE,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- =============================================================================
-- STORAGE RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Audio bucket policies
-- ---------------------------------------------------------------------------

-- Anyone can read audio files (public bucket)
CREATE POLICY "audio_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audio');

-- Authenticated users can upload audio to their own folder (user_id/*)
CREATE POLICY "audio_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can update their own audio files
CREATE POLICY "audio_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can delete their own audio files
CREATE POLICY "audio_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- ---------------------------------------------------------------------------
-- Avatars bucket policies
-- ---------------------------------------------------------------------------

-- Anyone can read avatar images (public bucket)
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload avatars to their own folder (user_id/*)
CREATE POLICY "avatars_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can update their own avatar files
CREATE POLICY "avatars_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- Users can delete their own avatar files
CREATE POLICY "avatars_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
