-- Migration: 007_gallery.sql

-- 1. Add qr_slug to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS qr_slug TEXT UNIQUE;

-- 2. Create media_uploads table
CREATE TABLE IF NOT EXISTS media_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image' or 'video'
    mime_type TEXT,
    size INTEGER,
    uploaded_by TEXT, -- Guest name (optional)
    approved BOOLEAN DEFAULT true, -- Auto-approve by default, can be hidden by admin
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS media_uploads_event_id_idx ON media_uploads(event_id);
CREATE INDEX IF NOT EXISTS events_qr_slug_idx ON events(qr_slug);

-- RLS for media_uploads
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert if they have the event_id (public upload)
CREATE POLICY "Anyone can upload media to an event"
ON media_uploads
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view approved media for an event
CREATE POLICY "Anyone can view approved media"
ON media_uploads
FOR SELECT
USING (approved = true);

-- Policy: Event owners can manage all media for their events
CREATE POLICY "Users can manage media for their events"
ON media_uploads
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = media_uploads.event_id
        AND events.user_id = auth.uid()
    )
);
