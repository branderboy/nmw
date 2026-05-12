// NMW shared client state + utilities
// Prototype: localStorage-backed, no backend.

const NMW = (() => {
  const KEYS = {
    artist: 'nmw.artist',
    funnel: 'nmw.funnel',
    artists: 'nmw.artists',
    blast: 'nmw.blast',
    referrals: 'nmw.referrals',
    events: 'nmw.events',
    slots: 'nmw.slots',
    sponsors: 'nmw.sponsors',
    djs: 'nmw.djs',
    flows: 'nmw.flows',
    flowRuns: 'nmw.flowRuns',
    siteContent: 'nmw.siteContent',
    promoCodes: 'nmw.promoCodes',
  };

  const DEFAULT_SLOT_CAPACITY = 3;

  const SPONSOR_STATUS = Object.freeze({
    PENDING: 'pending_approval',
    IN_REVIEW: 'in_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  });

  const PACKAGES = [
    { id: 'media-ready', name: 'Media Ready', price: 200, tier: 'entry',
      blurb: 'Press-ready coverage and editorial visibility.',
      perks: ['Editorial mention', 'Media pit access', 'Photo coverage'] },
    { id: 'one-mic', name: 'One Mic Visual Session', price: 250, tier: 'entry',
      blurb: 'Cinematic visual session built for content rollout.',
      perks: ['Studio visual session', 'Cinematic edit', 'Reel-ready clips'] },
    { id: 'performance-ready', name: 'Performance Ready', price: 395, tier: 'performance',
      blurb: 'Live performance slot + full event distribution.',
      perks: ['Live performance slot', 'Event distribution', 'Bandsintown / Songkick / DICE', 'Artist verification'] },
    { id: 'full-experience', name: 'Full Experience', price: 650, tier: 'performance',
      blurb: 'Performance + extended media + content package.',
      perks: ['Everything in Performance Ready', 'Interview segment', 'Photo + clip package', 'Promo asset bundle'] },
    { id: 'premiere', name: 'The Premiere Package', price: 899, tier: 'performance',
      blurb: 'Top-tier rollout with premium positioning.',
      perks: ['Headline-style placement', 'Featured editorial', 'Full media kit', 'Priority DICE rollout'] },
  ];

  const GOALS = [
    'Build awareness',
    'Push a new release',
    'Get DJ feedback',
    'Grow locally',
    'Build industry relationships',
    'Promote an upcoming project',
    'Go viral/create content',
    'Test a record',
    'Build a fanbase',
    'Increase streams',
    'Improve discoverability',
  ];

  const UPSELLS = {
    'regular':       { id: 'regular', name: 'Regular Distribution', price: 150,
                       blurb: 'Baseline distribution push for awareness.' },
    'regular-plus':  { id: 'regular-plus', name: 'Regular Plus', price: 250,
                       blurb: 'Stronger push for new release rollouts.' },
    'advance':       { id: 'advance', name: 'Advance', price: 350,
                       blurb: 'Targeted DJ feedback and tastemaker reach.' },
    'advance-plus':  { id: 'advance-plus', name: 'Advance Plus', price: 600,
                       blurb: 'Streaming-focused amplification campaign.' },
  };

  // Goal → recommended upsell IDs
  const GOAL_RECS = {
    'Build awareness':            ['regular'],
    'Push a new release':         ['regular-plus'],
    'Get DJ feedback':            ['advance'],
    'Increase streams':           ['advance-plus'],
    'Go viral/create content':    ['regular-plus'],
    'Test a record':              ['advance'],
    'Promote an upcoming project':['regular-plus'],
    'Build industry relationships':['advance'],
    'Improve discoverability':    ['regular-plus'],
    'Grow locally':               ['regular'],
    'Build a fanbase':            ['regular-plus'],
  };

  const REFERRAL_TIERS = [
    { count: 3,  reward: 'Priority line access' },
    { count: 5,  reward: 'Free ticket' },
    { count: 10, reward: 'Interview consideration + featured placement' },
  ];

  // ---- storage helpers ----
  const get = (k, fallback = null) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
    catch (_) { return fallback; }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch (err) {
      // Quota exceeded is the realistic failure (large image dataURLs in screenshots)
      const msg = err && err.name === 'QuotaExceededError'
        ? 'Browser storage is full. Try a smaller screenshot or clear old data.'
        : 'Could not save: ' + (err && err.message ? err.message : 'unknown error');
      // Surface to user; admins are the ones who hit this most often
      if (typeof console !== 'undefined') console.warn('[NMW] localStorage write failed for', k, err);
      if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(msg);
      return false;
    }
  };

  const getFunnel = () => get(KEYS.funnel, { package: null, goals: [], upsells: [], info: {}, blast: false });
  const setFunnel = (f) => set(KEYS.funnel, f);

  const getArtist = () => get(KEYS.artist);
  const setArtist = (a) => set(KEYS.artist, a);

  const getArtists = () => get(KEYS.artists, []);
  const saveArtist = (artist) => {
    const all = getArtists();
    const idx = all.findIndex(a => a.id === artist.id);
    if (idx >= 0) all[idx] = artist; else all.push(artist);
    set(KEYS.artists, all);
  };

  const getBlast = () => get(KEYS.blast, []);
  const addBlast = (entry) => { const b = getBlast(); b.push(entry); set(KEYS.blast, b); };

  const getEvents = () => get(KEYS.events, []);
  const saveEvent = (e) => { const all = getEvents(); all.push(e); set(KEYS.events, all); };
  const setEvents = (all) => set(KEYS.events, all);

  const getSponsors = () => get(KEYS.sponsors, []);
  const addSponsor = (entry) => {
    const all = getSponsors();
    all.push({
      id: 'sp_' + Math.random().toString(36).slice(2, 10),
      submittedAt: new Date().toISOString(),
      status: SPONSOR_STATUS.PENDING,
      ...entry,
    });
    set(KEYS.sponsors, all);
  };
  const updateSponsor = (id, patch) => {
    const all = getSponsors();
    const idx = all.findIndex(s => s.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
    set(KEYS.sponsors, all);
    return all[idx];
  };

  // ---- Email Flows ----
  const DEFAULT_FLOWS = [
    { id: 'flow_welcome', name: 'Welcome — Performance Tier', trigger: 'Artist booked performance package', audience: 'artists',
      subject: "You've booked a performance slot — verify within 24 hours",
      body: "Hi {{artistName}},\n\nYour {{packageName}} is confirmed for {{eventDate}}.\n\nPlease complete these 3 steps within 24 hours so we can put your event into distribution:\n\n1. Sign up & claim Bandsintown — https://artists.bandsintown.com\n2. Sign up & claim Songkick / Tourbox — https://www.songkick.com/tourbox\n3. Create or claim your DICE artist account — https://dice.fm\n\nUpload screenshot proof at: {{verifyLink}}\n\n— NMW",
      status: 'active' },
    { id: 'flow_verify_reminder', name: '24h Verification Reminder', trigger: '24h after checkout if not verified', audience: 'artists',
      subject: 'Quick reminder: verify your artist profiles',
      body: "Hey {{artistName}}, your distribution is on hold until we confirm Bandsintown, Songkick, and DICE. Upload your screenshots here: {{verifyLink}}",
      status: 'active' },
    { id: 'flow_blast_weekly', name: 'The Blast — Weekly', trigger: 'Every Tuesday 6 AM ET', audience: 'blast',
      subject: 'This Wednesday at NMW · {{lineupHint}}',
      body: "What's hitting the stage this Wednesday, plus subscriber-only drops, free giveaways, and new music picks. RSVP: {{rsvpLink}}",
      status: 'active' },
    { id: 'flow_dj_call_invite', name: 'DJ Call — Tuesday Reminder', trigger: 'Every Tuesday 8 PM ET', audience: 'djs',
      subject: 'Tomorrow · DJ Call · 4 PM ET on Zoom',
      body: "Standing Zoom link: {{zoomLink}}\n\nThis week's spotlight: {{theme}}. See you on the call.",
      status: 'active' },
    { id: 'flow_sponsor_received', name: 'Sponsor — Inquiry Received', trigger: 'Sponsor submits inquiry', audience: 'sponsors',
      subject: 'We received your sponsorship inquiry',
      body: "Hi {{name}}, we received your inquiry for {{company}}. Our partnerships team will review and follow up within 2 business days.",
      status: 'active' },
    { id: 'flow_sponsor_approved', name: 'Sponsor — Approved', trigger: 'Admin approves sponsor inquiry', audience: 'sponsors',
      subject: 'Your sponsorship has been approved',
      body: "Hi {{name}}, your selected partnership package has been approved. Our partnerships team will be in touch shortly to lock in scheduling and details.",
      status: 'active' },
    { id: 'flow_post_event', name: 'Post-Event Content Drop', trigger: '24h after performance', audience: 'artists',
      subject: 'Your NMW recap is here',
      body: "Hi {{artistName}}, your performance clips, photos, and recap content are ready. Share your appearance: {{shareLink}}",
      status: 'active' },
  ];

  const getFlows = () => {
    const stored = get(KEYS.flows);
    // Only seed defaults on first ever read (null = never written).
    // An empty array means the user explicitly removed everything — respect that.
    if (stored !== null) return stored;
    set(KEYS.flows, DEFAULT_FLOWS);
    return DEFAULT_FLOWS;
  };
  const saveFlow = (flow) => {
    const all = getFlows();
    const idx = all.findIndex(f => f.id === flow.id);
    if (idx >= 0) all[idx] = flow; else all.push(flow);
    set(KEYS.flows, all);
  };
  const deleteFlow = (id) => {
    const all = getFlows().filter(f => f.id !== id);
    set(KEYS.flows, all);
  };
  const getFlowRuns = () => get(KEYS.flowRuns, []);
  const recordFlowRun = (flowId, audienceCount) => {
    const all = getFlowRuns();
    // mock open + click rates for demo analytics
    const openRate = 0.28 + Math.random() * 0.25;
    const clickRate = 0.04 + Math.random() * 0.10;
    all.push({
      id: 'run_' + Math.random().toString(36).slice(2, 10),
      flowId, audienceCount,
      sent: audienceCount,
      opens: Math.round(audienceCount * openRate),
      clicks: Math.round(audienceCount * clickRate),
      runAt: new Date().toISOString(),
    });
    set(KEYS.flowRuns, all);
  };

  // ---- Page content (CMS) ----
  const DEFAULT_SITE_CONTENT = {
    urgencyBar: 'Attention Artists: Only 5 Event & Press Packages Left For Next Wednesday!',
    heroEyebrow: '[ Official Artist Registration ]',
    heroHeadline: "Secure Your Live Performance & Press Package At Manhattan's Top Destination For New Music.",
    heroSubhead: 'Perform live at The Penthouse NYC, secure guaranteed press coverage, capture high-end visual assets, and ignite your rollout in The Next Up Experience.',
    primaryCta: 'Yes! Start My Rollout Now',
    primaryCtaSub: 'Click Here To See Package Options & Secure Your Spot',
  };
  const getSiteContent = () => Object.assign({}, DEFAULT_SITE_CONTENT, get(KEYS.siteContent, {}));
  const saveSiteContent = (patch) => {
    const merged = Object.assign({}, getSiteContent(), patch);
    set(KEYS.siteContent, merged);
  };
  const resetSiteContent = () => localStorage.removeItem(KEYS.siteContent);

  // Apply editable site content on page load.
  // Pages opt-in by tagging elements with data-cms="<key>".
  // Idempotent: always writes the current value, so resetting to default works.
  const CMS_KEYS = ['urgencyBar', 'heroEyebrow', 'heroHeadline', 'heroSubhead', 'primaryCta', 'primaryCtaSub'];
  const applySiteContent = () => {
    if (typeof document === 'undefined') return;
    const c = getSiteContent();
    CMS_KEYS.forEach(key => {
      document.querySelectorAll(`[data-cms="${key}"]`).forEach(el => {
        // textContent is safe; never use innerHTML for CMS values to avoid XSS
        el.textContent = c[key] != null ? c[key] : '';
      });
    });
  };

  const getDJs = () => get(KEYS.djs, []);
  const addDJ = (entry) => {
    const all = getDJs();
    all.push({ id: 'dj_' + Math.random().toString(36).slice(2, 10), submittedAt: new Date().toISOString(), ...entry });
    set(KEYS.djs, all);
  };

  // Recurring weekly DJ Call calendar link (Wednesdays 4-6PM)
  const djCallCalendarLink = () => {
    const start = nextWednesday();
    start.setHours(16, 0, 0, 0); // 4PM
    return buildCalendarLink({
      title: 'Digiwaxx DJ Call · NMW',
      start,
      durationHours: 2,
      details: 'Weekly Digiwaxx DJ Call — every Wednesday 4-6PM ET on Zoom. Live roundtable with DJs nationwide. Edited audio releases on the NMW Podcast.',
      location: 'Zoom (link sent to confirmed DJs)',
      recurring: true,
    });
  };

  // ---- domain logic ----
  const recommendUpsells = (goals) => {
    const ids = new Set();
    (goals || []).forEach(g => (GOAL_RECS[g] || []).forEach(id => ids.add(id)));
    return [...ids].map(id => UPSELLS[id]).filter(Boolean);
  };

  const generateReferralCode = (artistName) => {
    const slug = (artistName || 'artist').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 10) || 'artist';
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${slug}-${rand}`;
  };

  const referralLink = (code) => {
    const origin = location.origin || '';
    const base = location.pathname.replace(/[^/]*$/, '');
    return `${origin}${base}landing.html?ref=${encodeURIComponent(code)}`;
  };

  const isPerformanceTier = (pkgId) => {
    const p = PACKAGES.find(p => p.id === pkgId);
    return p && p.tier === 'performance';
  };

  const totalPrice = (funnel) => {
    const pkg = PACKAGES.find(p => p.id === funnel.package);
    const pkgPrice = pkg ? pkg.price : 0;
    const upsellPrice = (funnel.upsells || []).reduce((s, id) => s + (UPSELLS[id]?.price || 0), 0);
    const subtotal = pkgPrice + upsellPrice;
    const discount = funnel.promo ? promoDiscount(funnel.promo, subtotal) : 0;
    return Math.max(0, subtotal - discount);
  };

  // ---------- Promo / offer codes ----------
  const DEFAULT_PROMOS = [
    { code: 'NMW10',   type: 'percent', value: 10, label: '10% off' },
    { code: 'WELCOME', type: 'amount',  value: 50, label: '$50 off' },
    { code: 'VIP20',   type: 'percent', value: 20, label: '20% off' },
  ];
  const getPromoCodes = () => {
    const stored = get(KEYS.promoCodes);
    if (Array.isArray(stored)) return stored;
    set(KEYS.promoCodes, DEFAULT_PROMOS);
    return DEFAULT_PROMOS.slice();
  };
  const setPromoCodes = (list) => set(KEYS.promoCodes, list);
  const findPromoCode = (code) => {
    const c = (code || '').trim().toUpperCase();
    if (!c) return null;
    return getPromoCodes().find(p => (p.code || '').toUpperCase() === c) || null;
  };
  const promoDiscount = (promo, subtotal) => {
    if (!promo || !subtotal) return 0;
    if (promo.type === 'percent') return Math.round(subtotal * (Number(promo.value) || 0) / 100);
    if (promo.type === 'amount')  return Math.min(subtotal, Number(promo.value) || 0);
    return 0;
  };

  const nextWednesday = () => {
    const d = new Date();
    const day = d.getDay();
    const add = (3 - day + 7) % 7 || 7; // upcoming Wednesday (skip today)
    d.setDate(d.getDate() + add);
    d.setHours(19, 0, 0, 0);
    return d;
  };

  const fmtDate = (d) => d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  const googleCalendarLink = (artistName) => buildCalendarLink({
    title: `New Music Wednesdays | ${artistName || 'NMW'} LIVE`,
    start: nextWednesday(),
    recurring: true,
  });

  const buildCalendarLink = ({ title, start, durationHours = 2.5, details, location = 'The Penthouse NYC', recurring = false }) => {
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    const fmt = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${fmt(start)}/${fmt(end)}`,
      details: details || 'New Music Wednesdays at The Penthouse NYC. Doors 3PM | DJ Call 3-7PM | Live 7-9:30PM. Hosted by Anna Nyakana, CL, Chrys Childs.',
      location,
    });
    if (recurring) params.append('recur', 'RRULE:FREQ=WEEKLY;BYDAY=WE');
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  // ---- slot management ----
  const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

  const getSlots = () => get(KEYS.slots, {});
  const setSlots = (obj) => set(KEYS.slots, obj);

  const getSlot = (key) => {
    const all = getSlots();
    return all[key] ? { capacity: DEFAULT_SLOT_CAPACITY, bookings: [], ...all[key] }
                    : { capacity: DEFAULT_SLOT_CAPACITY, bookings: [] };
  };

  const saveSlot = (key, slot) => {
    const all = getSlots();
    all[key] = slot;
    setSlots(all);
  };

  const slotAvailable = (key) => {
    const s = getSlot(key);
    return Math.max(0, s.capacity - s.bookings.length);
  };

  const slotIsFull = (key) => slotAvailable(key) === 0;

  const bookSlot = (key, booking) => {
    const slot = getSlot(key);
    if (slot.bookings.find(b => b.artistId && b.artistId === booking.artistId)) return true;
    if (slot.bookings.length >= slot.capacity) return false;
    slot.bookings.push({ bookedAt: new Date().toISOString(), ...booking });
    saveSlot(key, slot);
    return true;
  };

  const removeBookingByArtist = (key, artistId) => {
    const slot = getSlot(key);
    slot.bookings = slot.bookings.filter(b => b.artistId !== artistId);
    saveSlot(key, slot);
  };

  const removeBookingAt = (key, index) => {
    const slot = getSlot(key);
    slot.bookings.splice(index, 1);
    saveSlot(key, slot);
  };

  const setSlotCapacity = (key, capacity) => {
    const slot = getSlot(key);
    slot.capacity = Math.max(slot.bookings.length, capacity);
    saveSlot(key, slot);
  };

  // Generate the next N weekly Wednesday events (lineup + headliner)
  const upcomingWednesdays = (count = 8) => {
    const out = [];
    const first = nextWednesday();
    for (let i = 0; i < count; i++) {
      const d = new Date(first);
      d.setDate(first.getDate() + i * 7);
      d.setHours(19, 0, 0, 0);
      out.push(d);
    }
    return out;
  };

  // create artist record from funnel + payment
  const completeCheckout = () => {
    const funnel = getFunnel();
    const info = funnel.info || {};
    const id = 'art_' + Math.random().toString(36).slice(2, 10);
    const pkg = PACKAGES.find(p => p.id === funnel.package);
    const performance = isPerformanceTier(funnel.package);
    const refCode = generateReferralCode(info.artistName);
    const eventDate = performance && funnel.eventDate
      ? new Date(funnel.eventDate)
      : (performance ? nextWednesday() : null);

    const artist = {
      id,
      createdAt: new Date().toISOString(),
      name: info.name || '',
      email: info.email || '',
      phone: info.phone || '',
      artistName: info.artistName || '',
      genre: info.genre || '',
      instagram: info.instagram || '',
      package: pkg,
      upsells: (funnel.upsells || []).map(id => UPSELLS[id]).filter(Boolean),
      goals: funnel.goals || [],
      blast: !!funnel.blast,
      total: totalPrice(funnel),
      performanceSlot: performance,
      verification: {
        bandsintown: { status: 'pending', url: null },
        songkick:    { status: 'pending', url: null },
        dice:        { status: 'pending', url: null },
        approved: false,
      },
      referral: {
        code: refCode,
        invites: 0,
        registrations: 0,
        unlocked: [],
      },
      event: performance ? {
        title: `New Music Wednesdays at The Penthouse NYC | ${info.artistName || 'Artist'} LIVE`,
        date: eventDate.toISOString(),
        venue: 'The Penthouse NYC',
        tier: pkg?.name,
      } : null,
    };
    setArtist(artist);
    saveArtist(artist);
    if (artist.event) saveEvent(artist.event);
    if (performance && eventDate) {
      bookSlot(dateKey(eventDate), {
        artistId: id,
        artistName: info.artistName || info.name || 'Artist',
        tier: pkg?.name,
        manual: false,
      });
    }
    if (artist.blast) addBlast({ email: artist.email, phone: artist.phone, genre: artist.genre, artistId: id });
    return artist;
  };

  const updateCurrentArtist = (mut) => {
    const a = getArtist();
    if (!a) return null;
    mut(a);
    setArtist(a);
    saveArtist(a);
    return a;
  };

  const reset = () => Object.values(KEYS).forEach(k => localStorage.removeItem(k));

  // seed admin demo data once
  const seedDemoIfEmpty = () => {
    if (getArtists().length) return;
    const weds = upcomingWednesdays(8);
    const demo = [
      { name: 'Jordan Pierce', artistName: 'JP', genre: 'R&B', pkg: 'performance-ready', goals: ['Push a new release'], status: 'pending' },
      { name: 'Maya Cole', artistName: 'Maya C', genre: 'Soul', pkg: 'full-experience', goals: ['Go viral/create content'], status: 'verified' },
      { name: 'Andre Hall', artistName: 'Dre H', genre: 'Hip Hop', pkg: 'media-ready', goals: ['Build awareness'], status: 'na' },
      { name: 'Lila Ortiz', artistName: 'LILA', genre: 'Afro-Pop', pkg: 'premiere', goals: ['Increase streams'], status: 'pending' },
    ];
    // assign demo artists to different upcoming Wednesdays
    const dateForIdx = [weds[0], weds[1], null, weds[2]];
    demo.forEach((d, i) => {
      const pkg = PACKAGES.find(p => p.id === d.pkg);
      const performance = pkg.tier === 'performance';
      const evDate = performance ? (dateForIdx[i] || weds[0]) : null;
      const a = {
        id: 'demo_' + i,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        name: d.name, email: `${d.artistName.toLowerCase().replace(/\s/g,'')}@example.com`,
        phone: '', artistName: d.artistName, genre: d.genre, instagram: '@' + d.artistName.toLowerCase().replace(/\s/g,''),
        package: pkg, upsells: [], goals: d.goals, blast: i % 2 === 0,
        total: pkg.price, performanceSlot: performance,
        verification: {
          bandsintown: { status: d.status === 'verified' ? 'approved' : (performance ? 'submitted' : 'na'), url: performance ? '#' : null },
          songkick:    { status: d.status === 'verified' ? 'approved' : (performance ? 'submitted' : 'na'), url: performance ? '#' : null },
          dice:        { status: d.status === 'verified' ? 'approved' : (performance ? 'submitted' : 'na'), url: performance ? '#' : null },
          approved: d.status === 'verified',
        },
        referral: { code: generateReferralCode(d.artistName), invites: [3,7,1,5][i], registrations: [2,5,0,3][i], unlocked: [] },
        event: performance && evDate ? {
          title: `New Music Wednesdays at The Penthouse NYC | ${d.artistName} LIVE`,
          date: evDate.toISOString(),
          venue: 'The Penthouse NYC', tier: pkg.name,
        } : null,
      };
      saveArtist(a);
      if (a.event) saveEvent(a.event);
      if (a.blast) addBlast({ email: a.email, phone: a.phone, genre: a.genre, artistId: a.id });
      if (performance && evDate) {
        bookSlot(dateKey(evDate), {
          artistId: a.id, artistName: a.artistName, tier: pkg.name, manual: false,
        });
      }
    });

    // demo: a manual booking on the second Wednesday (admin-entered)
    if (weds[1]) {
      bookSlot(dateKey(weds[1]), {
        artistId: 'manual_demo_1',
        artistName: 'Sienna Rae',
        tier: 'Manual booking',
        manual: true,
        notes: 'Off-platform booking — confirmed via DM',
      });
    }
  };

  return {
    PACKAGES, GOALS, UPSELLS, REFERRAL_TIERS,
    getFunnel, setFunnel,
    getArtist, setArtist, getArtists, saveArtist,
    getBlast, addBlast, getEvents, saveEvent, setEvents,
    getSponsors, addSponsor, updateSponsor, SPONSOR_STATUS,
    getDJs, addDJ, djCallCalendarLink,
    getFlows, saveFlow, deleteFlow, getFlowRuns, recordFlowRun,
    getSiteContent, saveSiteContent, resetSiteContent, applySiteContent,
    recommendUpsells, generateReferralCode, referralLink,
    isPerformanceTier, totalPrice, nextWednesday, fmtDate,
    getPromoCodes, setPromoCodes, findPromoCode, promoDiscount,
    googleCalendarLink, buildCalendarLink, upcomingWednesdays,
    dateKey, getSlots, getSlot, saveSlot, slotAvailable, slotIsFull,
    bookSlot, removeBookingByArtist, removeBookingAt, setSlotCapacity,
    DEFAULT_SLOT_CAPACITY,
    completeCheckout, updateCurrentArtist,
    reset, seedDemoIfEmpty,
  };
})();

