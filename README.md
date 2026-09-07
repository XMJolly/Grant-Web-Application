# GrantPath

A source-backed grant and reimbursement assistant for very small community
nonprofits that cannot afford a dedicated grant writer.

The promise is narrow and specific: **GrantPath never silently invents an
organizational fact.** Every factual statement links to an approved piece of
evidence, uncertain information is flagged rather than filled in, and nothing
reaches an export without a person approving it.

**Status: Milestone 1.** The tenant boundary is built and verified. No AI yet —
see [`docs/MILESTONES.md`](docs/MILESTONES.md).

## What works today

- Email/password accounts
- Organizations, four roles, and an organization profile
- Private PDF and Word upload, validated server-side by magic bytes
- Per-page text extraction, with scanned documents refused rather than silently
  read as empty
- An append-only audit log
- Volunteers blocked from financial and personnel documents **by the database**,
  not by hiding a menu

## Quick start

```bash
npm install
cp .env.example .env.local     # fill in from your Supabase project
npm run dev
```

Full walkthrough, including creating the Supabase project and running the
migrations: [`docs/SETUP.md`](docs/SETUP.md).

## Verify it

```bash
npm run test:rls        # 40 tenant isolation checks against a real Postgres
npm run test:extract    # 31 extraction and scan-detection checks
```

`test:rls` is the exit condition for Milestone 1. It creates two organizations
and four users and asserts forty things that must be impossible. Run it after
any change to `supabase/migrations/`.

## Stack

| Layer | Choice |
|---|---|
| App and server | Next.js 15, TypeScript, Tailwind CSS 4 |
| Hosting | Cloudflare Workers via OpenNext |
| Accounts, data, files | Supabase — Auth, Postgres with row-level security, private Storage |
| PDF text | `unpdf` (pdf.js for serverless) |
| DOCX text | No dependency — ZIP + `DecompressionStream`, in `src/lib/extract/docx.ts` |

Why Cloudflare hosts but does not store: [`docs/DECISIONS.md`](docs/DECISIONS.md),
decision 1.

## Layout

```
supabase/migrations/   Schema and RLS. The security model lives here.
supabase/tests/        Tenant isolation suite.
src/lib/extract/       Turning uploaded bytes into citable page text.
src/lib/supabase/      Three clients: user, browser, and service role.
src/app/(app)/         Signed-in application.
docs/                  Setup, security, decisions, milestones.
```

## Reading order for a new contributor

1. [`docs/SECURITY.md`](docs/SECURITY.md) — where each control lives
2. `supabase/migrations/0001_core.sql` — the schema and every policy
3. `supabase/tests/01_isolation.sql` — what must be impossible
4. [`docs/DECISIONS.md`](docs/DECISIONS.md) — why it is built this way
5. [`docs/MILESTONES.md`](docs/MILESTONES.md) — what comes next

## Not being built

Automatic submission, a national grant database, a nonprofit CRM, donor
management, accounting, native mobile apps, browser autofill, automated budget
generation, or award predictions.
