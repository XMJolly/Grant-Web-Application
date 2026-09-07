-- =============================================================================
-- Local-only stub of the parts of Supabase that the migrations depend on.
-- This file is NEVER applied to a real Supabase project — Supabase already
-- provides auth.uid(), the auth.users table, the storage schema and the
-- anon / authenticated / service_role roles.
--
-- It exists so the RLS policies can be executed and tested on a plain Postgres
-- before they are trusted with anyone's documents.
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Matches the real Supabase definition.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid;
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets (id),
  name      text not null,
  owner     uuid
);

alter table storage.objects enable row level security;
grant select on storage.objects to authenticated;

-- ---------------------------------------------------------------------------
-- Migrations are applied by a NON-SUPERUSER owner, matching Supabase.
--
-- This is the whole point of the stub. A superuser bypasses row-level security
-- unconditionally, so running the migrations as one would let a broken policy
-- or a mis-scoped SECURITY DEFINER function pass the test suite and then fail
-- in production. `gp_owner` has exactly the privileges Supabase's `postgres`
-- role has, and no more.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'gp_owner') then
    create role gp_owner nologin noinherit nosuperuser nobypassrls;
  end if;
end $$;

grant create, usage on schema public to gp_owner;
select format('grant create on database %I to gp_owner', current_database()) \gexec
grant usage on schema auth to gp_owner;
grant usage, create on schema storage to gp_owner;
grant references, select on auth.users to gp_owner;
grant insert, update, select on storage.buckets to gp_owner;
grant gp_owner to current_user;
alter table storage.objects owner to gp_owner;
alter table storage.buckets owner to gp_owner;

set role gp_owner;
