-- =============================================================================
-- GrantPath — private document storage
--
-- Bucket layout:  org-documents/<organization_id>/<document_id>/<file_name>
--
-- Writes are server-only. The browser never holds a key that can write to this
-- bucket; uploads go through a Next.js route handler that checks the user's
-- session, their role, the MIME type, the magic bytes and the size *before*
-- anything is stored, then writes with the service role.
--
-- The read policy below is defence in depth. It deliberately does not restate
-- the membership rules: it asks whether the caller can see the matching row in
-- public.documents. That row is already governed by documents_select, which
-- covers membership and the volunteer/sensitive-category rule. One rule, one
-- place — if the document row is invisible to you, so are its bytes.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-documents',
  'org-documents',
  false,                                   -- never public
  26214400,                                -- 25 MiB
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Signed-in users may read only the objects whose document row they can read.
create policy "org documents are readable by members who can see the row"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'org-documents'
    and exists (
      select 1
      from public.documents d
      where d.storage_path = storage.objects.name
    )
  );

-- No insert / update / delete policies for `authenticated` or `anon`.
-- The service role bypasses RLS and is the only writer.
