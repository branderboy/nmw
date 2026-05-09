# Reproduce Sales Funnel + Admin — Claude Prompt

Paste everything below into a fresh Claude Code session inside the new repo.
Replace the `<<< PRODUCT SPEC >>>` block at the top with your product's core
offer, upsells, pricing, and any other specs. Leave the rest as-is.

---

## SYSTEM / TASK PROMPT (paste into Claude)

You are building a complete sales funnel + internal admin dashboard from
scratch in this repository. I'll give you the product spec below. Read it
carefully — every page, price, package, and upsell must come from this spec,
not from your assumptions.

### <<< PRODUCT SPEC — FILL IN BEFORE PASTING >>>

```
PRODUCT NAME:        <e.g., "Acme Backlinks">
DOMAIN:              <e.g., "acmebacklinks.com">
ONE-LINER:           <what we sell, in one sentence>
TARGET BUYER:        <who buys it, what intent looks like>

CORE PACKAGES (the products on the pricing page):
  1. <Package name> — $<price> — <what's included>
  2. <Package name> — $<price> — <what's included>
  3. <Package name> — $<price> — <what's included>

UPSELLS / BUMPS (added during checkout):
  - <Bump name> — $<price> — <what it does>
  - <Bump name> — $<price> — <what it does>

VERTICALS / CATEGORIES (drives landing pages + pricing tiers):
  - <e.g., Music, Cannabis, Finance, Casino, Tech>

DELIVERY / FULFILLMENT:
  <how the product is delivered after payment — turnaround, what the
  customer needs to provide, what we publish/send>

PAYMENT METHOD:
  <PayPal.me, Stripe, manual invoice, etc.>

GUIDELINES / TERMS the buyer must accept before checkout:
  <bullet list — what's allowed, refund policy, turnaround SLA>

BRAND VOICE / VISUAL DIRECTION:
  <e.g., "brutalist dark dashboard, light public site, Archivo Black + Barlow,
  black/white with accent color #xxxxxx">
```

### END OF PRODUCT SPEC

---

### What to build

A reference implementation already exists at `branderboy/allhiphop-leads`
(addaguestpost.com). Mirror its architecture, but every piece of copy,
package, and price must come from MY spec above — do not copy AllHipHop
content. Architecture to mirror:

#### 1. Tech stack (non-negotiable)

