# Proposal: Production Build of newmusicwednesdayslive.com

**To:** CL
**From:** NMW Operations
**Re:** 4-week sprint to a fully automated event + revenue platform
**Decision needed by:** Day 1 of Week 1 (every day waited slips launch by a day — external API approvals are the long pole)

---

## TL;DR

Stand up a real platform for New Music Wednesdays in **4 weeks** that does, automatically, what one person currently does by hand:

- One event published in our CMS → auto-posted to **Eventbrite, Luma, DICE, Bandsintown, Songkick, Google Business Profile, Buffer (IG/FB/X/TikTok/Threads), WhatsApp opt-ins, The Blast, and the DJ Call agenda.**
- Artists apply → pay through **Stripe** → receipt + next-steps email auto-sent → record lands in our database and in the admin dashboard. No spreadsheets.
- All site copy, events, FAQ, podcast episodes, sponsor packages, and Blast issues editable in **Sanity Studio** by anyone on the team — no code, no developer.
- Total recurring service cost at current volume: **~$0/month** (free tiers cover us until we scale past 10k subscribers / $X in monthly revenue).

**Ask:** greenlight + sign-off on Stripe live-mode application (24 hr) + DNS access for the cutover.

---

## Why now

Right now, every Wednesday I (one person) repeat the same workflow:

1. Build the event listing and post it manually to ~9 platforms
2. Write 5–9 social posts and schedule them across 5 networks
3. Take RSVPs and applications by message and store them in notes
4. Send The Blast by hand and track open/click manually
5. Field sponsor inquiries through email threads with no pipeline

**This caps the room at one event per week and one operator.** It does not scale, it does not capture data, and the artist-pay flow leaks revenue at every handoff.

The proposal is to replace **all** of that with a single CMS publish + Stripe Checkout. The investment is 4 weeks of build; the return is permanent — every Wednesday after launch, the system runs itself and I spend that time on artist relationships, sponsor sales, and content, not data entry.

---

## What we're building (v1)

**Public site** (Next.js on Vercel, replacing the current static HTML)
- Same 12 pages we have today (Mission, Events, DJ Call, Podcast, Apply, FAQ, The Blast, Sponsor, Verify, Privacy, Terms, Home), polished and indexable
- Per-event pages with structured data (SEO authority compounds week over week — old events keep their URL forever)

**Artist + sponsor flow**
- Apply form → Stripe Checkout for the package they pick (Media Ready, One Mic, Performance Ready, Full Experience, Premiere)
- Promo codes validated server-side
- Receipt email + next-steps email auto-sent via Resend
- Sponsor inquiry → CRM-style admin pipeline

**Admin (Clerk-gated)**
- One button publishes an event to all 9 distribution channels
- One button sends a Blast issue (composed in Sanity) to subscribers
- View applications, RSVPs, sponsor inquiries, distribution status, retry failed pushes

**The Blast**
- Composed in Sanity Studio (Portable Text, no HTML knowledge needed)
- Auto-feature for every Wednesday's event
- Open + click tracking, double opt-in, list-unsubscribe header (anti-spam compliant)

**Identity verification**
- Bandsintown / Songkick / DICE artist-status check + screenshot upload
- Admin moderation queue (one-click approve/reject)

---

## What we're NOT building in v1 (so you know the trade-off)

- Ad-tracking pixels (Meta, TikTok, GA4 with full custom events) — launches with **Vercel Web Analytics** only (cookieless). Phase 2.
- Full Attio CRM sync — applications and inquiries land in our own admin in v1. CRM mirror in Phase 2.
- Per-event recap pages with full JSON-LD `Event → WorkExample` upgrades — basic event pages launch in v1; recap-mode comes in Phase 2.
- Blog content cadence + backlink campaign — Phase 2 SEO push (the platform supports it; we just don't fill it in v1).

None of these block launch. All are revenue-side polish, not operational leverage. They get scheduled into Weeks 5–8 once v1 is stable.

---

## Cost

| Service | Tier | Monthly cost at current volume |
|---|---|---|
| Vercel hosting | Hobby | $0 |
| Sanity CMS | Growth Free | $0 |
| Neon Postgres | Free | $0 |
| Clerk auth | Free (10k MAU) | $0 |
| Resend email | Free (3k/mo) | $0 |
| Vercel Blob (verification uploads) | Free | $0 |
| WhatsApp Business Cloud | Free (1k convos/mo) | $0 |
| Stripe | Pay-per-transaction (2.9% + 30¢) | Variable; tied to revenue |
| Buffer social scheduler | Free / Essentials | $0–$6 |
| **Domain (already owned)** | — | $0 |
| **Total fixed monthly** | | **~$0–$6** |

We pay only when we make money (Stripe) and only when we exceed the free tiers (subscriber count, email volume, etc.). At today's scale we're well inside every free tier.

**Build cost:** internal (operator + AI-assisted development). No external dev contractor.

---

## Timeline

| Week | Deliverable | Visible to CL |
|---|---|---|
| **1** | Next.js site live on staging URL, all pages migrated | Demo link end of week |
| **2** | Sanity Studio live, content migrated, Stripe Checkout in test mode, admin dashboard skeleton | Test purchase end of week |
| **3** | Distribution dashboard wired (Eventbrite, Luma, Buffer, GBP automated), Resend live, Stripe live mode | First auto-distributed Wednesday event |
| **4** | Bandsintown + Songkick + DICE + WhatsApp + verification queue → soft-launch | Production cutover, full system live |

**Day-1 actions that need CL sign-off** (these have external lead times we cannot shorten — 24 hrs to 7 days):

- [ ] Stripe live-mode application (CL signs as authorized rep — 24-48 hrs)
- [ ] DICE Partners API access request (multi-day review)
- [ ] WhatsApp Business + template pre-approval (3–7 days at Meta)
- [ ] Bandsintown for Artists + Songkick Tourbox API keys
- [ ] Google Business Profile claim for The Penthouse + NMW
- [ ] DNS access for the production cutover at end of Week 4

---

## Risk + mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| Stripe live-mode delay | Low | Submit Day 1, plenty of buffer |
| DICE API not granted by Week 4 | Medium | One-line copy-kit fallback for DICE only; everything else automated |
| WhatsApp template approval slow | Medium | Submit Day 1; if not approved by Week 4, ship without and add Week 5 |
| Sanity content migration | Low | One day of manual copy in Week 2; not on critical path |
| DNS propagation lag | Low | Cut DNS at start of Week 4 → 72 hr buffer |

If a slip happens, the order we drop scope is **WhatsApp → DICE → GBP → Bandsintown/Songkick**. The core funnel + Eventbrite + Luma + Buffer + Resend + Stripe + Sanity + Clerk + Postgres are non-negotiable for v1.

---

## What I need from CL

1. **Greenlight** to start Week 1 (today)
2. **Stripe live-mode authorization** (15 minutes of paperwork, you as authorized rep)
3. **DNS / domain registrar access** to point `newmusicwednesdayslive.com` at Vercel at end of Week 4
4. **30-min weekly demo slot** so you see progress live and we don't surprise each other at launch

That's the entire ask. Service costs are zero until we scale, the build is internal, and the upside is permanent: one operator running the show on Wednesday instead of doing distribution data entry on Tuesday.

---

**Recommendation:** approve. Every week we wait, I spend 6+ hours on tasks the system will do in 6 seconds.

— NMW Operations
