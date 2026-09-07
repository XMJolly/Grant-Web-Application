-- =============================================================================
-- GrantPath — tenant isolation test suite
--
-- The exit condition for Milestone 1. Two organizations, four users, and a list
-- of things that must be impossible. Every check raises on failure, so the whole
-- script fails under `psql -v ON_ERROR_STOP=1`.
--
-- Run with:  npm run test:rls
-- =============================================================================

\set ON_ERROR_STOP on

-- -----------------------------------------------------------------------------
-- Assertion helpers
-- -----------------------------------------------------------------------------
create or replace function pg_temp.check_eq(label text, actual bigint, expected bigint)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL  %  (expected %, got %)', label, expected, actual;
  end if;
  raise notice 'pass  %', label;
end $$;

create or replace function pg_temp.check_true(label text, actual boolean)
returns void language plpgsql as $$
begin
  if actual is not true then
    raise exception 'FAIL  %  (expected true)', label;
  end if;
  raise notice 'pass  %', label;
end $$;

-- Runs a statement and asserts it is rejected. Used for every "must be
-- impossible" case, so a policy that silently permits something fails loudly.
create or replace function pg_temp.check_denied(label text, stmt text)
returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception
    when insufficient_privilege or check_violation then
      raise notice 'pass  %  (%)', label, sqlerrm;
      return;
    when others then
      raise exception 'FAIL  %  — rejected, but for the wrong reason: % (%)',
        label, sqlerrm, sqlstate;
  end;
  raise exception 'FAIL  %  — the statement was ALLOWED', label;
end $$;

-- Asserts an UPDATE/DELETE matched no rows. RLS filters rather than errors for
-- these, so "denied" looks like "zero rows affected".
create or replace function pg_temp.check_no_rows(label text, stmt text)
returns void language plpgsql as $$
declare n integer;
begin
  execute stmt;
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL  %  — % row(s) were modified', label, n;
  end if;
  raise notice 'pass  %', label;
end $$;

-- =============================================================================
-- Fixtures.
--
-- `reset role` drops back from gp_owner to the superuser running the script,
-- which stands in for Supabase's service_role (the only identity in the real
-- system that bypasses RLS). Everything after the fixtures runs as a genuine
-- `authenticated` or `anon` caller.
-- =============================================================================
reset role;
\set alice   '''00000000-0000-0000-0000-0000000000a1'''
\set bob     '''00000000-0000-0000-0000-0000000000b2'''
\set carol   '''00000000-0000-0000-0000-0000000000c3'''
\set dan     '''00000000-0000-0000-0000-0000000000d4'''
\set org_a   '''00000000-0000-0000-0000-00000000aaaa'''
\set org_b   '''00000000-0000-0000-0000-00000000bbbb'''

insert into auth.users (id, email) values
  (:alice, 'alice@jollydream.example'),   -- admin,     Org A
  (:bob,   'bob@jollydream.example'),     -- staff,     Org A
  (:dan,   'dan@jollydream.example'),     -- volunteer, Org A
  (:carol, 'carol@othernonprofit.example');-- admin,    Org B

insert into public.organizations (id, legal_name, service_area_state, created_by) values
  (:org_a, 'Jolly Dream Foundation', 'MD', :alice),
  (:org_b, 'Unrelated Nonprofit Inc', 'MD', :carol);

-- The bootstrap trigger has already made alice and carol admins of their orgs.
insert into public.organization_members (organization_id, user_id, role) values
  (:org_a, :bob, 'staff'),
  (:org_a, :dan, 'volunteer');

insert into public.documents
  (id, organization_id, storage_path, file_name, mime_type, byte_size, category, uploaded_by)
values
  ('00000000-0000-0000-0000-00000000d0c1',
   :org_a, '00000000-0000-0000-0000-00000000aaaa/d0c1/programs.pdf',
   'programs.pdf', 'application/pdf', 120000, 'program_description', :alice),
  ('00000000-0000-0000-0000-00000000d0c2',
   :org_a, '00000000-0000-0000-0000-00000000aaaa/d0c2/fy26-budget.pdf',
   'fy26-budget.pdf', 'application/pdf', 90000, 'budget', :alice),
  ('00000000-0000-0000-0000-00000000d0c3',
   :org_b, '00000000-0000-0000-0000-00000000bbbb/d0c3/private.pdf',
   'private.pdf', 'application/pdf', 50000, 'program_description', :carol);