if (typeof window !== 'undefined') {
  window.NMW = NMW;
  // Auto-apply CMS site content (urgency bar etc.) on every page that loads nmw.js
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => NMW.applySiteContent());
  } else {
    NMW.applySiteContent();
  }

  // Inject mobile hamburger menu into every nav. Reuses the existing desktop link list.
  const initMobileNav = () => {
    document.querySelectorAll('.nmw-nav').forEach(nav => {
      if (nav.dataset.mobileInit) return;
      nav.dataset.mobileInit = '1';
      const inner = nav.querySelector('.nmw-nav__inner');
      if (!inner) return;
      const linksWrap = inner.querySelector('.hidden.md\\:flex');
      if (!linksWrap) return;
      // Hamburger button on the right
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Open menu');
      btn.className = 'nmw-mobile-toggle';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
      inner.appendChild(btn);
      // Drawer
      const drawer = document.createElement('div');
      drawer.className = 'nmw-mobile-menu';
      const links = Array.from(linksWrap.querySelectorAll('a')).map(a => `<li><a href="${a.getAttribute('href')}">${a.textContent.trim()}</a></li>`).join('');
      drawer.innerHTML = `
        <button type="button" class="nmw-mobile-menu__close" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>
        </button>
        <ul class="nmw-mobile-menu__list">${links}</ul>`;
      nav.parentNode.insertBefore(drawer, nav.nextSibling);
      const open = () => { drawer.classList.add('is-open'); document.body.style.overflow = 'hidden'; };
      const close = () => { drawer.classList.remove('is-open'); document.body.style.overflow = ''; };
      btn.addEventListener('click', open);
      drawer.querySelector('.nmw-mobile-menu__close').addEventListener('click', close);
      drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
      document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileNav);
  } else {
    initMobileNav();
  }
}
