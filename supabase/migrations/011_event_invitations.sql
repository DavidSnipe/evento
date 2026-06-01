-- Event-level invitation builder (template-based, one design per public RSVP page)
-- Run after 010_event_rsvp_slug.sql

CREATE TABLE IF NOT EXISTS public.event_invitations (
  event_id uuid PRIMARY KEY REFERENCES public.events (id) ON DELETE CASCADE,
  template_slug text NOT NULL DEFAULT 'elegant',
  content jsonb NOT NULL DEFAULT '{}',
  sections jsonb NOT NULL DEFAULT '{
    "invitationText": true,
    "coupleNames": true,
    "parents": true,
    "godparents": true,
    "date": true,
    "schedule": true,
    "venue": true,
    "civilCeremony": true,
    "religiousCeremony": true,
    "party": true,
    "dressCode": true,
    "accommodation": false,
    "transport": false,
    "additionalNotes": false,
    "gallery": false,
    "closingMessage": true,
    "rsvpCta": true
  }',
  theme jsonb NOT NULL DEFAULT '{"fontPreset":"serif","colorPreset":"rose"}',
  cover_image_url text,
  gallery_image_urls jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_invitations_template_slug_idx
  ON public.event_invitations (template_slug);

DROP TRIGGER IF EXISTS event_invitations_updated_at ON public.event_invitations;
CREATE TRIGGER event_invitations_updated_at
  BEFORE UPDATE ON public.event_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage event_invitations for own events" ON public.event_invitations;
CREATE POLICY "Users manage event_invitations for own events"
  ON public.event_invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_invitations.event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_invitations.event_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public read event_invitations for published RSVP" ON public.event_invitations;
CREATE POLICY "Public read event_invitations for published RSVP"
  ON public.event_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_invitations.event_id AND e.rsvp_slug IS NOT NULL
    )
  );