insert into public.document_pages (document_id, page_number, page_label, content) values
  ('00000000-0000-0000-0000-00000000d0c1', 1, 'Page 1', 'We serve Charles County, Maryland.'),
  ('00000000-0000-0000-0000-00000000d0c2', 1, 'Page 1', 'FY26 operating budget: $412,000.'),
  ('00000000-0000-0000-0000-00000000d0c3', 1, 'Page 1', 'Confidential to Org B.');

insert into public.audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
values (:org_a, :alice, 'document.uploaded', 'document', '00000000-0000-0000-0000-00000000d0c1');

insert into storage.objects (bucket_id, name) values
  ('org-documents', '00000000-0000-0000-0000-00000000aaaa/d0c1/programs.pdf'),
  ('org-documents', '00000000-0000-0000-0000-00000000aaaa/d0c2/fy26-budget.pdf'),
  ('org-documents', '00000000-0000-0000-0000-00000000bbbb/d0c3/private.pdf');

\echo ''
\echo '=== 1. Bootstrap ==========================================================='

select pg_temp.check_eq(
  'creating an organization makes the creator an admin',
  (select count(*) from public.organization_members
    where organization_id = :org_a and user_id = :alice and role = 'admin'), 1);

\echo ''
\echo '=== 2. Org A admin (alice) ================================================='
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';

select pg_temp.check_eq('alice sees exactly one organization',
  (select count(*) from public.organizations), 1);
select pg_temp.check_eq('alice cannot see Org B',
  (select count(*) from public.organizations where id = :org_b), 0);
select pg_temp.check_eq('alice sees both Org A documents',
  (select count(*) from public.documents), 2);
select pg_temp.check_eq('alice cannot see Org B documents',
  (select count(*) from public.documents where organization_id = :org_b), 0);
select pg_temp.check_eq('alice cannot see Org B pages',
  (select count(*) from public.document_pages where organization_id = :org_b), 0);
select pg_temp.check_eq('alice sees all three Org A members',
  (select count(*) from public.organization_members), 3);
select pg_temp.check_eq('alice reads the Org A audit log',
  (select count(*) from public.audit_events), 1);
select pg_temp.check_eq('alice reads Org A storage objects only',
  (select count(*) from storage.objects), 2);

select pg_temp.check_no_rows('alice cannot rename Org B',
  format('update public.organizations set legal_name = ''Hijacked'' where id = %L', :org_b));

select pg_temp.check_denied('alice cannot plant a document in Org B', format($sql$
  insert into public.documents
    (organization_id, storage_path, file_name, mime_type, byte_size, uploaded_by)
  values (%L, %L, 'evil.pdf', 'application/pdf', 100, %L)
$sql$, :org_b, '00000000-0000-0000-0000-00000000bbbb/evil/evil.pdf', :alice));

select pg_temp.check_denied('alice cannot upload as another user', format($sql$
  insert into public.documents
    (organization_id, storage_path, file_name, mime_type, byte_size, uploaded_by)
  values (%L, %L, 'spoof.pdf', 'application/pdf', 100, %L)
$sql$, :org_a, '00000000-0000-0000-0000-00000000aaaa/spoof/spoof.pdf', :carol));

select pg_temp.check_denied('storage paths must be prefixed with the org id', format($sql$
  insert into public.documents
    (organization_id, storage_path, file_name, mime_type, byte_size, uploaded_by)
  values (%L, 'loose/path.pdf', 'p.pdf', 'application/pdf', 100, %L)
$sql$, :org_a, :alice));

select pg_temp.check_denied('clients cannot write extracted page text', $sql$
  insert into public.document_pages (document_id, page_number, page_label, content)
  values ('00000000-0000-0000-0000-00000000d0c1', 99, 'Page 99', 'injected')
$sql$);

select pg_temp.check_denied('the audit log cannot be rewritten', $sql$
  update public.audit_events set action = 'nothing.happened'
$sql$);

