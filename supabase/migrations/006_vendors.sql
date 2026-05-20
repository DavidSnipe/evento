-- Migration: 006_vendors.sql

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'contactat', -- contactat, confirmat, avans_platit, etc
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendors for their events"
ON vendors
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = vendors.event_id
        AND events.user_id = auth.uid()
    )
);
