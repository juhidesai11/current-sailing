-- =============================================================================
-- CURRENT — database schema and Row Level Security policies
-- Project: Current (Supabase, West US / North California)
--
-- Scope: profiles + their child tables (sailing types, roles, boats, credentials)
-- and sails. No auth pages, no app code, no Post a Sail UI yet — this is only
-- the database this feature will eventually sit on.
--
-- Safe to re-run: tables/indexes use IF NOT EXISTS, and every policy is dropped
-- before it's recreated, so running this script twice won't error.
--
-- Run this once in the Supabase SQL Editor. See the notes at the bottom of the
-- chat message this file came with for exactly how.
-- =============================================================================

create extension if not exists pgcrypto; -- provides gen_random_uuid()


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- The CURRENT profile itself. Deliberately does NOT include email or anything
-- else from auth.users — email must never appear on a public profile. This
-- table only exists at all for a user once they've completed onboarding.
create table if not exists public.profiles (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references auth.users (id) on delete cascade,
  slug               text not null unique,             -- e.g. profile.html?u=<slug>
  name               text not null,
  photo_url          text,
  home_sailing_area  text,
  bio                text,
  sailing_since      int,
  identity_verified  boolean not null default false,   -- no real check yet; server-controlled, see 3B below
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Sailing types (Racing, Day sailing, Cruising, Offshore, Dinghy, …). One row
-- per selected type — a sailor can have several.
create table if not exists public.profile_sailing_types (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  created_at  timestamptz not null default now()
);

-- Crew/skipper roles (Helm, Skipper, Bow, Trimmer, Pit, Crew, Instructor, …).
create table if not exists public.profile_roles (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- Boats/classes sailed. `name` is free text on purpose — anyone should be able
-- to add a boat that isn't on any fixed list, matching the existing wizard.
create table if not exists public.profile_boats (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  name        text not null,
  experience  text not null check (experience in ('Some', 'Regular', 'Extensive')),
  created_at  timestamptz not null default now()
);

-- Sailing credentials, as entered by the sailor — never labeled "verified".
create table if not exists public.profile_credentials (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  issuer      text not null,
  name        text not null,
  year        int,
  detail      text,
  created_at  timestamptz not null default now()
);

-- A posted sailing opportunity. `status` is the only constrained field for
-- now — Post a Sail's own form (type, experience_level, crew_needed, …) isn't
-- designed yet, so those stay free text rather than guessing at an enum.
create table if not exists public.sails (
  id                uuid primary key default gen_random_uuid(),
  skipper_user_id   uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  type              text not null,
  boat              text not null,
  location          text not null,
  sail_date         date not null,
  start_time        time not null,
  duration          text,
  description       text,
  experience_level  text,
  crew_needed       text,
  roles_needed      text[] not null default '{}',
  notes             text,
  status            text not null default 'open' check (status in ('open', 'closed')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);


-- =============================================================================
-- 2. INDEXES (foreign keys aren't indexed automatically in Postgres)
-- =============================================================================

create index if not exists profile_sailing_types_profile_id_idx on public.profile_sailing_types (profile_id);
create index if not exists profile_roles_profile_id_idx         on public.profile_roles (profile_id);
create index if not exists profile_boats_profile_id_idx         on public.profile_boats (profile_id);
create index if not exists profile_credentials_profile_id_idx   on public.profile_credentials (profile_id);
create index if not exists sails_skipper_user_id_idx            on public.sails (skipper_user_id);
create index if not exists sails_status_idx                     on public.sails (status);


-- =============================================================================
-- 3. keep updated_at honest
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.sails;
create trigger set_updated_at
  before update on public.sails
  for each row execute function public.set_updated_at();


-- =============================================================================
-- 3B. IDENTITY VERIFICATION IS SERVER-CONTROLLED, NOT USER-EDITABLE
-- There is no real identity verification system yet. `identity_verified`
-- stays on the table for when one exists, but nothing lets a user set it
-- themselves — not the insert policy, not the update policy below. This
-- trigger forces it to false on every insert and back to its existing value
-- on every update, no matter what value the client sends. A future
-- verification process will need its own path that bypasses this trigger
-- (e.g. a security-definer function) — that path does not exist yet, on
-- purpose, since V1 has no real verification to drive it.
-- =============================================================================

create or replace function public.protect_identity_verified()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.identity_verified := false;
  else
    new.identity_verified := old.identity_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_identity_verified on public.profiles;
create trigger protect_identity_verified
  before insert or update on public.profiles
  for each row execute function public.protect_identity_verified();


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- Every table below has RLS enabled. With RLS on and no matching policy, a
-- table denies access by default — so "no policy exists for this" already
-- means "nobody but the owner can do this", not just the policies that
-- explicitly say so.
-- =============================================================================

alter table public.profiles               enable row level security;
alter table public.profile_sailing_types  enable row level security;
alter table public.profile_roles          enable row level security;
alter table public.profile_boats          enable row level security;
alter table public.profile_credentials    enable row level security;
alter table public.sails                  enable row level security;


-- ---- profiles ---------------------------------------------------------------
-- Public CURRENT profiles are readable by anyone (logged in or not) — that's
-- the point of a shareable profile. Only the profile's own owner can create,
-- change, or remove it.

drop policy if exists "profiles are publicly readable" on public.profiles;
create policy "profiles are publicly readable"
  on public.profiles for select
  to public
  using (true);

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can edit their own profile" on public.profiles;
create policy "users can edit their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---- profile child tables (sailing types, roles, boats, credentials) --------
-- Same shape for all four: publicly readable (they're part of a public
-- profile), but only writable by the user who owns the parent profile row.
-- There's no user_id column on these tables directly, so ownership is checked
-- by joining back to profiles.

drop policy if exists "sailing types are publicly readable" on public.profile_sailing_types;
create policy "sailing types are publicly readable"
  on public.profile_sailing_types for select
  to public
  using (true);

drop policy if exists "users manage their own sailing types" on public.profile_sailing_types;
create policy "users manage their own sailing types"
  on public.profile_sailing_types for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = profile_sailing_types.profile_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = profile_sailing_types.profile_id
      and profiles.user_id = auth.uid()
  ));

drop policy if exists "roles are publicly readable" on public.profile_roles;
create policy "roles are publicly readable"
  on public.profile_roles for select
  to public
  using (true);

drop policy if exists "users manage their own roles" on public.profile_roles;
create policy "users manage their own roles"
  on public.profile_roles for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = profile_roles.profile_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = profile_roles.profile_id
      and profiles.user_id = auth.uid()
  ));

