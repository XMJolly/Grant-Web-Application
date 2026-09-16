# Market assessment

Researched September 2026. Statements are labelled **Fact** (verified against a
cited source), **Assumption** (believed, untested), or **Hypothesis** (needs
measurement). Sources are listed at the end.

The short version: the pre-award grant-writing thesis is weak and getting
weaker. The post-award reimbursement thesis is strong and genuinely unserved.
They are currently ranked the wrong way round.

---

## 1. The segment cannot pay

This is the central problem, and it is structural rather than fixable by
building a better product.

**Fact.** 88% of US nonprofits operate on under $500K a year, and 59% on under
$50K. That is the segment GrantPath targets.

**Fact.** Those organisations receive about **0.4% of all foundation funding**,
and only **22% of nonprofits under $50K received even one foundation grant
between 2019 and 2023** — against 72% of all other nonprofits.

**Fact.** Maryland has ~46,000 registered tax-exempt organisations. Of the
~15,300 with reported revenue, ~80% are under $1M and ~60% under $250K.

So the segment is enormous by headcount and nearly absent by dollars. A tool
that helps you win more of a pot you are structurally excluded from has a hard
ceiling on its value.

**What they actually pay, revealed rather than surveyed:**

| Benchmark | Price |
|---|---|
| Maryland Nonprofits full membership, org under $400K | **$440/year (~$37/mo)** |
| Maryland Nonprofits full membership, org $400K–$1M | **$770/year (~$64/mo)** |
| Grantable's own discount for nonprofits under $500K | **$25/month** |
| Grantseeker Classic Premium (cheapest credible tool) | **$19.99/month** |
| ChatGPT / Claude, which 57% of nonprofits already use | **$20/month** |

That Maryland Nonprofits number is the one that should give you pause. For
$440 a year an organisation gets the GrantWatch database, DonorSearch prospect
research, weekly funding alerts, a staffed helpline, discounted grant-writing
consulting and a learning library. Any GrantPath subscription competes against
that bundle, not against Instrumentl.

**Fact.** Grantable — a company whose entire business is this segment —
prices it at $25/month. That is a competitor's own revealed estimate of the
ceiling.

---

## 2. Free competition is densest exactly where you are aiming

This was the most uncomfortable finding.

**Fact.** Maryland Nonprofits runs a **Nonprofit Development Center** that is
**free**, and whose eligibility is: Maryland-based, 501(c)(3), **budget under
$750,000**, fewer than 10 years old. It provides one-to-one technical
assistance from nonprofit experts, trainings, templates and a help desk. That
eligibility rule is close to a definition of GrantPath's target customer.

**Fact.** In Southern Maryland specifically:
- The **Nonprofit Institute at College of Southern Maryland** offers free
  capacity-building, free meeting space, and referrals to pro bono or
  reduced-rate grant writers. It has run free grant proposal courses.
- **Charles County Public Library (P.D. Brown branch)** provides free Candid /
  Foundation Directory access — named by Charles County government itself.
- **Charles County Government** runs free grants-management training modules
  and an annual Grant Training Seminar with the Governor's Grants Office.
- **Anne Arundel County** runs a completely free five-month **Grant Writing
  Cohort**, with preference for organisations under $1M.

**Fact.** Candid's free tier now covers 1.9M organisation records, grant and
open-RFP search, and an LOI generator, with free Foundation Directory
Professional access at 2,180+ Funding Information Network locations.

The implication is not that GrantPath is pointless. It is that **the problem is
already being addressed by heavily subsidised humans**, and a paid tool has to
beat free expert help, not beat a spreadsheet.

---

## 3. The market is consolidating downward, not opening up

**Fact.** **Foundant sunset GrantHub and GrantHub Pro on 31 January 2026** —
the incumbent affordable grantseeker tracker — and exited the grantseeker
segment entirely to focus on grantmaker-side products. It shipped a major
GrantHub Pro update shortly before killing it.

**Fact.** Four acquisitions in eighteen months, all undisclosed terms:
FreeWill bought Grant Assistant (Oct 2024, when it was nine months old);
Foundant merged with SmartSimple (Aug 2024); Fluxx bought Grantseeker (Nov
2025); **Euna Solutions bought GrantExec (Jan 2026)** — a company that had
raised roughly $80K.

**Assumption.** Those are small numbers. A grant-discovery startup with ~$80K
raised and 2,000 users was worth acquiring, which suggests the exit range for a
sub-scale product here is modest — a good outcome for a side project, not a
company.

