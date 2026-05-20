-- Evento: guests + seating tables (linked to events)
-- Run after 001_events.sql

create table if not exists public.seating_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  capacity integer not null default 8 check (capacity > 0 and capacity <= 50),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  first_name text not null,
  last_name text,
  email text,
  phone text,
  rsvp_status text not null default 'pending' check (
    rsvp_status in ('pending', 'accepted', 'declined', 'maybe')
  ),
  plus_one boolean not null default false,
  plus_one_name text,
  group_name text,
  dietary_notes text,
  notes text,
  table_id uuid references public.seating_tables (id) on delete set null,
  seat_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seating_tables_event_id_idx on public.seating_tables (event_id);
create index if not exists guests_event_id_idx on public.guests (event_id);
create index if not exists guests_table_id_idx on public.guests (table_id);

alter table public.seating_tables enable row level security;
alter table public.guests enable row level security;

-- RLS: access via event ownership
create policy "Users manage seating_tables for own events"
  on public.seating_tables for all
  using (
    exists (
      select 1 from public.events e
      where e.id = seating_tables.event_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = seating_tables.event_id and e.user_id = auth.uid()
    )
  );

create policy "Users manage guests for own events"
  on public.guests for all
  using (
    exists (
      select 1 from public.events e
      where e.id = guests.event_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = guests.event_id and e.user_id = auth.uid()
    )
  );

drop trigger if exists guests_updated_at on public.guests;
create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();
