-- Migration: 039_event_types_ro.sql
-- Romanian event type slugs + extended name / godparent fields

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS child_first_name text,
  ADD COLUMN IF NOT EXISTS godparent1_name text,
  ADD COLUMN IF NOT EXISTS godparent2_name text;

-- Map legacy English event_type values to Romanian slugs
UPDATE public.events SET event_type = 'nunta' WHERE event_type = 'wedding';
UPDATE public.events SET event_type = 'cununie_civila' WHERE event_type = 'civil_wedding';
UPDATE public.events SET event_type = 'botez' WHERE event_type = 'baptism';
UPDATE public.events SET event_type = 'majorat' WHERE event_type = 'major';
UPDATE public.events SET event_type = 'zi_de_nastere' WHERE event_type = 'birthday';
UPDATE public.events SET event_type = 'aniversare' WHERE event_type = 'anniversary';
UPDATE public.events SET event_type = 'eveniment_public' WHERE event_type IN ('public_event', 'private');

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_type_check
  CHECK (
    event_type IN (
      'nunta',
      'cununie_civila',
      'botez',
      'majorat',
      'zi_de_nastere',
      'aniversare',
      'corporate',
      'eveniment_public'
    )
  );
