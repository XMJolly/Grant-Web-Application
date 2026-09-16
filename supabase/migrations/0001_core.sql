-- =============================================================================
-- Vouch — Milestone 1 core schema
-- Tenant boundary, membership + roles, private documents, page text, audit log.
--
-- Design rules enforced here (from the project handoff, §13 Security & Privacy):
--   1. Every tenant-owned row carries organization_id.
--   2. Row-level security is ON for every table, with no permissive fallback.
--   3. Membership checks run through SECURITY DEFINER helpers so that policies
--      on organization_members cannot recurse into themselves.
--   4. Volunteers cannot read documents categorised as financial or personnel.
--   5. Nothing is granted to the `anon` role. Signed-out callers see nothing.
-- =============================================================================

-- gen_random_uuid() is built into PostgreSQL 13+, so no extension is required.

-- -----------------------------------------------------------------------------
-- Helper schema. Kept out of `public` so it is not exposed through PostgREST.
-- -----------------------------------------------------------------------------
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type app.org_role as enum ('admin', 'staff', 'reviewer', 'volunteer');

create type app.document_category as enum (
  'determination_letter',   -- IRS 501(c)(3) letter
  'annual_report',
  'budget',                 -- sensitive
  'financial_statement',    -- sensitive
  'board_list',             -- sensitive (personnel)
  'staff_record',           -- sensitive (personnel)
  'policy',
  'program_description',
  'past_application',
  'registration',           -- eMMA / SAM / state good standing
  'other'
);