**Fact.** Instrumentl raised **$55M from Summit Partners in April 2025**, has
4,000–4,500 customers, claims cash-flow positive and doubling year on year —
and its own FAQ says nonprofits with **$1M+ operating revenue succeed most**,
with no small-org discount.

Instrumentl has ceded your segment. Read carefully, that is not an opening. A
well-funded company that has examined this market chose not to serve the
bottom of it.

---

## 4. The "source-backed" differentiator is real, but no longer novel

**Fact.** No funded incumbent has taken this position. Instrumentl's Apply
surfaces language from your uploaded documents but, per its own help
documentation, **does not mark which suggestion came from which document**.
Grantable's only safety claim is "AI drafts, humans decide." Grant Assistant
markets "trained on 7,000+ winning proposals" — training data, not citation.

**Fact.** But two 2025–2026 entrants have taken it explicitly:

- **GrantAuthority** — *"Every match cited to a primary source"*, *"No invented
  numbers. If we can't resolve it to a source, we label it a lead — not
  evidence"*, plus a "patent-pending ZH system" for hallucination detection.
  $99/mo AutoGrant tier.
- **Sharke.ai** — source-cited verdicts, **pricing banded by revenue and
  verified against your Form 990** (under $1M → $99/mo), explicitly targeting
  "executive directors and small development teams without dedicated grants
  departments." It ran a July 2025 press release attacking competitors' error
  rates.

Sharke.ai is close to GrantPath's thesis, already shipped, with revenue-banded
pricing aimed at exactly this segment.

**Assumption.** Neither has verifiable scale — no funding, team, or customer
data was findable for either. So the position is contested but not won.

**The harder problem is that trust is difficult to sell.** People shop for
"write my grant faster." "Every claim is traceable" is a reason to stay, not a
reason to arrive. **Hypothesis, worth testing in Phase 0:** a nonprofit
director will not pay a premium for provenance until after a tool has burned
them once.

---

## 5. The genuinely strong finding: the reimbursement loop is unserved

This is the part that should change the plan.

**Fact.** Nobody serves the full post-award loop for a self-serve small
nonprofit:

- **AmpliFund (Euna)** does the entire workflow — payment requests, receipts,
  authorisations, subrecipient portals. But small nonprofits meet it because
  **a state agency bought it and required them to use it**. They never buy it,
  and grantseeker pricing is not published.
- **Instrumentl Spenddown**, launched spring 2026, sits in the **$999/month**
  tier and — per Instrumentl's own help docs — has **no receipt attachment, no
  proof-of-payment documentation, and no reimbursement request generation**. It
  stores transaction date, amount, description, ID. Imports are CSV from
  QuickBooks, not live sync.
- **Givefront** does receipt capture and grant-restricted expense allocation
  well, free to $65/month — but from the corporate-card side, and it does not
  produce an outbound reimbursement package for a specific funder.
- **Grantable, Grantboost, Granted AI, OpenGrants, Grantsights, Fundwriter,
  Sharke.ai** — none do post-award expense tracking at all.

**Fact.** The specific unserved workflow is: *award → expense with receipt and
proof of payment → program evidence → a reimbursement request package
addressed to a named funder or state agency*, in one product, at a price a
small nonprofit can pay.

**And this is precisely what the Jolly Dream interview described.** Grants
reimburse money already spent; some expenses are not reimbursable at all;
Gloria pays out of pocket. Monthly reporting requires photos, receipts and
attendance records.

The pre-award pitch is "help me write faster," competing against fifteen tools
and free county classes. The post-award pitch is "get your money back, and
don't lose a reimbursement because a receipt went missing" — which is about
cash the organisation has **already spent**, and is therefore worth real money
to them.

---

## 6. Who could actually pay

**Assumption, and the most important one in this document:** the nonprofit is
the user, not the customer.

The pattern already exists in this market. AmpliFund reaches small nonprofits
because **funders and state agencies buy it**. Charles County already funds
free grant training. Anne Arundel County already funds a free grant-writing
cohort. The Charles County Charitable Trust ran a microgrant round for orgs
under $100K and reported requests exceeding available funding.

**Fact.** Those are existing budget lines being spent on this exact problem for
this exact population.

**Hypothesis:** a county, community foundation, or Maryland Nonprofits would
pay for sponsored access covering N local organisations more readily than
those organisations would each pay $25/month. Untested, and testable with three
conversations rather than three months of code.

---

## 7. Legal

**None of this is legal advice.** It is what the research found.

### Competing is legal. Copying is not.

