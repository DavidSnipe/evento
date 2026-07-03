-- Migration: 038_event_name_fields.sql
-- Smart name fields for wedding, civil ceremony, and baptism events

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS groom_first_name text,
  ADD COLUMN IF NOT EXISTS groom_last_name text,
  ADD COLUMN IF NOT EXISTS bride_first_name text,
  ADD COLUMN IF NOT EXISTS bride_last_name text,
  ADD COLUMN IF NOT EXISTS parent1_first_name text,
  ADD COLUMN IF NOT EXISTS parent1_last_name text,
  ADD COLUMN IF NOT EXISTS parent2_first_name text,
  ADD COLUMN IF NOT EXISTS parent2_last_name text;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (
    event_type IN (
      'wedding',
      'civil_wedding',
      'baptism',
      'birthday',
      'anniversary',
      'major',
      'private',
      'corporate',
      'public_event'
    )
  );
