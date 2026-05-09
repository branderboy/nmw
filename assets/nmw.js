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
  };

  const DEFAULT_SLOT_CAPACITY = 3;

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
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));

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

  const getSponsors = () => get(KEYS.sponsors, []);
  const addSponsor = (entry) => {
    const all = getSponsors();
    all.push({ id: 'sp_' + Math.random().toString(36).slice(2, 10), submittedAt: new Date().toISOString(), ...entry });
    set(KEYS.sponsors, all);
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
    return pkgPrice + upsellPrice;
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
    getBlast, addBlast, getEvents, saveEvent,
    getSponsors, addSponsor,
    recommendUpsells, generateReferralCode, referralLink,
    isPerformanceTier, totalPrice, nextWednesday, fmtDate,
    googleCalendarLink, buildCalendarLink, upcomingWednesdays,
    dateKey, getSlots, getSlot, saveSlot, slotAvailable, slotIsFull,
    bookSlot, removeBookingByArtist, removeBookingAt, setSlotCapacity,
    DEFAULT_SLOT_CAPACITY,
    completeCheckout, updateCurrentArtist,
    reset, seedDemoIfEmpty,
  };
})();

if (typeof window !== 'undefined') window.NMW = NMW;