select pg_temp.check_denied('the audit log cannot be erased', $sql$
  delete from public.audit_events
$sql$);

\echo ''
\echo '=== 3. Org A staff (bob) ==================================================='
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000b2';

select pg_temp.check_eq('bob sees both Org A documents',
  (select count(*) from public.documents), 2);

insert into public.documents
  (organization_id, storage_path, file_name, mime_type, byte_size, category, uploaded_by)
values (:org_a, '00000000-0000-0000-0000-00000000aaaa/d0c4/report.pdf',
        'report.pdf', 'application/pdf', 7000, 'annual_report', :bob);
select pg_temp.check_true('staff may upload documents', true);

select pg_temp.check_denied('staff cannot appoint members', format($sql$
  insert into public.organization_members (organization_id, user_id, role)
  values (%L, %L, 'admin')
$sql$, :org_a, :carol));

select pg_temp.check_no_rows('staff cannot change roles',
  format('update public.organization_members set role = ''admin'' where user_id = %L', :bob));

select pg_temp.check_no_rows('staff cannot delete documents',
  'delete from public.documents');

select pg_temp.check_eq('staff cannot read the audit log',
  (select count(*) from public.audit_events), 0);

\echo ''
\echo '=== 4. Org A volunteer (dan) ==============================================='
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000d4';

select pg_temp.check_eq('volunteer sees non-sensitive documents only',
  (select count(*) from public.documents), 2);   -- programs.pdf + report.pdf
select pg_temp.check_eq('volunteer cannot see the budget',
  (select count(*) from public.documents where category = 'budget'), 0);
select pg_temp.check_eq('volunteer cannot read budget page text',
  (select count(*) from public.document_pages where content like '%412,000%'), 0);
select pg_temp.check_eq('volunteer cannot read the budget file object',
  (select count(*) from storage.objects where name like '%fy26-budget%'), 0);
select pg_temp.check_eq('volunteer can still read programme page text',
  (select count(*) from public.document_pages where content like '%Charles County%'), 1);

select pg_temp.check_denied('volunteer cannot upload', format($sql$
  insert into public.documents
    (organization_id, storage_path, file_name, mime_type, byte_size, uploaded_by)
  values (%L, %L, 'v.pdf', 'application/pdf', 100, %L)
$sql$, :org_a, '00000000-0000-0000-0000-00000000aaaa/v/v.pdf', :dan));

\echo ''
\echo '=== 5. Org B admin (carol) ================================================='
set request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c3';

select pg_temp.check_eq('carol sees only her own organization',
  (select count(*) from public.organizations), 1);
select pg_temp.check_eq('carol sees only her own document',
  (select count(*) from public.documents), 1);
select pg_temp.check_eq('carol cannot read Org A page text',
  (select count(*) from public.document_pages where content like '%Charles County%'), 0);
select pg_temp.check_eq('carol cannot enumerate Org A members',
  (select count(*) from public.organization_members where organization_id = :org_a), 0);
select pg_temp.check_eq('carol cannot read the Org A audit log',
  (select count(*) from public.audit_events where organization_id = :org_a), 0);
select pg_temp.check_eq('carol cannot list Org A storage objects',
  (select count(*) from storage.objects where name like '%aaaa%'), 0);

select pg_temp.check_no_rows('carol cannot delete Org A documents',
  format('delete from public.documents where organization_id = %L', :org_a));

select pg_temp.check_no_rows('carol cannot remove Org A members',
  format('delete from public.organization_members where organization_id = %L', :org_a));

\echo ''
\echo '=== 6. Signed out (anon) ==================================================='
reset role;
set role anon;
reset request.jwt.claim.sub;

select pg_temp.check_denied('anon cannot read organizations',
  'select count(*) from public.organizations');
select pg_temp.check_denied('anon cannot read documents',
  'select count(*) from public.documents');
select pg_temp.check_denied('anon cannot read page text',
  'select count(*) from public.document_pages');
select pg_temp.check_denied('anon cannot call the membership helper',
  'select app.is_member(''00000000-0000-0000-0000-00000000aaaa'')');

reset role;
\echo ''
\echo '=== ALL TENANT ISOLATION CHECKS PASSED ====================================='
