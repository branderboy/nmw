# NMW Migration Plan: Static → Next.js on Vercel + Sanity

This document is a checklist for migrating the current static site at
`branderboy/nmw` (HTML + localStorage prototype) to a production stack.

---

## Target stack

| Layer | Service | Plan |
|---|---|---|
| Hosting + serverless | **Vercel** | Hobby (free) to start; Pro when team grows |
| CMS | **Sanity** | Growth Free (3 users, 10k req/day) |
| Database | **Neon Postgres** | Free (10 projects, 0.5 GB storage) |
| Auth | **Clerk** | Free (10k MAU) |
| Payments | **Stripe** | Pay-as-you-go |
| Email | **Resend** | Free (3k emails/mo, 100/day) |
| File storage | **Vercel Blob** OR **Sanity Assets** | Sanity covers podcast/event imagery; Vercel Blob for verification screenshots |
| Outbound messaging | **WhatsApp Business Cloud API** | Free 1k convos/mo |
| Social scheduling | **Buffer** | Free / Essentials |

All free or near-free until the room scales.

---

## v1 Launch — Aggressive 3-week cut

The 13 phases below are the full production plan. To hit a 3-week launch we
ship a subset and defer the rest to post-launch iteration.

### In v1 (3 weeks)

| Week | Phases | Deliverable |
|---|---|---|
| **1** | 0–1 | Next.js shell on Vercel; all 9 public pages migrated 1:1; domain pointed; QA on staging |
| **2** | 2–5 | Sanity Studio live + content migrated; Postgres provisioned; `/api/apply` + Stripe Checkout (test mode) functional; Clerk admin gate live |
| **3** | 6 + polish | Resend wired; receipt + Blast confirmation emails; Stripe to live mode; SEO + favicon + OG-image polish (Phase 10 lite); soft-launch |

### Deferred to post-launch (Weeks 4–8+)

- **Phase 7** — Eventbrite/Luma/DICE/Bandsintown/Songkick distribution APIs
- **Phase 8** — WhatsApp Business Cloud broadcasts
- **Phase 9** — Verification file uploads (admin moderation queue)
- **Phase 11** — SEO content engine (per-event pages, podcast schema, blog)
- **Phase 12** — Pixels, GA4, Meta/TikTok, Attio CRM sync
- **Phase 13** — Full event distribution layer (Sanity → all channels)

### Cuts that make 3 weeks possible

- Distribution to external platforms (Eventbrite, Luma, DICE, etc.) remains
  **manual** for v1 — admin posts events to each platform by hand. Phase 13
  automates this, but a human can cover 1 event/week without it.
- Per-event SEO pages launch as a basic template (slug + lineup); the recap
  hub and JSON-LD expansion come in Phase 11.
- Sponsor checkout is **inquiry form → email follow-up** (already shipped on
  static site) rather than full Stripe Checkout for sponsor packages.
- WhatsApp opt-in field captured but no broadcasts until Phase 8 (template
  pre-approval alone takes 3–7 days at Meta).

### Risks to the 3-week timeline

1. **Sanity content migration** — manual one-time copy from current HTML to
   Sanity documents. Budget 1 day for this; can run in parallel during Week 2.
2. **Stripe live-mode approval** — sometimes takes 24–48 hrs. Start the Stripe
   account on day 1 of Week 1.
3. **DNS cutover** — propagation can lag. Cut DNS at start of Week 3 to leave
   72 hrs of buffer before soft-launch.

---

## Phase 0 — Repo prep (1 hour)

- [ ] Create `migration/` branch on the existing repo
- [ ] Add `.env.example` with every variable name listed in the env section below
- [ ] Add `vercel.json` (basic — just sets `framework: nextjs`)
- [ ] Lock the static site behind a `legacy/` folder so the new Next.js app can live at the root

## Phase 1 — Next.js shell on Vercel (1–2 days)

- [ ] `npx create-next-app@latest --typescript --tailwind --app`
- [ ] Port the global look-and-feel into `app/layout.tsx`:
  - urgency bar (scrolling marquee from `nmw.css`)
  - shared nav (`<Nav variant="light" | "dark" />`)
  - mobile hamburger drawer (already shipped — port the markup)
  - footer (`<Footer />`)
