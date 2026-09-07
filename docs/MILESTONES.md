# Milestones

The handoff's Phase 1 bundles six things. This splits it into three, so that
each has an exit condition you can actually check.

---

## Milestone 1 — the tenant boundary ✅ built

> Sign in → create an organization → members with roles → organization profile
> → upload one private document → read its text.

**Exit condition:** `npm run test:rls` passes. Two organizations, four users,
forty assertions about what must be impossible.

**Why this is its own milestone, with no AI in it.** Every later feature writes
through this boundary. Retrofitting it means re-auditing everything built on
top, and it is the one area where a mistake is unrecoverable rather than
editable — a leaked financial statement cannot be un-leaked. It also has no
dependency on an AI provider, so it could be finished and verified before any
account was opened.

**What exists**

- Email/password accounts, session refresh in middleware
- Organizations, membership, four roles (admin / staff / reviewer / volunteer)
- Full organization profile, including eMMA registration and state good standing
- Private PDF and Word upload with server-side validation
- Per-page text extraction, and honest refusal of scans
- Append-only audit log
- Volunteers blocked from financial and personnel documents, by the database
- 40 isolation checks, 31 extraction checks

---

## Milestone 2 — the verified fact library

> Upload a document → the system proposes facts → a person approves, edits or
> rejects each one → approved facts become the organization's fact library.

This is where AI enters, and where the Core Trust Rule is first tested.

**Tasks, in order**

1. **Move extraction to a Cloudflare Queue.** Do this first, before adding an
   AI call — the work stops fitting in one request. `processDocument()` is
   already isolated for it.
2. **Schema:** `verified_facts` (statement, value, status, source
   `document_page_id`, approver, approved date, review-by date), plus
   `fact_proposals`. Add the RLS policies and extend
   `supabase/tests/01_isolation.sql` **in the same commit**.
3. **Server-side OpenAI call** using structured outputs. It receives only the
   pages of one document, belonging to one organization.
4. **Server-side evidence validation.** Every proposed fact must cite a
   `document_page_id` that exists and belongs to this organization. Reject the
   proposal otherwise — do not repair it.
5. **Review screen:** the proposed fact beside the page it came from. Approve,
   edit, reject.
6. **Status is never set by the model.** A proposal is `proposed` until a human
   moves it. This is the single most important line of code in the milestone.

**Exit condition:** upload the Jolly Dream Foundation's determination letter,
approve one fact, and see it in the library with a working link to the page it
came from. Plus: an adversarial test where the model is fed a document that
does not contain the answer, and the system asks rather than invents.

**Decision needed from you:** which OpenAI model, and whether document text may
leave the system at all. Users must be told plainly before this ships.

---

## Milestone 3 — one grant, one sourced answer

> Upload a grant → extract its requirements → check eligibility → draft one
> answer from approved facts → approve it → export.

**Tasks**

1. `grant_opportunities`, `grant_applications`, `eligibility_requirements`,
   `application_questions` — each row keeping its source page.
2. Requirements extraction, with a screen for correcting mistakes **before**
   drafting starts.
3. **Deterministic eligibility first.** Tax status, geography, organization age,
   budget, registration, deadline. AI only for genuinely ambiguous language such
   as mission alignment. Outcomes: Eligible / Likely eligible / Needs
   information / Likely ineligible / Ineligible — never a percentage.
4. `draft_answers` and `answer_evidence`, with server-side validation of every
   evidence id.
5. Answer states: Not started → Drafted → Missing information → Needs review →
   Approved → Locked. Only Approved content reaches an export.
6. DOCX export.
7. **OCR**, so scanned applications work. See `docs/DECISIONS.md` decision 2.

**Exit condition:** the EconoLease application, end to end. It has four crisp
rules — registered charity for 12+ months, limited other funding, a specific
need for commercial kitchen equipment, no award in the last 12 months — and is
small enough to hand-check extraction against the 95% target in an afternoon.

---

## Later

**Milestone 4:** full applications, approvals, missing-information requests,
deadline reminders by email.
**Milestone 5:** award agreements, reporting tasks, expenses, receipts,
reimbursement tracking. The strongest differentiator, and the thing the Jolly
Dream interview most clearly asked for.
**Milestone 6:** focused Maryland discovery — eMMA and selected county sources,
where technically and legally permitted.

## Still not being built

Automatic submission. A national grant database. A nonprofit CRM. Donor
management. Accounting. Native mobile apps. Browser autofill. Automated budget
generation. Award predictions or win-rate scores.

---

## Before Milestone 3 — test with real people

Phase 0 in the handoff, and it has not happened. The clickable prototype should
go in front of 5–10 nonprofit staff before more is built on assumptions about
what they want.

**Assumption worth checking early:** that a nonprofit director will approve
facts one at a time rather than finding it tedious. The entire trust model
depends on that being tolerable. If it is not, the design needs to change while
changing it is still cheap.
