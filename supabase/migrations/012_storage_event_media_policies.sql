-- Storage bucket + RLS for event_media (gallery + invitation covers)
-- Run after 007_gallery.sql

INSERT INTO storage.buckets (id, name, public)
VALUES ('event_media', 'event_media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ---------------------------------------------------------------------------
-- Public read (invitation covers + gallery on public pages)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read event_media objects" ON storage.objects;
CREATE POLICY "Public read event_media objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event_media');

-- ---------------------------------------------------------------------------
-- Gallery: anon/authenticated upload (existing guest flow)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can upload event_media" ON storage.objects;
CREATE POLICY "Anyone can upload event_media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event_media');

-- ---------------------------------------------------------------------------
-- Event owners: update/delete files under their event folder
-- Path pattern: {event_id}/...
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Event owners update event_media" ON storage.objects;
CREATE POLICY "Event owners update event_media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event_media'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.events e WHERE e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'event_media'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.events e WHERE e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Event owners delete event_media" ON storage.objects;
CREATE POLICY "Event owners delete event_media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event_media'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.events e WHERE e.user_id = auth.uid()
    )
  );

-- Authenticated owners may also insert into their event folder (invitation covers)
DROP POLICY IF EXISTS "Event owners insert event_media" ON storage.objects;
CREATE POLICY "Event owners insert event_media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event_media'
    AND (storage.foldername(name))[1] IN (
      SELECT e.id::text FROM public.events e WHERE e.user_id = auth.uid()
    )
  );
