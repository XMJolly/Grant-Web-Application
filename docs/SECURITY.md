# Security model

Vouch holds several nonprofits' financial statements, board lists and
determination letters in one database. This document says where each control
lives and how to verify it still works.

## The one rule

**Authorisation is decided by the database, not by the application.**

Every tenant-owned table carries `organization_id` and has row-level security
enabled. A query for another organization's rows returns nothing — not an
error, nothing, which is indistinguishable from data that does not exist. The
application never adds `.eq('organization_id', …)` as a security measure,
because a control you can forget to write is not a control.

## Where each control lives

| Control | Enforced by | Verified by |
|---|---|---|
| Tenant isolation | RLS policies on all five tables | `01_isolation.sql` §2, §5 |
| Volunteers cannot read financial or personnel documents | `documents_select` + `is_sensitive`, set by trigger | §4 |
| Only admins and staff upload | `documents_insert` | §3, §4 |
| Only admins change roles | `organization_members_*` | §3 |
| Page text cannot be forged by a client | No INSERT grant on `document_pages` | §2 |
| Audit log cannot be edited or deleted | No UPDATE/DELETE policy for any role | §2 |
| Signed-out users see nothing | Nothing granted to `anon` | §6 |
| Files are private | Bucket `public = false`; no permanent URLs | — |
| File access follows row access | Storage policy defers to `public.documents` | §2, §4, §5 |
| Storage paths cannot escape a tenant | CHECK constraint on `storage_path` | §2 |

## Run the checks

```bash
npm run test:rls
```

Two organizations, four users, forty assertions. Expect
`✓ 40 tenant isolation checks passed`.

The suite runs the migrations as **`gp_owner`, a deliberately non-superuser
role**. This is not incidental. A superuser bypasses RLS unconditionally, so a
suite run as one will pass with policies that deny everything in production.
It caught exactly that during development: `FORCE ROW LEVEL SECURITY` looked
safer, and would have made `app.is_member()` return false for every user on
Supabase, because the `SECURITY DEFINER` helpers run as the table owner and the
policies are written `to authenticated`. See the comment where FORCE would
otherwise go in `0001_core.sql`.

To confirm the suite still has teeth, break something on purpose and watch it
fail:

```bash
echo "alter table public.organization_members force row level security;" \
  >> supabase/migrations/0001_core.sql
npm run test:rls    # must fail
git checkout supabase/migrations/0001_core.sql
```

## The secret key

`SUPABASE_SECRET_KEY` (Supabase's new-format `sb_secret_…`, which replaces the legacy
`service_role` JWT) bypasses row-level security completely. Anyone
holding it can read every nonprofit's documents.

It is used in exactly four places, all server-side:

1. `src/lib/audit.ts` — writing the append-only log
2. `src/app/api/documents/upload/route.ts` — storing bytes, writing page text
3. `src/app/api/documents/[id]/download/route.ts` — minting a 60-second signed URL
4. `src/app/(app)/members/page.tsx` — resolving user ids to email addresses

Every one of those first establishes the caller's identity and organization
with the **user** client, and uses the secret key only for work that RLS
deliberately forbids clients from doing at all.

Two guards: `src/lib/supabase/admin.ts` imports `server-only`, so the build
fails if it is ever reached from a client component; and `secretKey()`
throws if called where `window` exists. Never give it a `NEXT_PUBLIC_` name —
that prefix is what tells Next.js to inline a value into browser JavaScript.

## Uploads

In order: session → role → size → **magic bytes** → metadata row inserted *as
the user* (so RLS can refuse) → bytes stored with the service role. The
filename and browser `Content-Type` are never trusted. If storage fails, the
metadata row is deleted, so the table never lists a document that is not there.

Filenames are sanitised by `safeFileName()`, and the final path is
`<organization_id>/<document_id>/<file_name>`, which a CHECK constraint
enforces.

## Downloads

There is no permanent URL for any document. Each click mints a signed URL
valid for 60 seconds and records an audit event. Authorisation is the `SELECT`
that precedes it, run as the user — which also means a volunteer requesting a
budget gets a 404, identical to a document that does not exist.

## Known gaps

Honest list. None of these block a pilot; all should be closed before general
availability.

- **No rate limiting** on sign-in or upload. Cloudflare's own rules are the
  cheapest fix.
- **No retention or deletion policy.** `organizations` has no delete policy at
  all, which is safe but means deletion has no path yet. A nonprofit that asks
  you to delete their data currently needs manual work.
- **No virus scanning.** Files are stored as uploaded and only ever served back
  to the same organization.
- **Vendor data flow is undocumented for users.** Nothing is sent to an AI
  provider yet. Before Milestone 2 ships, users need to be told plainly what
  leaves the system and where it goes.
- **Password policy is length-only** (10 characters). Supabase can enforce
  more.
- **No multi-factor authentication.** Supabase supports it; worth enabling for
  the administrator role once there is more than one user per organization.
- **`document_pages.content` is stored in plaintext** in the database, as is
  necessary for it to be searchable and citable. Encryption at rest is
  Supabase's, not ours.

## If something goes wrong

1. Rotate the secret key in the Supabase dashboard, and re-set the Worker
   secret.
2. `audit_events` records who did what, when. It is append-only and no user
   role can alter it.
3. Supabase logs record queries at the database level.