- [ ] Move `assets/nmw.css` content into `app/globals.css`
- [ ] Migrate routes (1:1 first, polish later):

  | Static file | Next.js route |
  |---|---|
  | `index.html` | `app/page.tsx` |
  | `mission.html` | `app/mission/page.tsx` |
  | `events.html` | `app/events/page.tsx` |
  | `dj-call.html` | `app/dj-call/page.tsx` |
  | `podcast.html` | `app/podcast/page.tsx` |
  | `apply.html` | `app/apply/page.tsx` |
  | `faq.html` | `app/faq/page.tsx` |
  | `alerts.html` | `app/the-blast/page.tsx` (rename to slug-friendly) |
  | `sponsor.html` | `app/sponsor/page.tsx` |
  | `verify.html` | `app/verify/page.tsx` |
  | `privacy.html` | `app/privacy/page.tsx` |
  | `terms.html` | `app/terms/page.tsx` |
  | `admin.html` | `app/admin/page.tsx` (gated by Clerk middleware) |

- [ ] Push to GitHub, hook up Vercel project, point `newmusicwednesdayslive.com` at Vercel
- [ ] Verify all 12 pages render against current production data (still localStorage at this stage)

## Phase 2 — Sanity content (2–3 days)

- [ ] Install via Vercel Marketplace → Sanity integration (sets env vars automatically)
- [ ] `npx sanity@latest init --env` → Growth Free project
- [ ] Embed Studio: route `app/studio/[[...tool]]/page.tsx` using `next-sanity/studio`
- [ ] Schemas (in `sanity/schemas/`):

  ```ts
  // page.ts        - generic CMS page (mission, terms, privacy, faq sections)
  // event.ts       - per-Wednesday event with date, lineup, capacity, image
  // sponsorshipProduct.ts  - id, name, icon, blurb, outcome, price, bundle
  // podcastEpisode.ts      - title, slug, audioUrl, transcript, guests, releaseDate
  // blastIssue.ts  - issue number, title, blocks (PortableText), heroImage, sentAt
  // faqItem.ts     - cat, question, answer (PortableText)
  // urgencyBar.ts  - singleton; current site-wide announcement
  // siteSettings.ts - singleton; brand colors, social URLs, default OG image
  ```

- [ ] Set up the Vercel Deploy Hook so publishing in Sanity triggers ISR revalidation
- [ ] Replace static page content with `next-sanity` queries:
  ```ts
  import { sanity } from '@/lib/sanity'
  export default async function Mission() {
    const data = await sanity.fetch(`*[_type == "page" && slug.current == "mission"][0]`)
    return <MissionView data={data} />
  }
  ```
- [ ] Migrate existing copy (urgency bar, hero text, FAQ items) into Sanity manually — one-time task

## Phase 3 — Database + transactional API (3–4 days)

- [ ] Provision Neon Postgres (free) → grab connection string
- [ ] Install Drizzle ORM (`drizzle-orm` + `drizzle-kit`)
- [ ] Schema (`db/schema.ts`):

  ```ts
  artists           id, slug, displayName, email, phone, location, genre,
                    instagram, youtube, spotify, appleMusic, sourceRef, createdAt
  applications      id, artistId, packageId, eventDateId, rainDateId, promoCodeId,
                    upsells[], goals[], status, totalCents, stripeSessionId,
                    rulesAgreedAt, createdAt
  bookings          id, applicationId, eventDateId, status, paidAt, refundedAt
  events            id, dateISO, capacity, status, sanityId
  promoCodes        code (unique), type ('percent'|'amount'), value, maxUses, expiresAt
  promoRedemptions  id, promoCodeId, applicationId, redeemedAt
  subscribers       id, email (unique), name, phone, genre, topics[], iAmArtist,
                    optInToken, optInAt, unsubAt, createdAt
  blastSends        id, sanityIssueId, recipientCount, sentAt
  blastEvents       id, sendId, subscriberId, type ('open'|'click'), targetUrl, at
  sponsorInquiries  id, brandName, contactName, email, phone, lineItems(jsonb),
                    estimatedBudgetCents, message, status, createdAt
  referrals         id, ownerArtistId, code (unique), invites, registrations
  verificationUploads id, artistId, platform, fileUrl, status, reviewedAt
  whatsappOptins    id, artistId, phone, optedInAt, optedOutAt
  ```

