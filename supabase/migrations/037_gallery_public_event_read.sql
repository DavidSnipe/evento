-- Migration: 037_gallery_public_event_read.sql
-- Allow anonymous read of events that have a public gallery QR slug

DROP POLICY IF EXISTS "Public read gallery events" ON public.events;

CREATE POLICY "Public read gallery events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (qr_slug IS NOT NULL);
