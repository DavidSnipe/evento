-- One public RSVP link per event (MVP)
-- Run after 009_rsvp_foundation.sql

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS rsvp_slug text UNIQUE;

CREATE INDEX IF NOT EXISTS events_rsvp_slug_idx ON public.events (rsvp_slug);

-- ---------------------------------------------------------------------------
-- Public RSVP read/update (anon) — only for events with rsvp_slug published
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read published RSVP events" ON public.events;
CREATE POLICY "Public read published RSVP events"
  ON public.events FOR SELECT
  USING (rsvp_slug IS NOT NULL);

DROP POLICY IF EXISTS "Public read RSVP households for published events" ON public.invitation_households;
CREATE POLICY "Public read RSVP households for published events"
  ON public.invitation_households FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = invitation_households.event_id AND e.rsvp_slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read RSVP members for published events" ON public.invitation_members;
CREATE POLICY "Public read RSVP members for published events"
  ON public.invitation_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invitation_households h
      JOIN public.events e ON e.id = h.event_id
      WHERE h.id = invitation_members.household_id AND e.rsvp_slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read RSVP responses for published events" ON public.rsvp_responses;
CREATE POLICY "Public read RSVP responses for published events"
  ON public.rsvp_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invitation_members m
      JOIN public.invitation_households h ON h.id = m.household_id
      JOIN public.events e ON e.id = h.event_id
      WHERE m.id = rsvp_responses.invitation_member_id AND e.rsvp_slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public update RSVP responses for published events" ON public.rsvp_responses;
CREATE POLICY "Public update RSVP responses for published events"
  ON public.rsvp_responses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.invitation_members m
      JOIN public.invitation_households h ON h.id = m.household_id
      JOIN public.events e ON e.id = h.event_id
      WHERE m.id = rsvp_responses.invitation_member_id AND e.rsvp_slug IS NOT NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invitation_members m
      JOIN public.invitation_households h ON h.id = m.household_id
      JOIN public.events e ON e.id = h.event_id
      WHERE m.id = rsvp_responses.invitation_member_id AND e.rsvp_slug IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public read guests for published RSVP events" ON public.guests;
CREATE POLICY "Public read guests for published RSVP events"
  ON public.guests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = guests.event_id AND e.rsvp_slug IS NOT NULL
    )
  );