- [ ] API routes:

  | Route | Purpose |
  |---|---|
  | `POST /api/lead` | homepage form → insert artist + application stub |
  | `POST /api/apply` | apply form step 1 commit |
  | `POST /api/checkout` | create Stripe Checkout Session for an application |
  | `POST /api/stripe/webhook` | mark booking paid, send receipt+next-steps email |
  | `POST /api/promo/validate` | validate code against `promoCodes` |
  | `POST /api/subscribe` | The Blast subscribe (double opt-in) |
  | `GET  /api/u?t=<token>` | unsubscribe |
  | `GET  /api/r?u=<url>&i=<issueId>` | click tracker → 302 redirect |
  | `GET  /api/o.gif?i=<sendId>&s=<subId>` | open-pixel tracker |
  | `POST /api/sponsor-inquiry` | sponsor inquiry write + Resend notify |
  | `POST /api/admin/blast/send` | render Sanity blast issue and queue Resend send |
  | `POST /api/admin/event/distribute` | push event to Eventbrite/Luma/DICE/Bandsintown/Songkick |
  | `POST /api/admin/whatsapp/broadcast` | template-message broadcast |

- [ ] Migrate `nmw.js` `PACKAGES` constant into `lib/packages.ts` (keep client-side; promo lookup is server-side)

## Phase 4 — Auth (½ day)

- [ ] Clerk free tier
- [ ] `middleware.ts` protects `/admin/*` and `/api/admin/*`
- [ ] Studio uses Sanity's own auth (no Clerk needed there)

## Phase 5 — Stripe (1 day)

- [ ] Stripe account + test-mode keys
- [ ] Create Products + Prices (one per package: Media Ready, One Mic, Performance Ready, Full Experience, Premiere)
- [ ] Mirror promo codes as Stripe Coupons (one cron / admin-button to sync)
- [ ] `/api/checkout` builds a Session with `line_items` + `discounts`
- [ ] Webhook secret in env, `stripe listen --forward-to` for local dev
- [ ] Test end-to-end with `4242 4242 4242 4242` then switch to live keys

## Phase 6 — Resend + The Blast (2 days)

- [ ] Resend account → verify `nmw@digiwaxx.com` (or dedicated domain)
- [ ] Templates: receipt, next-steps, blast-confirmation, sponsor-inquiry-internal
- [ ] Build `app/the-blast/[slug]/page.tsx` — public archive, queries Sanity
- [ ] Admin compose UI is just **edit in Sanity Studio**, then click "Send" in the admin dashboard which calls `/api/admin/blast/send`
- [ ] Server: render the Sanity issue's PortableText to HTML + plain text, batch-send via Resend
- [ ] List-Unsubscribe header on every send

## Phase 7 — Distribution & integrations (2–3 days)

- [ ] Eventbrite OAuth + Events API → POST event
- [ ] Luma via their API (or fall back to manual create + paste link)
- [ ] DICE via Partners API (manual paste fallback for small events)
- [ ] Bandsintown for Artists API for per-artist event push
- [ ] Songkick Tourbox API
- [ ] Buffer API for social scheduling (queue Wednesday recap clips)
- [ ] Each integration is a serverless function called from an admin button

## Phase 8 — WhatsApp (1 day)

- [ ] Meta Business → WhatsApp Business Cloud API
- [ ] Verify number + display name
- [ ] Pre-approve message templates: `show_reminder`, `dj_call_reminder`, `verification_nudge`, `promo_drop`
- [ ] Subscribers opt-in via the alerts page (added phone field already exists)
- [ ] `/api/admin/whatsapp/broadcast` sends approved templates by segment

## Phase 9 — File storage for verification (½ day)

- [ ] Vercel Blob (private)
- [ ] `/api/verification/upload` returns a signed URL
- [ ] Admin moderation queue lists pending uploads, approve/reject buttons

## Phase 10 — Analytics & SEO polish (1 day)

- [ ] Plausible or Vercel Analytics
- [ ] Verify Google Search Console + submit sitemap
- [ ] Switch sitemap.xml to dynamic (`app/sitemap.ts`)
- [ ] Switch OG images from logo to per-page generated images via `next/og`

## Phase 11 — SEO content engine (ongoing, kicks off week 4)

Goal: turn every event, podcast episode, and Blast issue into its own indexable page that earns ranking over time.

- [ ] **Per-event pages** (`/events/[slug]`) — single canonical URL covers the entire event lifecycle
  - Pre-event: lineup, RSVP, share, "apply to perform"
  - Post-event: recap video, photo gallery, press quotes, social embeds
  - JSON-LD `Event` schema with `performer`, `location`, `offers`, `image`