create type app.document_status as enum (
  'uploaded',     -- bytes stored, not yet parsed
  'parsing',
  'parsed',       -- text layer extracted into document_pages
  'no_text_layer',-- scanned image PDF: readable by a human, not by the parser
  'failed',
  'archived'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.organizations (
  id                   uuid primary key default gen_random_uuid(),
  legal_name           text not null check (length(btrim(legal_name)) between 2 and 200),
  ein                  text check (ein ~ '^[0-9]{2}-[0-9]{7}$'),
  mission              text check (length(mission) <= 4000),
  founded_year         integer check (founded_year between 1800 and 2100),
  tax_exempt_status    text check (tax_exempt_status in (
                         '501c3', '501c4', '501c6', 'fiscally_sponsored',
                         'government', 'other', 'none', 'unknown')),
  annual_budget_usd    numeric(14, 2) check (annual_budget_usd >= 0),
  annual_budget_fy     integer check (annual_budget_fy between 1800 and 2100),
  service_area_state   text check (length(service_area_state) = 2),
  service_area_counties text[] not null default '{}',
  website              text check (website is null or website ~* '^https?://'),
  emma_registered      boolean,
  state_good_standing  boolean,
  created_by           uuid not null references auth.users (id) on delete restrict,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on column public.organizations.emma_registered is
  'Registered in Maryland eMMA. A hard eligibility gate on many MD state RFAs.';

create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            app.org_role not null default 'staff',
  invited_by      uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx  on public.organization_members (organization_id);

create table public.documents (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  storage_path        text not null unique,
  file_name           text not null check (length(file_name) between 1 and 300),
  mime_type           text not null,
  byte_size           bigint not null check (byte_size > 0 and byte_size <= 26214400), -- 25 MiB
  sha256              text check (sha256 ~ '^[0-9a-f]{64}$'),
  category            app.document_category not null default 'other',
  -- Denormalised so that policies can filter without a join. Kept in sync by trigger.
  is_sensitive        boolean not null default false,
  status              app.document_status not null default 'uploaded',
  has_text_layer      boolean,
  page_count          integer check (page_count >= 0),
  extracted_char_count integer check (extracted_char_count >= 0),
  failure_reason      text,
  uploaded_by         uuid not null references auth.users (id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index documents_org_idx on public.documents (organization_id, created_at desc);

-- The storage path must start with the owning organization's id. Storage policies
-- rely on this, so the database refuses any row that would break the convention.
alter table public.documents
  add constraint documents_storage_path_is_tenant_scoped
  check (storage_path like (organization_id::text || '/%'));

create table public.document_pages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  document_id     uuid not null references public.documents (id) on delete cascade,
  page_number     integer not null check (page_number >= 1),
  page_label      text not null,          -- 'Page 4', 'Part 2 of 9'
  content         text not null,
  is_sensitive    boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (document_id, page_number)
);

create index document_pages_doc_idx on public.document_pages (document_id, page_number);

comment on table public.document_pages is
  'Per-page extracted text. This is the citable unit: AnswerEvidence will point '
  'at a document_page id or a verified_fact id, never at free text.';

create table public.audit_events (
  id              bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id   uuid references auth.users (id) on delete set null,
  action          text not null,   -- 'document.uploaded', 'member.role_changed'
  entity_type     text not null,   -- 'document', 'organization_member'
  entity_id       text,
  summary         text,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index audit_events_org_idx on public.audit_events (organization_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Membership helpers
--
-- SECURITY DEFINER + empty search_path. These run as the table owner, so a policy
-- on organization_members can call them without re-entering its own policy.
-- -----------------------------------------------------------------------------

create or replace function app.is_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function app.has_role(org uuid, allowed app.org_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.role = any (allowed)
  );
$$;

create or replace function app.role_in(org uuid)
returns app.org_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = org
    and m.user_id = (select auth.uid());
$$;

-- Casts the first path segment of a storage object name to uuid, or null.
create or replace function app.safe_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  return value::uuid;
exception when others then
  return null;
end;
$$;

revoke all on function app.is_member(uuid)                 from public;
revoke all on function app.has_role(uuid, app.org_role[])  from public;
revoke all on function app.role_in(uuid)                   from public;
revoke all on function app.safe_uuid(text)                 from public;
grant execute on function app.is_member(uuid)                to authenticated, service_role;
grant execute on function app.has_role(uuid, app.org_role[]) to authenticated, service_role;
grant execute on function app.role_in(uuid)                  to authenticated, service_role;
grant execute on function app.safe_uuid(text)                to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create or replace function app.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_touch        before update on public.organizations
  for each row execute function app.touch_updated_at();
create trigger organization_members_touch before update on public.organization_members
  for each row execute function app.touch_updated_at();
create trigger documents_touch            before update on public.documents
  for each row execute function app.touch_updated_at();

-- Whoever creates an organization becomes its first administrator. Runs as
-- definer so it is not blocked by the insert policy on organization_members.
create or replace function app.bootstrap_org_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.created_by, 'admin')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

create trigger organizations_bootstrap_admin after insert on public.organizations
  for each row execute function app.bootstrap_org_admin();

-- Sensitivity is derived from category, never set by the client.
create or replace function app.set_document_sensitivity()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.is_sensitive := new.category in (
    'budget', 'financial_statement', 'board_list', 'staff_record'
  );
  return new;
end;
$$;

create trigger documents_set_sensitivity before insert or update of category on public.documents
  for each row execute function app.set_document_sensitivity();

-- Pages inherit their document's tenant and sensitivity. Prevents a page row
-- from ever pointing at a different organization than its parent document.
create or replace function app.inherit_page_from_document()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.documents%rowtype;
begin
  select * into parent from public.documents d where d.id = new.document_id;
  if not found then
    raise exception 'document % does not exist', new.document_id;
  end if;
  new.organization_id := parent.organization_id;
  new.is_sensitive    := parent.is_sensitive;
  return new;
end;
$$;

create trigger document_pages_inherit before insert or update on public.document_pages
  for each row execute function app.inherit_page_from_document();

-- Keep page sensitivity in step if a document is recategorised.
create or replace function app.cascade_document_sensitivity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_sensitive is distinct from old.is_sensitive then
    update public.document_pages set is_sensitive = new.is_sensitive
    where document_id = new.id;
  end if;
  return new;
end;
$$;

create trigger documents_cascade_sensitivity after update of is_sensitive on public.documents
  for each row execute function app.cascade_document_sensitivity();

-- =============================================================================
-- Row-level security
-- =============================================================================

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.documents            enable row level security;
alter table public.document_pages       enable row level security;
alter table public.audit_events         enable row level security;

-- Note on FORCE ROW LEVEL SECURITY, deliberately NOT used here.
--
-- FORCE makes the table owner subject to its own policies. That sounds strictly
-- safer, and it breaks this schema: the SECURITY DEFINER helpers below run as
-- the table owner, and the policies are written `to authenticated`, so under
-- FORCE no policy would match and app.is_member() would return false for
-- everybody. The same applies to the trigger that copies a document's tenant
-- onto its pages.
--
-- This is easy to get wrong, because on a local Postgres the owner is usually a
-- superuser and superusers bypass RLS regardless — so FORCE appears to work in
-- testing and denies every request in production. Nothing runs as the owner
-- except migrations and the definer functions listed below, each of which is
-- audited, so ordinary ENABLE is the correct setting.

-- ---- organizations ----------------------------------------------------------
create policy organizations_select on public.organizations
  for select to authenticated
  using (app.is_member(id));

create policy organizations_insert on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy organizations_update on public.organizations
  for update to authenticated
  using (app.has_role(id, array['admin']::app.org_role[]))
  with check (app.has_role(id, array['admin']::app.org_role[]));

-- No delete policy: organizations are not deletable through the API. Deletion is
-- a retention decision that goes through a reviewed server-side path.

-- ---- organization_members ---------------------------------------------------
create policy organization_members_select on public.organization_members
  for select to authenticated
  using (app.is_member(organization_id));

create policy organization_members_insert on public.organization_members
  for insert to authenticated
  with check (app.has_role(organization_id, array['admin']::app.org_role[]));

create policy organization_members_update on public.organization_members
  for update to authenticated
  using (app.has_role(organization_id, array['admin']::app.org_role[]))
  with check (app.has_role(organization_id, array['admin']::app.org_role[]));

create policy organization_members_delete on public.organization_members
  for delete to authenticated
  using (app.has_role(organization_id, array['admin']::app.org_role[]));

-- ---- documents --------------------------------------------------------------
create policy documents_select on public.documents
  for select to authenticated
  using (
    app.is_member(organization_id)
    and (not is_sensitive or app.role_in(organization_id) <> 'volunteer')
  );

create policy documents_insert on public.documents
  for insert to authenticated
  with check (
    app.has_role(organization_id, array['admin', 'staff']::app.org_role[])
    and uploaded_by = (select auth.uid())
  );

create policy documents_update on public.documents
  for update to authenticated
  using (app.has_role(organization_id, array['admin', 'staff']::app.org_role[]))
  with check (app.has_role(organization_id, array['admin', 'staff']::app.org_role[]));

create policy documents_delete on public.documents
  for delete to authenticated
  using (app.has_role(organization_id, array['admin']::app.org_role[]));

-- ---- document_pages ---------------------------------------------------------
-- Read-only to clients. Pages are written by the parser through the service role.
create policy document_pages_select on public.document_pages
  for select to authenticated
  using (
    app.is_member(organization_id)
    and (not is_sensitive or app.role_in(organization_id) <> 'volunteer')
  );

-- ---- audit_events -----------------------------------------------------------
create policy audit_events_select on public.audit_events
  for select to authenticated
  using (app.has_role(organization_id, array['admin', 'reviewer']::app.org_role[]));

-- Append-only: no update or delete policy exists, for any role.

-- =============================================================================
-- Grants. `anon` gets nothing anywhere.
-- =============================================================================
revoke all on all tables in schema public from anon;

grant select, insert, update          on public.organizations        to authenticated;
grant select, insert, update, delete  on public.organization_members to authenticated;
grant select, insert, update, delete  on public.documents            to authenticated;
grant select                          on public.document_pages       to authenticated;
grant select                          on public.audit_events         to authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
