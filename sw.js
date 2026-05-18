// New Music Wednesdays — Progressive Web App service worker
// Cache-first for static assets, network-first with offline fallback for HTML.
const CACHE = 'nmw-v3';
const CORE = [
  '/',
  '/index.html',
  '/mission.html',
  '/events.html',
  '/dj-call.html',
  '/podcast.html',
  '/apply.html',
  '/faq.html',
  '/alerts.html',
  '/sponsor.html',
  '/assets/nmw.css',
  '/assets/nmw.js',
  '/assets/pwa.js',
  '/manifest.webmanifest',
  '/images/nmw-logo.png',
  '/images/nmw-logo-light.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }).catch(() => cached))
    );
  }
});