- [ ] **`/events`** is the **recap hub** in the nav: hero next-Wednesday card → upcoming list → recent recaps grid → archive. Each card links to `/events/[slug]`.
- [ ] **`/podcast/[slug]`** episode pages with `PodcastEpisode` schema, transcript, embedded audio, guest links
- [ ] **`/the-blast/[slug]`** issue archive pages with `Article` schema
- [ ] **`/blog`** content engine in Sanity (1–2 posts/week — artist features, recap deep-dives, industry talk)
- [ ] **Local SEO**: claim Google Business Profile for The Penthouse + NMW; add `LocalBusiness` schema
- [ ] **Internal linking**: every event recap links to performing artists' pages → links back to `/apply` and `/podcast`
- [ ] **Backlink push**: pitch Pitchfork / FADER / Hot 97 / Hypebot / Time Out NY / Resident Advisor when recaps land
- [ ] **Schema enhancements**: `BreadcrumbList`, `FAQPage` on faq route, `VideoObject` per recap
- [ ] **Performance**: AVIF/WebP via `next/image`, lazy-load below-fold, Lighthouse LCP < 2s on mobile

Target keyword clusters (60-day):
- "open mic Manhattan", "live music Wednesday NYC"
- per-event: artist names + "live at The Penthouse"
- "submit music DJ network", "DJ record pool"
- "NYC music podcast", "urban music industry podcast"

## Phase 12 — Pixels, analytics, light CRM (½ day)

- [ ] **Google Tag Manager** container in `app/layout.tsx`, gated behind cookie consent
- [ ] Through GTM, fire:
  - **GA4** with custom events: `apply_step_1`, `apply_step_4`, `checkout_started`, `purchase`, `subscribe`, `share_clicked`, `rsvp_clicked`
  - **Meta Pixel** (`PageView`, `Lead`, `Purchase`, custom `Apply`)
  - **TikTok Pixel** (same events)
  - **LinkedIn Insight Tag** for sponsor retargeting
- [ ] **Vercel Web Analytics** (cookieless, page-view rollups) — one toggle in dashboard
- [ ] **Cookie consent**: Cookiebot (free <100 pages) or Termly; tracking pixels gated until consent
- [ ] **Light CRM** = **Attio Free** (3 users)
  - Two pipelines: `Bookings` (artist applications) and `Sales` (sponsor inquiries)
  - Webhook from `/api/apply` → POST to Attio API → creates a `People` + `Booking` record
  - Webhook from `/api/sponsor-inquiry` → creates a `Companies` + `Sales` record
  - Resend syncs email threads back into Attio (native integration)
- [ ] Add UTM-aware lead capture so source/medium/campaign land in CRM and Postgres

## Phase 13 — Event distribution layer (3 days)

This is the system that fans out **one event published in Sanity** to **every public channel**, automatically.

### Architecture

```
Sanity event published
        │
        ▼
Sanity Webhook → /api/events/distribute
                 (validates, enqueues per-channel jobs in event_distributions table)
                 │
                 ├──▶ /api/distribute/eventbrite       (POST event via API)
                 ├──▶ /api/distribute/luma             (POST event via API)
                 ├──▶ /api/distribute/dice             (POST event via API; fallback: copy-paste kit)
                 ├──▶ /api/distribute/bandsintown      (per-artist POST for each lineup performer)
                 ├──▶ /api/distribute/songkick         (Tourbox API per-artist)
                 ├──▶ /api/distribute/buffer           (queues 7 posts across IG/FB/X/TikTok/Threads)
                 ├──▶ /api/distribute/gbp              (Google Business Profile post)
                 ├──▶ /api/distribute/blast            (queues a Blast feature for next Tuesday)
                 ├──▶ /api/distribute/whatsapp         (T-3hr template send to opt-ins)
                 └──▶ /api/distribute/dj-call          (adds to next Tuesday DJ Call agenda)

Each writes back to event_distributions:
  status:  queued | sent | failed
  remoteUrl, remoteId, sentAt, error
```

### Postgres schema additions (extend Phase 3)

```ts
event_distributions    id, eventId, channel, status, remoteId, remoteUrl,
                       payload (jsonb), error, queuedAt, sentAt, retryCount

distribution_schedule  id, eventId, channel, scheduledFor, payload (jsonb), status
```