drop policy if exists "boats are publicly readable" on public.profile_boats;
create policy "boats are publicly readable"
  on public.profile_boats for select
  to public
  using (true);

drop policy if exists "users manage their own boats" on public.profile_boats;
create policy "users manage their own boats"
  on public.profile_boats for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = profile_boats.profile_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = profile_boats.profile_id
      and profiles.user_id = auth.uid()
  ));

drop policy if exists "credentials are publicly readable" on public.profile_credentials;
create policy "credentials are publicly readable"
  on public.profile_credentials for select
  to public
  using (true);

drop policy if exists "users manage their own credentials" on public.profile_credentials;
create policy "users manage their own credentials"
  on public.profile_credentials for all
  to authenticated
  using (exists (
    select 1 from public.profiles
    where profiles.id = profile_credentials.profile_id
      and profiles.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.profiles
    where profiles.id = profile_credentials.profile_id
      and profiles.user_id = auth.uid()
  ));


-- ---- sails --------------------------------------------------------------
-- Two separate SELECT policies (Postgres OR's them together): the public can
-- see OPEN listings; a skipper can always see their own sail, open or closed.
-- Only the skipper who created a sail can edit it or change its status.
--
-- (A "requesters can read sails they've requested" policy was tried here and
-- removed — it caused infinite recursion between sails and sail_requests RLS
-- and broke Post a Sail. Do not re-add it without solving that.)

drop policy if exists "open sails are publicly readable" on public.sails;
create policy "open sails are publicly readable"
  on public.sails for select
  to public
  using (status = 'open');

drop policy if exists "skippers can read their own sails" on public.sails;
create policy "skippers can read their own sails"
  on public.sails for select
  to authenticated
  using (auth.uid() = skipper_user_id);

drop policy if exists "users can create sails as themselves" on public.sails;
create policy "users can create sails as themselves"
  on public.sails for insert
  to authenticated
  with check (auth.uid() = skipper_user_id);

drop policy if exists "skippers can edit or close their own sails" on public.sails;
create policy "skippers can edit or close their own sails"
  on public.sails for update
  to authenticated
  using (auth.uid() = skipper_user_id)
  with check (auth.uid() = skipper_user_id);


-- =============================================================================
-- 5. VALIDATION
-- Both are self-reported dates, not real-world lookups, so these only rule
-- out impossible values (before sailing existed, or a year that hasn't
-- happened yet) rather than trying to verify accuracy.
-- =============================================================================

alter table public.profiles drop constraint if exists profiles_sailing_since_check;
alter table public.profiles add constraint profiles_sailing_since_check
  check (sailing_since is null or sailing_since between 1900 and extract(year from now())::int);

alter table public.profile_credentials drop constraint if exists profile_credentials_year_check;
alter table public.profile_credentials add constraint profile_credentials_year_check
  check (year is null or year between 1900 and extract(year from now())::int);


-- =============================================================================
-- 6. GRANTS
-- RLS policies (section 4) decide which ROWS anon/authenticated can touch,
-- but only once a role already has base table access — without the grants
-- below, Postgres rejects the query before RLS is even evaluated ("42501
-- permission denied for table ..."), no matter what policies exist. A plain
-- CREATE TABLE run through the SQL Editor (how this file is run) does not
-- grant this automatically the way creating a table via the Table Editor
-- UI does, so it has to be done explicitly here. Each grant below matches
-- exactly what that table's policies above already allow — nothing broader.
-- =============================================================================

-- Usually already granted by default on a Supabase project; included here
-- only so a fresh project set up purely from this file doesn't depend on it.
grant usage on schema public to anon, authenticated;

-- profiles: publicly readable; only the owner can insert/update (matches
-- "profiles are publicly readable" / "users can create their own profile" /
-- "users can edit their own profile" — there is no delete policy, so no
-- delete grant here either).
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- profile_sailing_types, profile_roles, profile_boats, profile_credentials:
-- publicly readable; only the owning profile's user can insert/update/delete
-- (matches each table's "... are publicly readable" / "users manage their
-- own ..." policies).
grant select on public.profile_sailing_types, public.profile_roles, public.profile_boats, public.profile_credentials to anon, authenticated;
grant insert, update, delete on public.profile_sailing_types, public.profile_roles, public.profile_boats, public.profile_credentials to authenticated;

-- sails: publicly readable when open, plus a skipper can always read their own
-- (matches "open sails are publicly readable" / "skippers can read their own
-- sails"); only the skipper can insert/update their own (matches "users can
-- create sails as themselves" / "skippers can edit or close their own sails").
-- No delete grant — there is no delete policy, and sails are closed, not deleted.
grant select on public.sails to anon, authenticated;
grant insert, update on public.sails to authenticated;


-- =============================================================================
-- 7. CREW REQUESTS (Phase 3)
-- A crew request against a real, Supabase-backed sail. Never public — only
-- the requester and the sail's own skipper can ever see a given row. Demo
-- sails keep using loop.js's separate localStorage prototype; this table is
-- for real sails only.
-- =============================================================================

create table if not exists public.sail_requests (
  id                  uuid primary key default gen_random_uuid(),
  sail_id             uuid not null references public.sails (id) on delete cascade,
  requester_user_id   uuid not null references auth.users (id) on delete cascade,
  note                text,
  status              text not null default 'requested' check (status in ('requested', 'accepted', 'declined')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (sail_id, requester_user_id) -- one request per sailor per sail
);

-- No separate sail_id index: the unique constraint above already creates one
-- whose leading column is sail_id, which covers "requests for this sail"
-- lookups. This one covers "this user's requests" lookups instead.
create index if not exists sail_requests_requester_user_id_idx on public.sail_requests (requester_user_id);

drop trigger if exists set_updated_at on public.sail_requests;
create trigger set_updated_at
  before update on public.sail_requests
  for each row execute function public.set_updated_at();

-- A skipper's update policy (below) lets them update a request row at all,
-- but RLS is row-level, not column-level — nothing stops that same policy
-- from also being used to rewrite the note or reassign the request to a
-- different sail/requester. This pins every column except `status` (and the
-- auto-managed `updated_at`) to its existing value on every update, no
-- matter who's updating — the same defense-in-depth approach already used
-- for identity_verified above.
create or replace function public.protect_sail_request_fields()
returns trigger
language plpgsql
as $$
begin
  new.sail_id := old.sail_id;
  new.requester_user_id := old.requester_user_id;
  new.note := old.note;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists protect_sail_request_fields on public.sail_requests;
create trigger protect_sail_request_fields
  before update on public.sail_requests
  for each row execute function public.protect_sail_request_fields();

alter table public.sail_requests enable row level security;

-- Requester creates their own request — and only for a real, OPEN sail they
-- don't own, only with status 'requested' (a client could otherwise insert
-- straight in as 'accepted' — the column default only applies when the
-- client omits the field, not when it explicitly sends another value), and
-- only if they have a completed CURRENT profile. All of this is enforced
-- here, at the database layer — not just by what the UI happens to send.
drop policy if exists "requesters can create their own request" on public.sail_requests;
create policy "requesters can create their own request"
  on public.sail_requests for insert
  to authenticated
  with check (
    auth.uid() = requester_user_id
    and sail_requests.status = 'requested'
    and exists (
      select 1 from public.sails
      where sails.id = sail_requests.sail_id
        and sails.status = 'open'
        and sails.skipper_user_id <> auth.uid()
    )
    and exists (select 1 from public.profiles where profiles.user_id = auth.uid())
  );

-- Requester reads only their own request row.
drop policy if exists "requesters can read their own request" on public.sail_requests;
create policy "requesters can read their own request"
  on public.sail_requests for select
  to authenticated
  using (auth.uid() = requester_user_id);

-- Skipper reads every request against their own sail.
drop policy if exists "skippers can read requests for their own sails" on public.sail_requests;
create policy "skippers can read requests for their own sails"
  on public.sail_requests for select
  to authenticated
  using (exists (
    select 1 from public.sails
    where sails.id = sail_requests.sail_id
      and sails.skipper_user_id = auth.uid()
  ));

-- Skipper updates (status only, enforced by the trigger above) requests
-- against their own sail. There is deliberately no update policy for the
-- requester at all — not a restricted one, none — so RLS's default-deny
-- means a requester can never change a request's status, full stop.
drop policy if exists "skippers can update requests for their own sails" on public.sail_requests;
create policy "skippers can update requests for their own sails"
  on public.sail_requests for update
  to authenticated
  using (exists (
    select 1 from public.sails
    where sails.id = sail_requests.sail_id
      and sails.skipper_user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.sails
    where sails.id = sail_requests.sail_id
      and sails.skipper_user_id = auth.uid()
  ));

-- No anon grant — requests are never public. No delete grant — there is no
-- delete policy, and closing a sail never deletes its requests.
grant select, insert, update on public.sail_requests to authenticated;


-- =============================================================================
-- 8. PERMANENT SAILING HISTORY (Phase 4)
--
-- Product principle: sail_requests is temporary workflow data (a request gets
-- accepted or declined and that's the end of its story). This section adds
-- the PERMANENT record: once a request is accepted, a sail_participations
-- row is created to represent "these two people were connected through this
-- sail and may confirm they actually sailed together." Once BOTH confirm, it
-- becomes real, public, permanent trust history — confirmed sails, sailed
-- with, repeat connections, recent sailing — calculated at read time, never
-- stored as counters.
--
-- Every field sail_participations needs to render or gate itself is
-- snapshotted onto the row at creation time (title/boat/location/date/time/
-- timezone) rather than joined live from `sails`. This is deliberate, not
-- redundant: a non-skipper party has no RLS path to read a `sails` row once
-- it's closed, and a public profile viewer (neither party at all) never has
-- one — so a live join would silently break history the moment a sail is
-- closed, which directly contradicts "permanent." Snapshotting makes this
-- table fully self-contained, which is also what keeps its RLS free of any
-- reference to `sails` or `sail_requests` at all (see the recursion note at
-- the end of this section).
-- =============================================================================

-- Every sail needs a timezone for "has this sail happened yet" to mean
-- anything precise. Bay Area sails default here; nothing in this schema
-- limits CURRENT to one timezone going forward — there's just no picker UI
-- for it yet (Post a Sail doesn't ask, so every new sail gets the default).
alter table public.sails
  add column if not exists timezone text not null default 'America/Los_Angeles';
alter table public.sails
  drop constraint if exists sails_timezone_not_blank;
alter table public.sails
  add constraint sails_timezone_not_blank check (length(timezone) > 0);

-- ---- factual, permanent history ---------------------------------------------
-- Contains ONLY safe, factual fields — no private response data at all (see
-- sail_participation_responses below) — so "confirmed rows are public" can be
-- a plain, obviously-safe policy with nothing to leak.
create table if not exists public.sail_participations (
  id                    uuid primary key default gen_random_uuid(),
  sail_id               uuid references public.sails (id) on delete set null,
  skipper_user_id       uuid not null references auth.users (id) on delete cascade,
  crew_user_id          uuid not null references auth.users (id) on delete cascade,
  sail_title            text not null,
  sail_boat             text not null,
  sail_location         text not null,
  sail_date             date not null,
  sail_start_time       time not null,
  sail_timezone         text not null,
  skipper_confirmed     boolean not null default false,
  crew_confirmed        boolean not null default false,
  skipper_confirmed_at  timestamptz,
  crew_confirmed_at     timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (sail_id, crew_user_id)
);

create index if not exists sail_participations_crew_user_id_idx    on public.sail_participations (crew_user_id);
create index if not exists sail_participations_skipper_user_id_idx on public.sail_participations (skipper_user_id);

drop trigger if exists set_updated_at on public.sail_participations;
create trigger set_updated_at
  before update on public.sail_participations
  for each row execute function public.set_updated_at();

-- ---- private, directional responses -----------------------------------------
-- One row PER RESPONDER, not per participation — so "can I read the other
-- person's answer" isn't a policy condition to get right, it's structurally
-- impossible: their answer is a different row belonging to a different
-- responder_user_id that this policy will never match. Never public, ever.
create table if not exists public.sail_participation_responses (
  id                 uuid primary key default gen_random_uuid(),
  participation_id   uuid not null references public.sail_participations (id) on delete cascade,
  responder_user_id  uuid not null references auth.users (id) on delete cascade,
  would_sail_again   text not null check (would_sail_again in ('yes', 'not_sure')),
  created_at         timestamptz not null default now(),
  unique (participation_id, responder_user_id)
);

-- ---- creating a participation: only ever a reaction to a real accept -------
-- security definer so it can read `sails` (bypassing RLS — not a policy, so
-- this cannot participate in an RLS recursion cycle) and write
-- sail_participations regardless of the accepting skipper's own grants.
-- authenticated has NO insert grant on sail_participations at all (below) —
-- this function is the only door.
create or replace function public.create_sail_participation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sail_row public.sails;
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    select * into sail_row from public.sails where id = new.sail_id;
    if sail_row.id is not null then
      insert into public.sail_participations
        (sail_id, skipper_user_id, crew_user_id, sail_title, sail_boat, sail_location, sail_date, sail_start_time, sail_timezone)
      values
        (sail_row.id, sail_row.skipper_user_id, new.requester_user_id, sail_row.title, sail_row.boat, sail_row.location, sail_row.sail_date, sail_row.start_time, sail_row.timezone)
      on conflict (sail_id, crew_user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

-- Belt-and-suspenders: Postgres blocks calling a trigger-returning function
-- directly anyway ("trigger functions can only be called as triggers"), and
-- firing a trigger never checks EXECUTE privilege on its function — but
-- CREATE FUNCTION grants EXECUTE to PUBLIC by default, and this phase isn't
-- relying on default privileges for anything else, so this shouldn't either.
revoke all on function public.create_sail_participation() from public;

drop trigger if exists create_sail_participation on public.sail_requests;
create trigger create_sail_participation
  after update on public.sail_requests
  for each row execute function public.create_sail_participation();

-- ---- confirming: one atomic, server-authored RPC ---------------------------
-- The browser supplies only participation_id and would_sail_again. Identity
-- comes from auth.uid(); confirmed_at is always now(); which side gets
-- updated is decided here, never by a client-supplied flag. authenticated has
-- NO update grant on sail_participations or insert grant on
-- sail_participation_responses at all — this function is the only door, so
-- there is no direct-write path left for a protective trigger to guard.
create or replace function public.confirm_sail_participation(
  p_participation_id uuid,
  p_would_sail_again text
) returns public.sail_participations
language plpgsql
security definer
set search_path = public
as $$
declare
  part public.sail_participations;
  sail_happens_at timestamptz;
begin
  if p_would_sail_again is null then
    raise exception 'Choose whether you would sail together again.' using errcode = '22004';
  elsif p_would_sail_again not in ('yes', 'not_sure') then
    raise exception 'Invalid would_sail_again value.' using errcode = '22023';
  end if;

  select * into part from public.sail_participations where id = p_participation_id;
  if part.id is null then
    raise exception 'Participation not found.' using errcode = 'P0002';
  end if;

  if auth.uid() <> part.skipper_user_id and auth.uid() <> part.crew_user_id then
    raise exception 'Not authorized to confirm this sail.' using errcode = '42501';
  end if;

  sail_happens_at := (part.sail_date + part.sail_start_time) at time zone part.sail_timezone;
  if sail_happens_at > now() then
    raise exception 'This sail has not happened yet.' using errcode = 'P0001';
  end if;

  if auth.uid() = part.crew_user_id then
    if part.crew_confirmed then
      raise exception 'You have already confirmed this sail.' using errcode = 'P0001';
    end if;
    update public.sail_participations set crew_confirmed = true, crew_confirmed_at = now()
      where id = p_participation_id returning * into part;
  else
    if part.skipper_confirmed then
      raise exception 'You have already confirmed this sail.' using errcode = 'P0001';
    end if;
    update public.sail_participations set skipper_confirmed = true, skipper_confirmed_at = now()
      where id = p_participation_id returning * into part;
  end if;

  insert into public.sail_participation_responses (participation_id, responder_user_id, would_sail_again)
  values (p_participation_id, auth.uid(), p_would_sail_again)
  on conflict (participation_id, responder_user_id) do nothing;

  return part;
end;
$$;

-- Explicit, not assumed: revoke the default PUBLIC execute grant before
-- granting only to authenticated. anon has no reason to ever call this.
revoke all on function public.confirm_sail_participation(uuid, text) from public;
revoke all on function public.confirm_sail_participation(uuid, text) from anon;
grant execute on function public.confirm_sail_participation(uuid, text) to authenticated;

-- ---- RLS ---------------------------------------------------------------------
alter table public.sail_participations enable row level security;
alter table public.sail_participation_responses enable row level security;

drop policy if exists "parties can read their own participation" on public.sail_participations;
create policy "parties can read their own participation"
  on public.sail_participations for select
  to authenticated
  using (auth.uid() = skipper_user_id or auth.uid() = crew_user_id);

-- Self-contained condition — no join to sails or sail_requests — so this can
-- never participate in an RLS recursion cycle with either of those tables.
drop policy if exists "confirmed participations are publicly readable" on public.sail_participations;
create policy "confirmed participations are publicly readable"
  on public.sail_participations for select
  to public
  using (skipper_confirmed = true and crew_confirmed = true);

drop policy if exists "responder can read their own response" on public.sail_participation_responses;
create policy "responder can read their own response"
  on public.sail_participation_responses for select
  to authenticated
  using (auth.uid() = responder_user_id);

-- No update/insert policy on either table: authenticated has no update or
-- insert grant on them at all (below), so there is nothing such a policy
-- would authorize. The only writers are the two security-definer functions
-- above, which bypass RLS by design.

-- ---- GRANTs --------------------------------------------------------------
-- Factual history: publicly readable once confirmed (anon needed for that
-- public policy to apply at all). No insert/update/delete grant to anyone —
-- writes only happen through the security-definer functions above.
grant select on public.sail_participations to anon, authenticated;

-- Private responses: never public, no anon grant. No insert/update grant —
-- the confirmation RPC is the only writer.
grant select on public.sail_participation_responses to authenticated;

-- ---- one-time backfill for requests accepted before this table existed ----
-- Safe to re-run: matches the exact same snapshot the trigger above takes,
-- and ON CONFLICT DO NOTHING means an already-backfilled (or since normally
-- created) row is left untouched, never duplicated. Does not touch
-- sail_requests.status. Every snapshotted column here is NOT NULL on `sails`
-- already (title/boat/location/sail_date/start_time) or was just backfilled
-- with a default by the ALTER TABLE above (timezone) — so this can't fail on
-- an unexpectedly null source column.
insert into public.sail_participations
  (sail_id, skipper_user_id, crew_user_id, sail_title, sail_boat, sail_location, sail_date, sail_start_time, sail_timezone)
select
  sr.sail_id, s.skipper_user_id, sr.requester_user_id,
  s.title, s.boat, s.location, s.sail_date, s.start_time, s.timezone
from public.sail_requests sr
join public.sails s on s.id = sr.sail_id
where sr.status = 'accepted'
on conflict (sail_id, crew_user_id) do nothing;

-- ---- recursion note ----------------------------------------------------------
-- sails: self-contained. sail_requests: references sails only (one
-- direction, already proven safe). sail_participations and
-- sail_participation_responses: reference nothing in any policy — every
-- USING/WITH CHECK clause here reads only the row's own columns. The two
-- places `sails` IS read (the creation trigger, the confirm RPC) are both
-- security definer, which bypasses RLS rather than participating in it, so
-- neither can form a policy-to-policy cycle with sails or sail_requests.


-- =============================================================================
-- 9. PHOTOS (Phase 5)
-- Two public Storage buckets — public because a profile's / open sail's own
-- database row is already intentionally public in this app, so gating the
-- image file behind a signed URL would add complexity without any real
-- privacy gain. Every upload is client-side resized and re-encoded to JPEG
-- before it ever reaches Storage, so bucket-level MIME/size limits below are
-- a real server-side backstop, not just a client-side nicety.
-- =============================================================================

alter table public.sails add column if not exists photo_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 3145728, array['image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sail-photos', 'sail-photos', true, 4194304, array['image/jpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- profile-photos/<user_id>/profile.jpg — fixed filename, so "replace" is just
-- "upload again" (upsert) with no orphaned old-extension file left behind.
-- Ownership only ever depends on auth.uid(), never on a profiles row
-- existing, so this never has the "row doesn't exist yet" problem sail
-- photos do (see below). The policy matches the object's full `name` against
-- that exact path (not just its folder) so a client bypassing the frontend
-- cannot write any other filename inside a user's own folder.
drop policy if exists "profile photos are publicly readable" on storage.objects;
create policy "profile photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'profile-photos');

drop policy if exists "users manage their own profile photo" on storage.objects;
create policy "users manage their own profile photo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'profile-photos' and name = auth.uid()::text || '/profile.jpg')
  with check (bucket_id = 'profile-photos' and name = auth.uid()::text || '/profile.jpg');

-- sail-photos/<sail_id>/cover.jpg — ownership is verified by joining back to
-- sails, which means a brand-new sail's photo can only ever be uploaded
-- AFTER that sail row exists (enforced client-side in post-sail.js: insert
-- the sail first, then upload using the real id). One direction only
-- (sail-photos -> sails); sails' own policies never reference storage.objects,
-- so this can't form an RLS recursion cycle, same shape as sail_requests -> sails.
-- As with profile photos, `name` is matched against the exact expected path
-- (sail id + '/cover.jpg'), not just its folder, so a client bypassing the
-- frontend cannot write any other filename inside a sail's own folder.
drop policy if exists "sail photos are publicly readable" on storage.objects;
create policy "sail photos are publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'sail-photos');

drop policy if exists "skippers manage their own sail photo" on storage.objects;
create policy "skippers manage their own sail photo"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'sail-photos' and exists (
    select 1 from public.sails
    where name = sails.id::text || '/cover.jpg'
      and sails.skipper_user_id = auth.uid()
  ))
  with check (bucket_id = 'sail-photos' and exists (
    select 1 from public.sails
    where name = sails.id::text || '/cover.jpg'
      and sails.skipper_user_id = auth.uid()
  ));
