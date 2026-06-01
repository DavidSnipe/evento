-- Timeline foundation: categories, milestones, tasks
-- Run after 011_event_invitations.sql (uses invitation_households FK for future RSVP links)
-- Safe to re-run: IF NOT EXISTS + DROP POLICY IF EXISTS

-- ---------------------------------------------------------------------------
-- timeline_categories — system catalog + per-event custom categories
-- event_id NULL = global system category
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timeline_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timeline_categories_slug_nonempty CHECK (char_length(trim(slug)) > 0),
  CONSTRAINT timeline_categories_name_nonempty CHECK (char_length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS timeline_categories_system_slug_idx
  ON public.timeline_categories (slug)
  WHERE event_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS timeline_categories_event_slug_idx
  ON public.timeline_categories (event_id, slug)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS timeline_categories_event_id_idx
  ON public.timeline_categories (event_id);

-- ---------------------------------------------------------------------------
-- timeline_milestones — relative/custom planning anchors
-- event_id NULL = reusable template (12 months before, etc.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timeline_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events (id) ON DELETE CASCADE,
  label text NOT NULL,
  months_before integer CHECK (months_before IS NULL OR months_before >= 0),
  weeks_before integer CHECK (weeks_before IS NULL OR weeks_before >= 0),
  days_before integer CHECK (days_before IS NULL OR days_before >= 0),
  fixed_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timeline_milestones_label_nonempty CHECK (char_length(trim(label)) > 0),
  CONSTRAINT timeline_milestones_has_schedule CHECK (
    fixed_date IS NOT NULL
    OR months_before IS NOT NULL
    OR weeks_before IS NOT NULL
    OR days_before IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS timeline_milestones_event_id_idx
  ON public.timeline_milestones (event_id);

CREATE INDEX IF NOT EXISTS timeline_milestones_sort_idx
  ON public.timeline_milestones (event_id, sort_order);

-- ---------------------------------------------------------------------------
-- timeline_tasks — core planning unit
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timeline_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.timeline_categories (id) ON DELETE SET NULL,
  milestone_id uuid REFERENCES public.timeline_milestones (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started' CHECK (
    status IN ('not_started', 'in_progress', 'waiting', 'completed', 'cancelled')
  ),
  priority text NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  event_segment text NOT NULL DEFAULT 'general' CHECK (
    event_segment IN ('general', 'civil', 'religious', 'party')
  ),
  due_date date,
  completed_at timestamptz,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  -- Future integration extension points (nullable FKs)
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  budget_item_id uuid REFERENCES public.budget_items (id) ON DELETE SET NULL,
  invitation_household_id uuid REFERENCES public.invitation_households (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT timeline_tasks_title_nonempty CHECK (char_length(trim(title)) > 0)
);

CREATE INDEX IF NOT EXISTS timeline_tasks_event_id_idx
  ON public.timeline_tasks (event_id);

CREATE INDEX IF NOT EXISTS timeline_tasks_status_idx
  ON public.timeline_tasks (event_id, status);

CREATE INDEX IF NOT EXISTS timeline_tasks_due_date_idx
  ON public.timeline_tasks (event_id, due_date);

CREATE INDEX IF NOT EXISTS timeline_tasks_category_id_idx
  ON public.timeline_tasks (category_id);

CREATE INDEX IF NOT EXISTS timeline_tasks_milestone_id_idx
  ON public.timeline_tasks (milestone_id);

CREATE INDEX IF NOT EXISTS timeline_tasks_vendor_id_idx
  ON public.timeline_tasks (vendor_id);

CREATE INDEX IF NOT EXISTS timeline_tasks_budget_item_id_idx
  ON public.timeline_tasks (budget_item_id);

CREATE INDEX IF NOT EXISTS timeline_tasks_invitation_household_id_idx
  ON public.timeline_tasks (invitation_household_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS timeline_categories_updated_at ON public.timeline_categories;
CREATE TRIGGER timeline_categories_updated_at
  BEFORE UPDATE ON public.timeline_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS timeline_milestones_updated_at ON public.timeline_milestones;
CREATE TRIGGER timeline_milestones_updated_at
  BEFORE UPDATE ON public.timeline_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS timeline_tasks_updated_at ON public.timeline_tasks;
CREATE TRIGGER timeline_tasks_updated_at
  BEFORE UPDATE ON public.timeline_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.timeline_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read system timeline categories" ON public.timeline_categories;
CREATE POLICY "Public read system timeline categories"
  ON public.timeline_categories FOR SELECT
  USING (event_id IS NULL);

DROP POLICY IF EXISTS "Users manage timeline categories for own events" ON public.timeline_categories;
CREATE POLICY "Users manage timeline categories for own events"
  ON public.timeline_categories FOR ALL
  USING (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_categories.event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_categories.event_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public read template timeline milestones" ON public.timeline_milestones;
CREATE POLICY "Public read template timeline milestones"
  ON public.timeline_milestones FOR SELECT
  USING (event_id IS NULL);

DROP POLICY IF EXISTS "Users manage timeline milestones for own events" ON public.timeline_milestones;
CREATE POLICY "Users manage timeline milestones for own events"
  ON public.timeline_milestones FOR ALL
  USING (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_milestones.event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_milestones.event_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users manage timeline tasks for own events" ON public.timeline_tasks;
CREATE POLICY "Users manage timeline tasks for own events"
  ON public.timeline_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_tasks.event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = timeline_tasks.event_id AND e.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed system categories (fixed UUIDs for idempotent upsert)
-- ---------------------------------------------------------------------------
INSERT INTO public.timeline_categories (id, event_id, slug, name, sort_order)
VALUES
  ('c1000001-0001-4001-8001-000000000001', NULL, 'venue', 'Locație', 10),
  ('c1000001-0001-4001-8001-000000000002', NULL, 'photography', 'Fotografie', 20),
  ('c1000001-0001-4001-8001-000000000003', NULL, 'video', 'Video', 30),
  ('c1000001-0001-4001-8001-000000000004', NULL, 'music', 'Muzică', 40),
  ('c1000001-0001-4001-8001-000000000005', NULL, 'catering', 'Catering', 50),
  ('c1000001-0001-4001-8001-000000000006', NULL, 'decorations', 'Decorațiuni', 60),
  ('c1000001-0001-4001-8001-000000000007', NULL, 'attire', 'Ținută', 70),
  ('c1000001-0001-4001-8001-000000000008', NULL, 'invitations', 'Invitații', 80),
  ('c1000001-0001-4001-8001-000000000009', NULL, 'legal', 'Acte / Legal', 90),
  ('c1000001-0001-4001-8001-00000000000a', NULL, 'religious', 'Religios', 100),
  ('c1000001-0001-4001-8001-00000000000b', NULL, 'transport', 'Transport', 110),
  ('c1000001-0001-4001-8001-00000000000c', NULL, 'accommodation', 'Cazare', 120),
  ('c1000001-0001-4001-8001-00000000000d', NULL, 'budget', 'Buget', 130),
  ('c1000001-0001-4001-8001-00000000000e', NULL, 'other', 'Altele', 140)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Seed template milestones (event_id NULL)
-- ---------------------------------------------------------------------------
INSERT INTO public.timeline_milestones (
  id, event_id, label, months_before, weeks_before, days_before, fixed_date, sort_order
)
VALUES
  ('a1000002-0001-4001-8001-000000000001', NULL, '12 luni înainte', 12, NULL, NULL, NULL, 10),
  ('a1000002-0001-4001-8001-000000000002', NULL, '9 luni înainte', 9, NULL, NULL, NULL, 20),
  ('a1000002-0001-4001-8001-000000000003', NULL, '6 luni înainte', 6, NULL, NULL, NULL, 30),
  ('a1000002-0001-4001-8001-000000000004', NULL, '3 luni înainte', 3, NULL, NULL, NULL, 40),
  ('a1000002-0001-4001-8001-000000000005', NULL, '1 lună înainte', 1, NULL, NULL, NULL, 50),
  ('a1000002-0001-4001-8001-000000000006', NULL, '1 săptămână înainte', NULL, 1, NULL, NULL, 60),
  ('a1000002-0001-4001-8001-000000000007', NULL, '1 zi înainte', NULL, NULL, 1, NULL, 70)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  months_before = EXCLUDED.months_before,
  weeks_before = EXCLUDED.weeks_before,
  days_before = EXCLUDED.days_before,
  fixed_date = EXCLUDED.fixed_date,
  sort_order = EXCLUDED.sort_order;
