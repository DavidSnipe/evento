-- Calendar subscription foundation (Phase 5.5A)
-- Per-event secret token for live ICS feeds

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS calendar_subscription_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS events_calendar_subscription_token_idx
  ON public.events (calendar_subscription_token);

-- Server-side feed payload (token-validated, bypasses RLS)
CREATE OR REPLACE FUNCTION public.fetch_calendar_subscription_payload(
  p_event_id uuid,
  p_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event record;
  v_tasks jsonb;
  v_items jsonb;
BEGIN
  SELECT e.id, e.title, e.venue
  INTO v_event
  FROM public.events e
  WHERE e.id = p_event_id
    AND e.calendar_subscription_token = p_token
  LIMIT 1;

  IF v_event.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'event_id', t.event_id,
        'title', t.title,
        'description', t.description,
        'status', t.status,
        'priority', t.priority,
        'event_segment', t.event_segment,
        'due_date', t.due_date,
        'notes', t.notes,
        'category', CASE
          WHEN c.id IS NULL THEN NULL
          ELSE jsonb_build_object('id', c.id, 'name', c.name)
        END,
        'milestone', CASE
          WHEN m.id IS NULL THEN NULL
          ELSE jsonb_build_object('id', m.id, 'label', m.label)
        END
      )
      ORDER BY t.due_date NULLS LAST, t.sort_order
    ),
    '[]'::jsonb
  )
  INTO v_tasks
  FROM public.timeline_tasks t
  LEFT JOIN public.timeline_categories c ON c.id = t.category_id
  LEFT JOIN public.timeline_milestones m ON m.id = t.milestone_id
  WHERE t.event_id = p_event_id
    AND t.status <> 'cancelled'
    AND t.due_date IS NOT NULL;

  SELECT COALESCE(
    jsonb_agg(
      to_jsonb(d.*)
      ORDER BY d.schedule_date, d.start_time, d.sort_order
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.day_schedule_items d
  WHERE d.event_id = p_event_id;

  RETURN jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'venue', v_event.venue
    ),
    'tasks', v_tasks,
    'dayItems', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fetch_calendar_subscription_payload(uuid, uuid) TO anon, authenticated;