- **Frontend:** React 18 + Vite (no Next.js, no React Router — single-page
  app with a hand-rolled `route` switch in `src/App.jsx` keyed off
  `window.location.pathname`).
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`) + a small `index.css`
  for global tokens. No component library — write the CSS yourself.
- **Backend:** Vercel serverless functions in `/api/*.js` (Node 20, ESM).
- **Database:** Neon Postgres via `@neondatabase/serverless`. Single
  `api/lib/schema.sql` that's idempotent (`CREATE TABLE IF NOT EXISTS`,
  `ALTER TABLE … ADD COLUMN IF NOT EXISTS`).
- **Email:** Resend (`api/lib/resend.js` wrapper). Plain HTML templates,
  no MJML.
- **Payments:** PayPal.me link generation + a server-rendered PDF invoice
  via `pdfkit` (`api/lib/invoice-pdf.js`). No Stripe unless the spec says
  so.
- **Auth:** Bearer-token admin API (`api/lib/auth.js`). The dashboard
  password (`ADMIN_PASSWORD`) gates the React UI; a separate
  `ADMIN_API_SECRET` is sent as `Authorization: Bearer …` from the
  dashboard's `authFetch` helper to every protected `/api/*` route. Two
  secrets, never collapsed into one.
- **Deployment:** Vercel. Define routes/rewrites/cron in `vercel.json`.

#### 2. Public site (anonymous traffic)

Single Vite app that serves multiple routes via rewrites in `vercel.json`
(every public path rewrites to `/index.html`, then `App.jsx` reads
`window.location.pathname` and picks a component from a `PUBLIC_ROUTES`
map):

- `/` — main landing page. Hero, social proof, packages, FAQ, CTA. One
  long scrollable page.
- `/pricing` — package list with the prices from the spec.
- `/faq` — accordion FAQ.
- `/examples` — case studies / past results (placeholder grid is fine).
- One landing page per **vertical/category** in the spec (e.g.
  `/music-guest-posts`, `/cannabis-guest-posts`, …). These all live in
  `src/components/pages/*.jsx` and share a `PageShell.jsx` wrapper.
- `/onboard` — the multi-step checkout funnel (see §3).
- `/blog/*` — static HTML files in `public/blog/` for SEO. Generate a
  starter set of 5–10 posts following the topic clusters in
  `programmatic.md`-style strategy: high-intent buyer keywords, comparison
  posts, education→conversion, brand-name posts. Each blog post is a
  standalone `.html` file (no React) with its own `<title>`,
  `meta description`, canonical, OG tags, and a CTA back to `/onboard`.
  Add a rewrite for each in `vercel.json`.
- `/sitemap.xml` and `/robots.txt` in `public/`.

SEO hygiene on every public page: `react-helmet-async` via a `SEO.jsx`
component, set `title`, `description`, canonical, OG, Twitter card.
Dashboard pages must `noindex`.

#### 3. Onboarding funnel — `/onboard`

This is a **single static HTML file** (`public/onboarding.html`), not a
React component. Vanilla JS, Tailwind via CDN, ~1000 lines is fine.
Reason: it must load instantly with no JS framework cost, and it's the
single conversion-critical surface.

Five steps in one page (show/hide divs, no real router):

1. **Contact + package** — full name, email, company (optional), "how did
   you hear about us", radio list of packages from the spec.
2. **Content** — fields the customer needs to provide for fulfillment
   (e.g., article link, photos link, meta title, excerpt, slug, money
   link). Pull these from the spec's "delivery / fulfillment" section.
3. **Enhance / bumps** — checkbox list of upsells from the spec. Each
   selection updates a running total visible at all times.
4. **Billing** — billing name, billing email, billing address, optional
   "include our business address on the invoice" checkbox, optional deal
   code field.
5. **Agreement** — render the guidelines from the spec, require an
   "I agree" checkbox, then on submit POST to `/api/create-invoice`.

Server response gives back an `invoice_number`, a downloadable PDF URL,
and a PayPal.me payment link. Show all three on a "thanks" screen.

A receipt email goes out via Resend (`api/onboarding-email.js`). An
internal alert email goes to `NOTIFICATION_EMAIL` (`api/onboarding-submit.js`).

#### 4. Database schema

Mirror `api/lib/schema.sql` but rename fields to match the spec:

- `onboarding_leads` — one row per checkout. Columns for contact,
  package, content fields, `bumps JSONB`, billing, agreement timestamp,
  subtotal/total, paypal_link, status (`pending | paid | canceled`),
  plus independent timestamp flags `paid_at`, `delivered_at`, etc. for
  whatever fulfillment milestones the spec defines.
- `unsubscribes` — email PK, reason, source (one_click | webhook_bounce
  | webhook_complaint | manual), unsubscribed_at. Anyone in this table
  is permanently excluded from sends.
- Indexes on `(email)`, `(created_at DESC)`, `(status)`.

Schema is idempotent. Document in the README: run it once against the
Neon branch before first deploy.

#### 5. Admin dashboard — `/dashboard` and `/admin`

Both paths rewrite to `/index.html`; `App.jsx` detects them and renders
`<LoginGate><Dashboard /></LoginGate>`.

**Look:** brutalist dark sidebar (#0f0f0f, white accents, sharp 1px
borders, no rounded corners on the sidebar) + light main content area
(#fcfcfc). Top bar shows the current section title plus two health-dot
indicators ("Resend API", "Claude") that ping `/api/check-resend` etc.

**Sidebar groups (collapsible):**

- **Sales Pipeline**
  - Invoices & Posts — list of all `onboarding_leads` rows; mark
    paid/published/delivered; download invoice PDF; copy PayPal link.
  - Orders — derived view, one card per paid order with fulfillment
    state machine.
  - Onboarding Submissions — raw submissions feed with approve/reject
    on content, then auto-create orders.
  - Offers & Pricing — edit the package list shown on the public site
    (persists to localStorage; the public site reads from the same key
    on load with a hardcoded fallback).
- **Outreach**
  - Compose & Send — paste/import recipient list, write subject + HTML
    body, send via Resend, watch deliverability counts. Honors
    `unsubscribes` table.
  - Email Flows — drag-build multi-step drip sequences (delays in days,
    conditional branches on open/click). Persisted to localStorage.
  - Contacts — table view of all leads with search/filter.
  - Add Contacts — CSV upload + paste-list input. Dedupe on email,
    domain-clean (strip `mailto:`, lowercase, drop disposable domains
    via `api/lib/disposable-domains.js`).
  - Lead Inbox — IMAP-fetched replies (or a Resend inbound webhook).
    Shown threaded.
  - Blacklist — view + manage `unsubscribes`.
- **Reports**
  - Email Reports — opens, clicks, bounces, replies per campaign.
    Recharts.
  - Insights — funnel chart from `onboarding_leads` rows: visited →
    started checkout → completed → paid → delivered. Conversion %
    between each stage.
  - Analysis Model — revenue forecast. Calls `/api/forecast.py`
    (Python 3 serverless function on Vercel) with the lead history,
    returns projected MRR. Optional but matches the reference.
- **Website**
  - Landing Page — preview of the public landing page inside the
    dashboard frame.
  - Examples — manage case studies.
  - Content Goals — call Anthropic API (`ANTHROPIC_API_KEY` from
    settings) to generate blog post ideas in the topic clusters. Save
    selected ideas to localStorage.
  - Guidelines — WYSIWYG-ish editor for the agreement text shown in
    onboarding step 5. Versioned. Acceptance log shows which buyer
    accepted which version.
- **Settings (bottom of sidebar)**
  - Sender — sender email/name, reply-to, contact email, PayPal link,
    Anthropic API key, **Admin API Token** (the value the dashboard
    sends as Bearer to protected APIs — must equal `ADMIN_API_SECRET`
    on the server). Persists to localStorage.
  - Account — change password, log out.

Most state is React `useState` + `useEffect` persistence to localStorage
(keys prefixed with the product slug, e.g., `ahh_*` in the reference).
Server is the source of truth only for `onboarding_leads` and
`unsubscribes` — everything else (offers, settings, drip flows,
content ideas) lives in the browser. Document this trade-off.

#### 6. Cron jobs (`vercel.json` `crons`)

- `0 9 * * *` → `/api/cron/advance-sequence` — moves leads to the next
  step in their drip flow, sends scheduled emails.
- `0 8 * * *` → `/api/cron/daily-gameplan` — emails the operator a
  summary of yesterday's metrics + today's pipeline.
- `0 13 * * 1` → `/api/cron/weekly-report` — Monday digest with trend
  data (calls `/api/trends.py` if available).

Each cron handler must check `req.headers['x-vercel-cron']` or a shared
secret before running.

#### 7. Webhooks

- `/api/webhooks/resend` — receive Resend bounce/complaint events,
  insert into `unsubscribes`.
- `/api/webhooks/inbound-lead` — accept JSON or form post from external
  capture forms, insert into `onboarding_leads` with status `pending`.

Both must verify a shared secret in the path or header.

#### 8. Auth flow

- `LoginGate.jsx` shows a password form. Submits to `/api/admin-login`
  which compares against `ADMIN_PASSWORD` (constant-time compare). On
  success, set a localStorage flag (`<slug>_authed=1`) and reload.
  No JWT, no cookies — this is single-tenant ops tooling.
- Every protected fetch goes through `src/lib/api.js → authFetch()`,
  which reads `<slug>_admin_token` from localStorage and sets
  `Authorization: Bearer …`.
- Server-side, every `/api/leads/*`, `/api/send-emails`, `/api/fetch-emails`,
  `/api/approve-content`, `/api/onboarding-update` etc. starts with
  `if (!authorize(req, res)) return;`.

#### 9. Files & layout

```
/
  index.html                 ← public site shell
  vite.config.js
  vercel.json                ← rewrites + crons + headers
  package.json
  .env.example               ← every env var documented
  programmatic.md            ← the SEO/content strategy notes
  README.md                  ← deploy + local dev steps
  public/
    onboarding.html          ← the 5-step checkout, vanilla JS
    sitemap.xml
    robots.txt
    blog/<slug>.html         ← static SEO posts (5–10 to start)
    <hero>.jpg, <logo>.svg, og-image.svg, favicon.svg
  src/
    main.jsx
    App.jsx                  ← path-based router + dashboard shell
    index.css                ← tailwind + globals
    lib/api.js               ← authFetch
    components/
      LoginGate.jsx
      SEO.jsx
      PageShell.jsx
      <Landing>.jsx
      PricingPage.jsx, FAQPage.jsx, Examples.jsx
      pages/<Category>.jsx   ← one per vertical
      Settings.jsx
      InvoicesDashboard.jsx
      OrdersDashboard.jsx
      OnboardingAdmin.jsx
      Offers.jsx
      ContentGoals.jsx
      GuidelinesEngine.jsx
      Insights.jsx
      AnalysisModel.jsx
      EmailSequencer.jsx (+ FlowList, FlowBuilder, SequenceDashboard,
        SequenceSettings, Inbox, LeadTable, LeadsInbox, UploadLeads,
        CleaningReport, emailCleaner.js)
  api/
    admin-login.js
    check-resend.js
    create-invoice.js
    onboarding-submit.js
    onboarding-email.js
    send-emails.js
    fetch-emails.js
    approve-content.js
    unsubscribe.js
    forecast.py              ← optional, Python serverless
    trends.py                ← optional, pytrends
    cron/advance-sequence.js
    cron/daily-gameplan.js
    cron/weekly-report.js
    webhooks/resend.js
    webhooks/inbound-lead.js
    leads/onboarding-list.js
    leads/onboarding-stats.js
    leads/onboarding-update.js
    leads/pending.js
    leads/verify-batch.js
    lib/db.js
    lib/auth.js
    lib/schema.sql
    lib/resend.js
    lib/smtp.js
    lib/invoice-pdf.js
    lib/unsub-token.js
    lib/rate-limit.js
    lib/disposable-domains.js
  requirements.txt           ← only if using the .py functions
```

#### 10. Environment variables (write `.env.example` with these, documented)

```
ADMIN_PASSWORD=
ADMIN_API_SECRET=             # separate from RESEND_API_KEY by design
RESEND_API_KEY=
RESEND_SENDER_EMAIL=
NOTIFICATION_EMAIL=
PAYPAL_ME_HANDLE=
BUSINESS_ADDRESS=             # multi-line, \n separated
DATABASE_URL=                 # neon postgres
ANTHROPIC_API_KEY=            # optional, only if Content Goals is enabled
```

### Build order (do not deviate)

1. Scaffold Vite + Tailwind + the file tree above. `npm install`. Get
   `npm run dev` rendering a "hello" landing page.
2. Write `vercel.json` with rewrites for every public route and the cron
   schedule.
3. `api/lib/db.js`, `api/lib/auth.js`, `api/lib/schema.sql`. Print the
   SQL in the README so the operator runs it once.
4. Public landing page + pricing + FAQ + one category page using the
   spec content. Make it look done — real copy, real prices, real CTA.
5. `public/onboarding.html` (all 5 steps) + `/api/create-invoice` +
   `/api/lib/invoice-pdf.js` + receipt email. End-to-end: a stranger
   can submit and receive a PDF invoice + PayPal link.
6. `LoginGate` + dashboard shell + `InvoicesDashboard` (read from
   `/api/leads/onboarding-list`). The operator can see and update
   submissions.
7. The rest of the dashboard sections in the order they appear in the
   sidebar.
8. Outreach (EmailSequencer + flows + send + inbox).
9. Cron jobs + webhooks.
10. Blog posts + sitemap + robots.

### Rules

- No placeholder Lorem Ipsum on production-facing pages. Every public
  page must have real copy from the spec. Where the spec is silent,
  ask me before inventing.
- No third-party dashboard libraries (no MUI, Chakra, Ant). Write
  Tailwind by hand.
- No React Router. Path matching in `App.jsx` only.
- No Next.js. Vite + Vercel functions only.
- No emojis in code, copy, or commits unless the spec explicitly asks.
- Comments only where the WHY is non-obvious. No "added for X feature"
  notes — those belong in commits.
- Single-tenant: this is ops tooling for one operator. No multi-user
  auth, no orgs, no roles.
- All money math in cents server-side; format on the client only.
- Every protected `/api/*` route starts with `if (!authorize(req, res)) return;`.
- Schema migrations are idempotent — re-running `schema.sql` must be safe.

### When you're done

Print:
1. The SQL to run against Neon.
2. The full env-var checklist with what each one is for.
3. The Vercel deploy steps.
4. A 3-line smoke test (curl `/api/check-resend`, submit `/onboard`,
   log into `/dashboard`).
