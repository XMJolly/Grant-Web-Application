# Decisions

Each entry records what was decided, why, and what it costs. Reversing one is
fine — but do it knowingly.

Statements are labelled: **Fact** (verified), **Assumption** (believed, not
tested), **Hypothesis** (needs measurement).

---

## 1. Cloudflare hosts the app; Supabase holds the data

**Decision.** Next.js runs on Cloudflare Workers via the OpenNext adapter.
Accounts, relational data and private files stay in Supabase.

**Why.** Row-level security is the security model this whole product rests on:
every table carries `organization_id`, and Postgres itself refuses to return
another nonprofit's rows. **Fact:** Cloudflare D1 is SQLite and has no
row-level security. Putting the data there would move tenant isolation into
application code, so every future query would become a place where one missing
`.eq('organization_id', …)` leaks a nonprofit's financial statements. The
database cannot forget.

**Cost.** Two vendors instead of one. Workers cannot render PDF pages to
images, which constrains the OCR options in decision 2. Slightly more setup
than Vercel, where Next.js is native.

**Reversible?** Yes, cheaply — the host is not load-bearing. Moving the *data*
to D1 later would not be.

---

## 2. Scanned documents are refused, not guessed at

**Decision.** PDFs and Word files are read for their text layer. A document
without one is stored, marked "Scan — cannot read", and produces no facts.

**Why.** **Fact:** the one real grant application in the source material —
`EconoLease Community Grant Application.pdf` — is 8 pages of scanned images
with zero extractable characters. Verified in this workspace. **Assumption:**
that is common rather than unlucky, because small funders and county offices
circulate printed-then-scanned forms.

The alternative is worse than it looks. A scanned page yields an empty string,
not an error. Without the check, such a document would be stored as
"successfully processed" with no content, and every downstream feature would
treat it as a valid source. Refusing loudly is the same principle as the Core
Trust Rule, applied one layer earlier.

The thresholds are in `src/lib/extract/types.ts` and are validated against both
real PDFs by `npm run test:extract`.

**Cost.** Your own sample grant cannot be processed until OCR exists.

**When to revisit.** Milestone 3. The likely approach is rendering each page to
an image and using a vision model, keeping the page number so citations still
work. That needs a Node-capable service — a Cloudflare Container, or Supabase
Edge Functions — because Workers cannot rasterise a PDF.

---

## 3. A custom web app, against the capstone's own recommendation

**Decision.** Build it. The capstone's alternative matrix scored Low-Code/
No-Code **470**, Off-the-Shelf CRM **365**, and Custom Web App **265** — last.

**Why.** The matrix weighted Data Security at 3 out of 100 and rated the
low-code option "basic security" at 3/5. That weighting was reasonable for the
system as scoped there: a single-organization opportunity tracker holding
public grant listings. It is wrong for what Vouch became. This product
holds multiple nonprofits' financial statements and board lists in one system,
which makes tenant isolation the highest-stakes requirement, not a rounding
error. **Assumption:** no low-code platform gives you Postgres row-level
security, a `SECURITY DEFINER` membership helper, and an append-only audit log
that users cannot edit.

The matrix's other objections — development cost 1/5, timeline 3–6 months — were
priced against hand-building auth, storage and hosting. Supabase and Cloudflare
change that arithmetic.

**Write this down for reviewers.** Departing from your own analysis is
defensible; departing from it silently is not.

---

## 4. The capstone ERD is evidence, not a schema

**Decision.** Start the data model fresh. Keep the capstone as requirements
evidence.

**Why.** **Fact:** `STAFF_MEMBER` has no organization foreign key — the model
is single-tenant throughout, and multi-tenancy is not a field you add later.
**Fact:** FR-06 requires comparing a grant's eligibility rules against "the
foundation's organization type, mission, service area, and program focus", and
UC-02 preconditions that this is saved in the system — but **no entity in the
ERD stores it**. `organizations` plus the coming `verified_facts` fills a real
hole, rather than replacing something that worked.

Carried forward unchanged: reimbursement-after-spend, monthly compliance
evidence (photos, receipts, attendance), eMMA registration and state good
standing as hard eligibility gates, and plain language for a solo operator.

---

## 5. Role-based restriction is enforced by the database

**Decision.** Volunteers cannot read documents categorised as budget, financial
statement, board list or staff record. This is a row-level security policy, not
a hidden menu item.

**Why.** The handoff requires volunteers get "narrowly assigned tasks without
unnecessary access to financial or personnel information". Enforcing that in
the UI means the API still serves the data. `is_sensitive` is derived from the
category by a database trigger, so a client cannot set it, and pages inherit it
from their parent document. Verified by four assertions in
`supabase/tests/01_isolation.sql`, section 4.

---

## 6. Uploads go through the server, not straight to storage

**Decision.** The browser posts the file to a route handler. That handler
checks the session, checks the role, checks the size, checks the **magic bytes**,
writes the metadata row *as the user* so RLS can refuse it, and only then
stores the bytes with the service role.

**Why.** The filename and the browser's `Content-Type` are both attacker
controlled; a file called `report.pdf` can contain anything. Creating the
metadata row before storing the bytes means a rejected upload leaves nothing
behind. `documents.storage_path` has a CHECK constraint forcing it to begin
with the organization's id, so the storage layout cannot drift from the policy
that depends on it.

**Cost.** Bytes pass through the Worker. Fine at the 25 MB ceiling.

---

## 7. Extraction runs inline, for now

**Decision.** Text extraction happens inside the upload request.

**Why.** Fewer moving parts while the workflow is still being proved.

**Cost.** **Fact:** Cloudflare Workers cap CPU time per request, so a large PDF
may time out. `processDocument()` in the upload route is already a separate
function taking only an id and bytes, so moving it behind a Cloudflare Queue is
a contained change.

**When to revisit.** Milestone 2, as soon as an AI call joins the pipeline —
at that point the work no longer fits in one request even in principle.

---

## 8. Email and password, not magic links

**Decision.** Supabase email/password sign-in.

**Why.** No email provider to configure, so there is one less thing to set up
and one less thing to fail. Sign-in failures return a single vague message —
distinguishing "no such account" from "wrong password" would let anyone test
whether a given nonprofit's staff have accounts here.

**When to revisit.** When Resend arrives for deadline reminders, magic links
become nearly free. Passwords are the more familiar model for this audience, so
this may not be worth changing at all.

---

## Open questions

These need answers from pilot users, not from the code.

1. Which Maryland sources matter most to the first five nonprofits?
2. Who in a small nonprofit is actually authorised to approve a fact — is
   "Reviewer" a real role, or is it always the director?
3. What must never be uploaded? Beneficiary names and medical details are
   currently out of scope by decision, and the schema has no place to put them.
4. **Hypothesis, not a finding:** 10 hours saved per week, 20% more funding,
   50% fewer communication errors. These come from the capstone's projected
   business value and remain unmeasured. Do not repeat them as results.