### Buffer cadence per event (auto-queued)

| When | Network | Content |
|---|---|---|
| T-7 days | All | Lineup announce post, links to `/events/[slug]` |
| T-5 days | IG / FB | First artist spotlight (rotating per day) |
| T-3 days | All | "3 days out" reminder + RSVP link |
| T-1 day | All | "Tomorrow night" |
| T-3 hours | WhatsApp + IG Story | Doors-soon ping |
| T+0 | IG / TikTok Story | Live snaps |
| T+1 day | All | Recap clip → `/events/[slug]/#recap` |
| T+3 days | IG / TikTok / X | Best-of compilation |
| T+7 days | All | Tease for next week's event |

That's ~9 scheduled posts × 5–6 networks per Wednesday, **all from one Buffer queue, all auto-generated from Sanity content.**

### Admin distribution dashboard (`/admin/events/[id]/distribute`)

- Table view of every channel × status (queued / sent / failed)
- "Re-push" button per row when an API fails
- "Open in [platform]" link once published
- Distribution-kit fallback (copy/paste blocks for any channel without an API — DICE, sometimes Luma)
- Manual override: edit caption per channel before publishing

### Lifecycle invariants

- **One canonical URL per event** = `/events/[slug]`. Every distributed link points there. No `/recap/[slug]` separate page — the same URL transitions from "RSVP" mode to "Recap" mode based on `eventDate < now()`.
- **JSON-LD on `/events/[slug]`** stays Event-typed before, gains `WorkExample` references (recap video) after.
- **Old events never delete** — they keep their URL forever (SEO authority + permanent press kit per artist).

### Rollout order

1. Eventbrite + Luma APIs first (highest immediate value)
2. Buffer next (covers all socials in one connector)
3. Bandsintown + Songkick per-artist (requires artist consent + token storage)
4. Google Business Profile (manual fallback works fine until then)
5. DICE last (heaviest API gate; manual copy-paste fine for v1)

---

## Environment variables (`.env.example`)

```bash
# Vercel + Next
NEXT_PUBLIC_SITE_URL=https://www.newmusicwednesdayslive.com

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2026-01-01
SANITY_API_READ_TOKEN=
SANITY_REVALIDATE_SECRET=

# Neon
DATABASE_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=hello@newmusicwednesdayslive.com

# Vercel Blob (verification uploads)
BLOB_READ_WRITE_TOKEN=

# WhatsApp Business Cloud
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=

# Eventbrite / Luma / DICE / Bandsintown / Songkick
EVENTBRITE_PRIVATE_TOKEN=
LUMA_API_KEY=
DICE_API_KEY=
BANDSINTOWN_APP_ID=
SONGKICK_API_KEY=

# Buffer
BUFFER_ACCESS_TOKEN=
```

---

## Sequence summary

| Week | Deliverable |
|---|---|
| 1 | Vercel + Next.js shell live on the prod domain (still pulls from old data) |
| 2 | Sanity Studio live, all marketing copy migrated, ISR working |
| 3 | Postgres schema deployed, `/api/apply` + Stripe Checkout functional in test mode |
| 4 | Resend wired, The Blast send pipeline working, double opt-in flow |
| 5 | Eventbrite + Luma push, sponsor inquiry, WhatsApp templates approved |
| 6 | Polish, analytics, switch Stripe to live mode, soft-launch |

The list is intentionally pessimistic — most weeks have buffer.

---

## Things that don't migrate

- `index2.html` — design preview, already `noindex`; drop after Next.js shell ships
- `elements.html` — internal style guide, already `noindex`; drop or move to `/_internal/elements` behind Clerk
- `admin.html` / `dashboard.html` / `verify.html` — replaced by Next.js routes (`/admin`, `/dashboard`, `/verify`)
- `nmw.js` — full rewrite as TypeScript modules in `lib/`
- `assets/nmw.css` — port to `app/globals.css`, keep brand variables, drop Tailwind fallback shims (Next's Tailwind handles this)
- The `data-cms` localStorage CMS layer — Sanity replaces it
- The mobile drawer JS — Next.js component using `useState`

## Files that belong to a separate site (do NOT migrate or delete)

- `landing-page.html`
- `blog.html`
- `mixtapes.html`

These are content for a different property that happens to share this repo.
Leave them in place; they are not part of NMW's production migration.

---

End of plan.
