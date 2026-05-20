-- Migration: 005_budget.sql

CREATE TABLE IF NOT EXISTS budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    estimated_cost NUMERIC(10, 2) DEFAULT 0,
    actual_cost NUMERIC(10, 2) DEFAULT 0,
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget items for their events"
ON budget_items
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM events
        WHERE events.id = budget_items.event_id
        AND events.user_id = auth.uid()
    )
);
