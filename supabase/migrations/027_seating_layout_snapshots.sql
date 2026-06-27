-- Saved seating layout snapshots (floor plan variants) per event
-- Run after 026_update_seating_room_size_rpc.sql

CREATE TABLE IF NOT EXISTS public.seating_layout_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Serialized floor plan geometry (array of table/object rows)
  tables_json jsonb NOT NULL,

  -- Room dimensions at time of snapshot
  room_width_m numeric(6, 2) NOT NULL DEFAULT 30,
  room_height_m numeric(6, 2) NOT NULL DEFAULT 24,

  -- Guest assignment map: { guestId: tableName } for remap on activate
  guest_assignments_json jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Optional base64 PNG preview of canvas at save time
  thumbnail_data_url text,

  CONSTRAINT seating_layout_snapshots_name_nonempty
    CHECK (char_length(trim(name)) > 0),
  CONSTRAINT seating_layout_snapshots_tables_json_is_array
    CHECK (jsonb_typeof(tables_json) = 'array'),
  CONSTRAINT seating_layout_snapshots_guest_assignments_is_object
    CHECK (jsonb_typeof(guest_assignments_json) = 'object'),
  CONSTRAINT seating_layout_snapshots_room_width_m_range
    CHECK (room_width_m >= 5 AND room_width_m <= 100),
  CONSTRAINT seating_layout_snapshots_room_height_m_range
    CHECK (room_height_m >= 5 AND room_height_m <= 100)
);

CREATE INDEX IF NOT EXISTS seating_layout_snapshots_event_id_idx
  ON public.seating_layout_snapshots (event_id);

CREATE INDEX IF NOT EXISTS seating_layout_snapshots_event_id_created_at_idx
  ON public.seating_layout_snapshots (event_id, created_at DESC);

DROP TRIGGER IF EXISTS seating_layout_snapshots_updated_at
  ON public.seating_layout_snapshots;
CREATE TRIGGER seating_layout_snapshots_updated_at
  BEFORE UPDATE ON public.seating_layout_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.seating_layout_snapshots ENABLE ROW LEVEL SECURITY;

-- Read: any collaborator (including viewer) with event access
DROP POLICY IF EXISTS "Event access can read seating layout snapshots"
  ON public.seating_layout_snapshots;
CREATE POLICY "Event access can read seating layout snapshots"
  ON public.seating_layout_snapshots FOR SELECT
  USING (public.user_has_event_access(event_id));

-- Write: owner, editor, contributor (same as seating_tables / canEditSeating)
DROP POLICY IF EXISTS "Collaborators manage seating layout snapshots"
  ON public.seating_layout_snapshots;
CREATE POLICY "Collaborators manage seating layout snapshots"
  ON public.seating_layout_snapshots FOR INSERT
  WITH CHECK (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

CREATE POLICY "Collaborators update seating layout snapshots"
  ON public.seating_layout_snapshots FOR UPDATE
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

CREATE POLICY "Collaborators delete seating layout snapshots"
  ON public.seating_layout_snapshots FOR DELETE
  USING (
    public.user_can_edit_with_roles(
      event_id,
      ARRAY['owner', 'editor', 'contributor']
    )
  );

COMMENT ON TABLE public.seating_layout_snapshots IS
  'Named floor-plan variants saved from the seating planner (geometry + optional guest remap map)';
COMMENT ON COLUMN public.seating_layout_snapshots.tables_json IS
  'Array of { id, name, shape, capacity, pos_x, pos_y, sort_order, notes, color_tag }';
COMMENT ON COLUMN public.seating_layout_snapshots.guest_assignments_json IS
  'Map of guest UUID to table name for assignment remap on snapshot activate';
