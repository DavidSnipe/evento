-- Event collaboration foundation: collaborators, activity log, access helpers
-- Run after 014_day_schedule.sql
-- Safe to re-run: IF NOT EXISTS + DROP POLICY IF EXISTS

-- ---------------------------------------------------------------------------
-- Tables (must exist before helper functions that reference them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  role text NOT NULL CHECK (role IN ('editor', 'contributor', 'viewer')),
  status text NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'declined')
  ),
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  invited_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_collaborators_email_nonempty CHECK (char_length(trim(email)) > 0),
  CONSTRAINT event_collaborators_token_unique UNIQUE (invite_token),
  CONSTRAINT event_collaborators_event_email_unique UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS event_collaborators_event_id_idx
  ON public.event_collaborators (event_id);

CREATE INDEX IF NOT EXISTS event_collaborators_user_id_idx
  ON public.event_collaborators (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS event_collaborators_token_idx
  ON public.event_collaborators (invite_token);

CREATE INDEX IF NOT EXISTS event_collaborators_status_idx
  ON public.event_collaborators (event_id, status);

DROP TRIGGER IF EXISTS event_collaborators_updated_at ON public.event_collaborators;
CREATE TRIGGER event_collaborators_updated_at
  BEFORE UPDATE ON public.event_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.event_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_activity_log_action_nonempty CHECK (char_length(trim(action)) > 0),
  CONSTRAINT event_activity_log_summary_nonempty CHECK (char_length(trim(summary)) > 0)
);

CREATE INDEX IF NOT EXISTS event_activity_log_event_id_idx
  ON public.event_activity_log (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_activity_log_action_idx
  ON public.event_activity_log (event_id, action);

-- ---------------------------------------------------------------------------
-- Access helper functions (after tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_is_event_owner(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = p_event_id AND e.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_event_collaborator_role(p_event_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.role
  FROM public.event_collaborators c
  WHERE c.event_id = p_event_id
    AND c.user_id = auth.uid()
    AND c.status = 'accepted'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_event_access_role(p_event_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.user_is_event_owner(p_event_id) THEN 'owner'
    ELSE public.user_event_collaborator_role(p_event_id)
  END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_event_access(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_event_access_role(p_event_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_can_edit_with_roles(
  p_event_id uuid,
  p_allowed_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_event_access_role(p_event_id) = ANY (p_allowed_roles);
$$;

CREATE OR REPLACE FUNCTION public.get_pending_collaborator_invite(p_token uuid)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  email text,
  role text,
  status text,
  invite_token uuid,
  event_title text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.event_id,
    c.email,
    c.role,
    c.status,
    c.invite_token,
    e.title AS event_title
  FROM public.event_collaborators c
  JOIN public.events e ON e.id = c.event_id
  WHERE c.invite_token = p_token
    AND c.status = 'pending'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_collaborator_invite(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: event_collaborators
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage event collaborators" ON public.event_collaborators;
CREATE POLICY "Owners manage event collaborators"
  ON public.event_collaborators FOR ALL
  USING (public.user_is_event_owner(event_id))
  WITH CHECK (public.user_is_event_owner(event_id));

DROP POLICY IF EXISTS "Collaborators view own row" ON public.event_collaborators;
CREATE POLICY "Collaborators view own row"
  ON public.event_collaborators FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Invitees view pending invite by token match" ON public.event_collaborators;
CREATE POLICY "Invitees view pending invite by token match"
  ON public.event_collaborators FOR SELECT
  USING (
    status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Invitees respond to own pending invite" ON public.event_collaborators;
CREATE POLICY "Invitees respond to own pending invite"
  ON public.event_collaborators FOR UPDATE
  USING (
    status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    status IN ('accepted', 'declined')
    AND user_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- RLS: event_activity_log
-- ---------------------------------------------------------------------------
ALTER TABLE public.event_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event members read activity log" ON public.event_activity_log;
CREATE POLICY "Event members read activity log"
  ON public.event_activity_log FOR SELECT
  USING (public.user_has_event_access(event_id));

DROP POLICY IF EXISTS "Event members insert activity log" ON public.event_activity_log;
CREATE POLICY "Event members insert activity log"
  ON public.event_activity_log FOR INSERT
  WITH CHECK (
    public.user_has_event_access(event_id)
    AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- RLS: extend events SELECT for collaborators
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Collaborators can view shared events" ON public.events;
CREATE POLICY "Collaborators can view shared events"
  ON public.events FOR SELECT
  USING (public.user_has_event_access(id));

-- ---------------------------------------------------------------------------
-- RLS: collaborator write access on core event modules
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Collaborators manage guests" ON public.guests;
CREATE POLICY "Collaborators manage guests"
  ON public.guests FOR ALL
  USING (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

DROP POLICY IF EXISTS "Collaborators manage seating tables" ON public.seating_tables;
CREATE POLICY "Collaborators manage seating tables"
  ON public.seating_tables FOR ALL
  USING (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

DROP POLICY IF EXISTS "Collaborators manage timeline tasks" ON public.timeline_tasks;
CREATE POLICY "Collaborators manage timeline tasks"
  ON public.timeline_tasks FOR ALL
  USING (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

DROP POLICY IF EXISTS "Collaborators manage day schedule" ON public.day_schedule_items;
CREATE POLICY "Collaborators manage day schedule"
  ON public.day_schedule_items FOR ALL
  USING (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

DROP POLICY IF EXISTS "Collaborators manage budget items" ON public.budget_items;
CREATE POLICY "Collaborators manage budget items"
  ON public.budget_items FOR ALL
  USING (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  );

DROP POLICY IF EXISTS "Collaborators manage vendors" ON public.vendors;
CREATE POLICY "Collaborators manage vendors"
  ON public.vendors FOR ALL
  USING (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  );

DROP POLICY IF EXISTS "Collaborators manage event invitations" ON public.event_invitations;
CREATE POLICY "Collaborators manage event invitations"
  ON public.event_invitations FOR ALL
  USING (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  )
  WITH CHECK (
    public.user_can_edit_with_roles(event_id, ARRAY['owner', 'editor'])
  );

DROP POLICY IF EXISTS "Collaborators manage custom timeline categories" ON public.timeline_categories;
CREATE POLICY "Collaborators manage custom timeline categories"
  ON public.timeline_categories FOR ALL
  USING (
    event_id IS NOT NULL
    AND public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    event_id IS NOT NULL
    AND public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

DROP POLICY IF EXISTS "Collaborators manage custom timeline milestones" ON public.timeline_milestones;
CREATE POLICY "Collaborators manage custom timeline milestones"
  ON public.timeline_milestones FOR ALL
  USING (
    event_id IS NOT NULL
    AND public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  )
  WITH CHECK (
    event_id IS NOT NULL
    AND public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );
