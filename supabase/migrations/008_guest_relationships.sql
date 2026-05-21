-- Migration: Add relationship and group columns to guests table
-- Run in Supabase after 002_guests_seating.sql

ALTER TABLE public.guests 
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.guests (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS family_id uuid,
  ADD COLUMN IF NOT EXISTS group_id uuid,
  ADD COLUMN IF NOT EXISTS relationship_type text DEFAULT 'guest' 
    CHECK (relationship_type IN ('couple', 'family', 'child', 'guest'));

-- Indexes for relationship queries
CREATE INDEX IF NOT EXISTS guests_parent_id_idx ON public.guests (parent_id);
CREATE INDEX IF NOT EXISTS guests_family_id_idx ON public.guests (family_id);
CREATE INDEX IF NOT EXISTS guests_group_id_idx ON public.guests (group_id);
