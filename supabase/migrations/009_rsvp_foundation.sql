-- RSVP foundation: invitation households, members, units, responses, seating groups
-- Run after 008_guest_relationships.sql
-- Does NOT modify guests table; links via invitation_members.guest_id

-- ---------------------------------------------------------------------------
-- invitation_households — main RSVP identity (one invite link per household)
-- ---------------------------------------------------------------------------
create table if not exists public.invitation_households (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  invite_token text not null unique,
  display_name text not null,
  invitation_status text not null default 'draft' check (
    invitation_status in ('draft', 'sent', 'opened', 'partial', 'completed', 'expired')
  ),
  template_id uuid,
  max_seats integer check (max_seats is null or max_seats > 0),
  notes text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitation_households_event_id_idx
  on public.invitation_households (event_id);
create index if not exists invitation_households_invite_token_idx
  on public.invitation_households (invite_token);

-- ---------------------------------------------------------------------------
-- seating_groups — default social grouping for planner integration
-- ---------------------------------------------------------------------------
create table if not exists public.seating_groups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.invitation_households (id) on delete cascade,
  display_name text not null,
  locked_together boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists seating_groups_household_id_idx
  on public.seating_groups (household_id);

-- ---------------------------------------------------------------------------
-- rsvp_units — who responds together (parents, adult child, couple, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.rsvp_units (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.invitation_households (id) on delete cascade,
  display_name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rsvp_units_household_id_idx
  on public.rsvp_units (household_id);

-- ---------------------------------------------------------------------------
-- invitation_members — guests + placeholders attached to a household
-- ---------------------------------------------------------------------------
create table if not exists public.invitation_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.invitation_households (id) on delete cascade,
  guest_id uuid references public.guests (id) on delete set null,
  display_name text not null,
  member_type text not null default 'adult' check (
    member_type in ('adult', 'child', 'unnamed_child', 'placeholder')
  ),
  seating_group_id uuid references public.seating_groups (id) on delete set null,
  rsvp_unit_id uuid references public.rsvp_units (id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invitation_members_household_id_idx
  on public.invitation_members (household_id);
create index if not exists invitation_members_guest_id_idx
  on public.invitation_members (guest_id);
create index if not exists invitation_members_seating_group_id_idx
  on public.invitation_members (seating_group_id);
create index if not exists invitation_members_rsvp_unit_id_idx
  on public.invitation_members (rsvp_unit_id);

-- ---------------------------------------------------------------------------
-- rsvp_responses — per-member RSVP answers (supports partial household responses)
-- ---------------------------------------------------------------------------
create table if not exists public.rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  invitation_member_id uuid not null unique references public.invitation_members (id) on delete cascade,
  attendance_status text not null default 'pending' check (
    attendance_status in ('pending', 'confirmed', 'maybe', 'declined')
  ),
  attending_civil boolean not null default false,
  attending_religious boolean not null default false,
  attending_party boolean not null default false,
  menu_choice text,
  allergies text,
  notes text,
  preferred_seating_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rsvp_responses_member_id_idx
  on public.rsvp_responses (invitation_member_id);

-- Auto-create a pending response row for each new invitation member
create or replace function public.create_rsvp_response_for_member()
returns trigger as $$
begin
  insert into public.rsvp_responses (invitation_member_id)
  values (new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists invitation_members_create_rsvp_response on public.invitation_members;
create trigger invitation_members_create_rsvp_response
  after insert on public.invitation_members
  for each row execute function public.create_rsvp_response_for_member();

-- updated_at triggers
drop trigger if exists invitation_households_updated_at on public.invitation_households;
create trigger invitation_households_updated_at
  before update on public.invitation_households
  for each row execute function public.set_updated_at();

drop trigger if exists seating_groups_updated_at on public.seating_groups;
create trigger seating_groups_updated_at
  before update on public.seating_groups
  for each row execute function public.set_updated_at();

drop trigger if exists rsvp_units_updated_at on public.rsvp_units;
create trigger rsvp_units_updated_at
  before update on public.rsvp_units
  for each row execute function public.set_updated_at();

drop trigger if exists invitation_members_updated_at on public.invitation_members;
create trigger invitation_members_updated_at
  before update on public.invitation_members
  for each row execute function public.set_updated_at();

drop trigger if exists rsvp_responses_updated_at on public.rsvp_responses;
create trigger rsvp_responses_updated_at
  before update on public.rsvp_responses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (dashboard / owner access via event ownership)
-- Public anon policies for invite_token will be added when building public RSVP UI
-- ---------------------------------------------------------------------------
alter table public.invitation_households enable row level security;
alter table public.seating_groups enable row level security;
alter table public.rsvp_units enable row level security;
alter table public.invitation_members enable row level security;
alter table public.rsvp_responses enable row level security;

drop policy if exists "Users manage invitation_households for own events" on public.invitation_households;
create policy "Users manage invitation_households for own events"
  on public.invitation_households for all
  using (
    exists (
      select 1 from public.events e
      where e.id = invitation_households.event_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.events e
      where e.id = invitation_households.event_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage seating_groups for own events" on public.seating_groups;
create policy "Users manage seating_groups for own events"
  on public.seating_groups for all
  using (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = seating_groups.household_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = seating_groups.household_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage rsvp_units for own events" on public.rsvp_units;
create policy "Users manage rsvp_units for own events"
  on public.rsvp_units for all
  using (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = rsvp_units.household_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = rsvp_units.household_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage invitation_members for own events" on public.invitation_members;
create policy "Users manage invitation_members for own events"
  on public.invitation_members for all
  using (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = invitation_members.household_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invitation_households h
      join public.events e on e.id = h.event_id
      where h.id = invitation_members.household_id and e.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage rsvp_responses for own events" on public.rsvp_responses;
create policy "Users manage rsvp_responses for own events"
  on public.rsvp_responses for all
  using (
    exists (
      select 1 from public.invitation_members m
      join public.invitation_households h on h.id = m.household_id
      join public.events e on e.id = h.event_id
      where m.id = rsvp_responses.invitation_member_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.invitation_members m
      join public.invitation_households h on h.id = m.household_id
      join public.events e on e.id = h.event_id
      where m.id = rsvp_responses.invitation_member_id and e.user_id = auth.uid()
    )
  );
