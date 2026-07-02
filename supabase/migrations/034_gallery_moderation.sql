-- Migration: 034_gallery_moderation.sql
-- Guest uploads default to pending; organizers moderate before public visibility.

ALTER TABLE public.media_uploads
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

ALTER TABLE public.media_uploads
  ALTER COLUMN approved SET DEFAULT false;

CREATE INDEX IF NOT EXISTS media_uploads_approved_idx
  ON public.media_uploads (event_id, approved);

-- ---------------------------------------------------------------------------
-- RLS: public sees approved only; organizers/collaborators see all for event
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view approved media" ON public.media_uploads;
DROP POLICY IF EXISTS "Users can manage media for their events" ON public.media_uploads;

CREATE POLICY "Public can view approved media"
  ON public.media_uploads FOR SELECT
  TO anon, authenticated
  USING (approved = true);

CREATE POLICY "Event access can view all media"
  ON public.media_uploads FOR SELECT
  TO authenticated
  USING (public.user_has_event_access(event_id));

CREATE POLICY "Event access can manage media"
  ON public.media_uploads FOR ALL
  TO authenticated
  USING (public.user_has_event_access(event_id))
  WITH CHECK (public.user_has_event_access(event_id));
