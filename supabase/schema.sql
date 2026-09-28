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
