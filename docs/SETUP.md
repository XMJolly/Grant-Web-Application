# Setting up Vouch

Start to finish, assuming nothing is installed yet. Roughly 45 minutes.

You need [Node.js 20 or newer](https://nodejs.org). Check with `node -v`.

---

## 1. Install the project

```bash
cd vouch
npm install
```

## 2. Create a Supabase project

1. Go to <https://supabase.com>, sign up, and create a new project.
2. Pick a region close to your users — **East US (North Virginia)** for Maryland.
3. Save the database password somewhere safe. You will rarely need it, and you
   cannot recover it later.
4. Wait for the project to finish provisioning (about two minutes).

## 3. Create the database

In the Supabase dashboard, open **SQL Editor → New query**. Then, one at a time:

1. Paste the whole of `supabase/migrations/0001_core.sql` and press **Run**.
2. Paste the whole of `supabase/migrations/0002_storage.sql` and press **Run**.

Order matters — the second file refers to tables the first one creates.

Check it worked: **Table Editor** should now list `organizations`,
`organization_members`, `documents`, `document_pages` and `audit_events`, and
each should show a green **RLS enabled** badge. **Storage** should list a
private bucket called `org-documents`.

> If you would rather use the Supabase CLI: `supabase link --project-ref <ref>`
> then `supabase db push` applies the same files.

## 4. Turn on email confirmation

**Authentication → Sign In / Providers → Email**. Leave *Confirm email* on.

While testing on your own, you may find it quicker to turn it off so you can
sign in immediately. Turn it back on before anyone else uses the system.

## 5. Collect your keys

**Project Settings → API**. You need three values:

| Value | Where it goes | Notes |
|---|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | Safe to expose |
| Publishable key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe to expose — it can only ever act as the signed-in user |
| Secret key (`sb_secret_…`) | `SUPABASE_SECRET_KEY` | **Secret.** Bypasses all security. Server only, never in a `NEXT_PUBLIC_` variable, never committed |

```bash
cp .env.example .env.local
```

Fill in the three values.

## 6. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. Create an account, create your organization,
upload a document.

Try uploading `EconoLease Community Grant Application.pdf`. It should be
accepted, stored, and then clearly marked **Scan — cannot read**. That is the
system working correctly, not failing: see `docs/DECISIONS.md`, decision 2.

---

## 7. Prove the security works

Before trusting this with a real nonprofit's documents, run the tenant
isolation suite. It creates two organizations and four users, then asserts
forty things that must be impossible.

You need a local PostgreSQL 16+ for this. On macOS:

```bash
brew install postgresql@16 && brew services start postgresql@16
PSQL_CMD="psql -U $(whoami) -d postgres" npm run test:rls
```

Expect `✓ 40 tenant isolation checks passed`. If anything fails, stop and fix
it — do not deploy.

Then check extraction:

```bash
npm run test:extract
```

The `samples/` folder is git-ignored, so on a fresh clone the two real-document
checks are skipped. Drop your own `capstone.docx` and `scanned-grant.pdf` in
there to run them.

---

## 8. Deploy to Cloudflare

```bash
npx wrangler login
```

Edit `wrangler.jsonc` and replace the two placeholder values under `vars` with
your real Supabase URL and publishable key. These are public values; they belong in
the config file.

The secret does not:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
```

Then:

```bash
npm run cf:preview   # build and run the Worker locally, to check it
npm run cf:deploy    # publish
```

For local Worker runs, `wrangler` reads secrets from `.dev.vars`:

```bash
cp .dev.vars.example .dev.vars
```

Finally, in Supabase go to **Authentication → URL Configuration** and add your
`*.workers.dev` address (and later your own domain) to **Redirect URLs**.
Sign-in will fail with a redirect error until you do.

---

## Troubleshooting

**"Missing environment variable NEXT_PUBLIC_SUPABASE_URL"**
`.env.local` is missing or was added after the dev server started. Stop it with
Ctrl-C and run `npm run dev` again.

**Everything is empty after signing in, with no error**
That is row-level security doing its job — you are seeing an organization you
are not a member of, which looks identical to one that does not exist. Check
`organization_members` in the Table Editor.

**"new row violates row-level security policy"**
The database refused a write. Usually your role is too low (volunteers cannot
upload) or the `organization_id` did not match your membership.

**Uploads fail on Cloudflare but work locally**
The secret key was not set on the Worker. Run
`npx wrangler secret put SUPABASE_SECRET_KEY`.

**A large PDF times out on Cloudflare**
Text extraction currently runs inside the upload request. Workers cap CPU time
per request. Moving extraction to a Cloudflare Queue is the first task in
Milestone 2 — see `docs/MILESTONES.md`.