**Fact.** US copyright protects expression, not function. Ideas, methods,
systems, workflows and features are unprotectable. *Lotus v. Borland* held that
even a menu command hierarchy is a "method of operation" and not protectable.
The *Altai* abstraction–filtration–comparison test strips out ideas,
efficiency-dictated elements and public-domain material before comparing code.

So: building a grant tool with a pipeline, an eligibility checker, a drafting
workspace and a submission checklist is entirely lawful, even though others do
the same things.

**What would create real exposure:**
- Copying source code, marketing copy, or screenshots
- Cloning a competitor's distinctive visual identity closely enough to be
  trade dress
- Signing up for a competitor's paid product to extract its database

GrantPath's position is unusually clean: it came from your own capstone, your
own interview, and code written from scratch. Keep it that way — do not paste a
competitor's page into a prompt and ask for something similar.

### Patents are not the risk here

**Fact.** Justia searches returned **zero patents** for Instrumentl,
Submittable, Foundant, AmpliFund, Bonterra, Euna Solutions, and Brightstead
(GrantAuthority's entity). StreamLink — AmpliFund's originating company — has
two published *applications* on grant management from 2013/2016, prosecution
status unverified. *Alice v. CLS Bank* makes software workflow patents hard to
sustain.

GrantAuthority's "patent-pending ZH system" is unfindable in public databases —
which proves nothing either way, since applications are not published for about
18 months, and "patent pending" is sayable after filing a provisional.

### The real legal risk is Phase 4, and it is contractual

**Fact.** **Candid's Subscriber License Agreement (April 2025) and API License
Agreement (January 2025) explicitly prohibit** data mining, robots, scraping,
"extraction for use in artificial intelligence, large language models, machine
learning," redistribution — **and creating "a service or database that is
directly competitive with Candid."**

**Fact.** The US has **no database right**. *Feist* rejected "sweat of the
brow"; facts extracted from a database are not protected by the compilation
copyright. Which is exactly why Candid relies on contract instead — and
contract works. In *hiQ v. LinkedIn*, scraping public data did **not** violate
the CFAA, but hiQ was found to have **breached LinkedIn's terms**, and settled
in December 2022 with a permanent injunction, deletion of all scraped data and
code, and **$500,000** paid to LinkedIn.

Practical shape of that:

| Source | Status |
|---|---|
| **Grants.gov** | **Safe.** `robots.txt` allows everything. Free official API at simpler.grants.gov — 60 req/min, 10,000/day per key. Requires an attribution line: "This product uses the Grants.gov API but is not endorsed or certified by HHS." |
| **Candid** | **Do not scrape.** Licence prohibits it, prohibits AI extraction, and prohibits building a competing database. Official APIs exist; pricing unpublished. |
| **Maryland eMMA** | **Unresolved — check before touching.** `emma.maryland.gov` is `robots.txt`-disallowed and could not be read. The vendor user guide contains no terms of use. Maryland's site-wide policy prohibits unauthorised *uploads and alterations*, not reading. No public API found. No grant software integrates with it. |

**Fact.** The eMMA integration void is real — zero third-party grant tools
integrate with it. **Assumption:** that is partly because it is a *procurement*
system rather than a grants system, so the void may be less valuable than it
looks.

### Risks that matter more than any of the above

- **You hold other organisations' financial statements and board lists.** That
  is the liability that could actually end the project. It is why Milestone 1
  was the tenant boundary.
- **Fact: 23% of foundations will not accept AI-generated grant applications;
  10% will; 67% are undecided.** Any pitch has to survive a funder asking
  whether AI wrote it. GrantPath's human-approval model is a good answer — say
  so explicitly in marketing.
- **Vendor data flow.** Nonprofit documents will go to OpenAI. Users must be
  told plainly, before Milestone 2 ships.

---

## 8. Assessment

**As a venture-scale business: unlikely.** The target segment has the least
money in the sector, the most free alternatives concentrated in exactly your
geography, and a market that is consolidating rather than opening. Being the
fifteenth AI grant writer for the poorest customers is a hard place to start.

**As a real product for a specific set of Maryland nonprofits, paid for by
someone other than them: plausible.** The reimbursement gap is real, verified,
and matches what your own interview surfaced. The buyer is a county, a
community foundation, or a nonprofit association — organisations already
spending money on this problem.

**As a portfolio piece: already succeeding.** A verified multi-tenant security
model, a real user, real documents, a real capstone behind it, and honest
documentation of what does not work yet. Most student projects have none of
that.

## 9. What to do about it

1. **Do not change the code yet.** Milestone 1 is the same foundation either
   way. Nothing here invalidates it.
2. **Run Phase 0.** It has still not happened and it is now the highest-value
   thing available. Five to ten nonprofit staff, the Figma prototype, one
   question: *would you rather have help writing applications, or help getting
   reimbursed?*
3. **Have three funder conversations.** Charles County, the Charles County
   Charitable Trust, and Maryland Nonprofits. Ask whether they would sponsor
   access for local organisations. Three conversations, not three months.
4. **Consider reordering the milestones** so post-award comes before broad
   pre-award. Tradeoff: it means Milestone 3 changes shape, and the drafting
   workflow — the more impressive demo — gets deferred. Do not do it on this
   document alone; do it if Phase 0 agrees.

---

## Sources

Competitive: [Instrumentl pricing](https://www.instrumentl.com/pricing) ·
[Instrumentl FAQ](https://www.instrumentl.com/faq) ·
[Instrumentl $55M raise](https://www.summitpartners.com/news/instrumentl-raises-55m-from-summit-partners-to-accelerate-their-ai-grant-fundraising-platform) ·
[Instrumentl Spenddown help doc](https://help.instrumentl.com/en/articles/9114092-budget-spenddown-tracking) ·
[Grantable pricing](https://grantable.co/pricing) ·
[Sharke.ai pricing](https://sharke.ai/pricing) ·
[GrantAuthority](https://www.grantauthority.org/) ·
[Grantseeker pricing](https://www.grantseeker.io/pricing) ·
[AmpliFund features](https://www.amplifund.com/features/) ·
[Givefront pricing](https://givefront.com/pricing) ·
[Euna acquires GrantExec](https://www.businesswire.com/news/home/20260113647132/en/Euna-Solutions-Acquires-GrantExec-Advancing-AI-Driven-Grants-Discovery-and-Research) ·
[FreeWill acquires Grant Assistant](https://www.nonprofitpro.com/article/freewill-acquires-grant-assistant-an-ai-based-platform-for-nonprofit-grant-proposals/) ·
[GrantHub sunset](https://igxsolutions.com/resources/blog/your-alternative-to-granthub/)

Market: [Nonprofit Impact Matters](https://www.nonprofitimpactmatters.org/data/downloadable-charts/) ·
[Candid on very small nonprofits](https://candid.org/blogs/data-insights-very-small-nonprofits-make-up-majority-us-nonprofits/) ·
[Candid on funding for small nonprofits](https://candid.org/blogs/funding-for-small-nonprofits/) ·
[NCCS Sector in Brief](https://urbaninstitute.github.io/nccs-legacy/briefs/sector-brief-2019) ·
[Maryland Nonprofits membership](https://marylandnonprofits.org/membership/nonprofit-membership/) ·
[Maryland Nonprofits Development Center](https://marylandnonprofits.org/assistance/nonprofit-development-center/) ·
[CSM Nonprofit Institute](https://www.csmd.edu/nonprofit/resources.html) ·
[Charles County grants research](https://www.charlescountymd.gov/government/departments/fiscal-and-administrative-services/grants/researching) ·
[Anne Arundel Grant Writing Cohort](https://www.aacounty.org/county-executive/nonprofit-center/professional-development-programs/grant-writing-cohort) ·
[Charles County Charitable Trust microgrants](https://www.charlesnonprofits.org/charitable-trust-launches-microgrant-program-to-empower-small-nonprofits-in-charles-county/) ·
[NTEN digital investments](https://word.nten.org/wp-content/uploads/2024/04/2024-Nonprofit-Digital-Investments-Report.pdf) ·
[TechSoup AI benchmark](https://blog.techsoup.org/posts/what-ai-means-for-nonprofits-in-2025-insights-from-the-ai-benchmark-report)

Legal: [Candid Subscriber License](https://candid.org/terms-of-service/candid-subscriber-license-agreement/) ·
[Candid API License](https://candid.org/terms-of-service/api-license-agreement/) ·
[Grants.gov API terms](https://www.grants.gov/api/terms-conditions) ·
[Simpler.Grants.gov developers](https://simpler.grants.gov/developers) ·
[Feist v. Rural Telephone](https://supreme.justia.com/cases/federal/us/499/340/) ·
[hiQ v. LinkedIn outcome](https://www.zwillgen.com/alternative-data/hiq-v-linkedin-wrapped-up-web-scraping-lessons-learned/) ·
[Database legal protection](https://www.bitlaw.com/copyright/database.html)
