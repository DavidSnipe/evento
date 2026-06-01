-- Wedding day execution schedule (separate from planning timeline_tasks)
-- Run after 013_timeline_foundation.sql

CREATE TABLE IF NOT EXISTS public.day_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  title text NOT NULL,
  start_time time NOT NULL,
  end_time time,
  location text,
  notes text,
  responsible_person text,
  event_segment text NOT NULL DEFAULT 'party' CHECK (
    event_segment IN ('civil', 'religious', 'party')
  ),
  sort_order integer NOT NULL DEFAULT 0,
  -- Vendor extension points (module not built yet)
  vendor_id uuid REFERENCES public.vendors (id) ON DELETE SET NULL,
  vendor_role text CHECK (
    vendor_role IS NULL
    OR vendor_role IN ('photographer', 'videographer', 'dj', 'venue')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT day_schedule_items_title_nonempty CHECK (char_length(trim(title)) > 0),
  CONSTRAINT day_schedule_items_end_after_start CHECK (
    end_time IS NULL OR end_time > start_time
  )
);

CREATE INDEX IF NOT EXISTS day_schedule_items_event_id_idx
  ON public.day_schedule_items (event_id);

CREATE INDEX IF NOT EXISTS day_schedule_items_event_date_idx
  ON public.day_schedule_items (event_id, schedule_date);

CREATE INDEX IF NOT EXISTS day_schedule_items_sort_idx
  ON public.day_schedule_items (event_id, schedule_date, sort_order);

CREATE INDEX IF NOT EXISTS day_schedule_items_vendor_id_idx
  ON public.day_schedule_items (vendor_id);

DROP TRIGGER IF EXISTS day_schedule_items_updated_at ON public.day_schedule_items;
CREATE TRIGGER day_schedule_items_updated_at
  BEFORE UPDATE ON public.day_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.day_schedule_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage day schedule for own events" ON public.day_schedule_items;
CREATE POLICY "Users manage day schedule for own events"
  ON public.day_schedule_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = day_schedule_items.event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = day_schedule_items.event_id AND e.user_id = auth.uid()
    )
  );
