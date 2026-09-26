-- TripSync schema. Run in the Supabase SQL editor.
-- All tables use RLS. Reads/writes from the browser go through the anon
-- key and are scoped by trip/conversation membership; every mutation that
-- needs to trust "who is this member" goes through a server API route
-- using the service-role key instead of relying on client-supplied ids.

create extension if not exists pgcrypto;

create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_window_start date not null,
  date_window_end date not null,
  response_deadline timestamptz not null,
  status text not null default 'collecting' check (status in ('collecting', 'locked')),
  locked_option_id uuid,
  -- The member who created the trip (first name in the setup form). Only
  -- this member can trigger the lock.
  coordinator_member_id uuid,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now()
);

create table members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  name text not null,
  -- Set by the coordinator at trip setup, before the member has joined.
  -- pin_hash is null until that member opens the link and sets a PIN.
  pin_hash text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  unique (trip_id, name)
);

create table preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade unique,
  budget_max_inr integer not null,
  available_start date not null,
  available_end date not null,
  destination_ranking text[] not null default '{}',
  trip_length_days integer not null,
  dealbreakers text[] not null default '{}',
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);

create table options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  destination text not null,
  summary text not null,
  est_cost_per_person jsonb not null,
  roadmap jsonb not null,
  -- Structured, machine-checkable attributes the deterministic fit-grid
  -- computation uses instead of trusting the AI's own fit judgement.
  tags jsonb not null default '{}',
  fit_grid jsonb not null default '{}',
  enrichment jsonb,
  created_at timestamptz not null default now()
);

alter table trips
  add constraint trips_locked_option_id_fkey
  foreign key (locked_option_id) references options(id);

alter table trips
  add constraint trips_coordinator_member_id_fkey
  foreign key (coordinator_member_id) references members(id);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  title text,
  attached_option_id uuid references options(id) on delete set null,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  primary key (conversation_id, member_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  body text not null,
  attached_option_id uuid references options(id) on delete set null,
  created_at timestamptz not null default now()
);

create table help_questions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  question text not null,
  ai_answer text,
  created_at timestamptz not null default now()
);

-- NOTE ON ENFORCEMENT: the browser never talks to Supabase directly in
-- this app (no anon-key client is used) - every read/write goes through a
-- Next.js API route using the service-role key, which checks the caller's
-- PIN-session cookie and, for conversations/messages, checks
-- conversation_members membership itself (see lib/conversation-server.ts).
-- The policies below are a second line of defense in case that ever
-- changes; current_member_id() reads auth.uid(), which requires a real
-- Supabase Auth session the browser doesn't currently have, so as things
-- stand these policies simply deny all direct anon-key access to the
-- private tables (harmless - nothing queries them that way).
create or replace function current_member_id() returns uuid as $$
  select auth.uid()
$$ language sql stable;

alter table trips enable row level security;
alter table members enable row level security;
alter table preferences enable row level security;
alter table options enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table help_questions enable row level security;

-- Trips/members/preferences/options/help are readable by anyone with the
-- link (no secret data in them); writes happen only via service-role API
-- routes, so no insert/update policy is granted to anon/authenticated.
create policy trips_select on trips for select using (true);
create policy members_select on members for select using (true);
create policy preferences_select on preferences for select using (true);
create policy options_select on options for select using (true);
create policy help_questions_select on help_questions for select using (true);

-- Conversations/messages are private: only visible to members of that
-- conversation, matched against the member id the API route set on the
-- connection after verifying the caller's PIN-session cookie.
create policy conversations_select on conversations for select using (
  exists (
    select 1 from conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.member_id = current_member_id()
  )
);

create policy conversation_members_select on conversation_members for select using (
  member_id = current_member_id()
  or conversation_id in (
    select conversation_id from conversation_members where member_id = current_member_id()
  )
);

create policy messages_select on messages for select using (
  exists (
    select 1 from conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.member_id = current_member_id()
  )
);

create policy messages_insert on messages for insert with check (
  member_id = current_member_id()
  and exists (
    select 1 from conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.member_id = current_member_id()
  )
);

create index on members(trip_id);
create index on preferences(trip_id);
create index on options(trip_id);
create index on conversations(trip_id);
create index on messages(conversation_id);
create index on help_questions(trip_id);
