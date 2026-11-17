/* Service worker PERSEGI GO!: membuat aplikasi bisa dipasang & dibuka offline.
   Naikkan VERSION setiap kali file aplikasi berubah. */
const VERSION = 'persegi-go-v3';
const APP_CACHE = `${VERSION}-app`;
const CDN_CACHE = `${VERSION}-cdn`;

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

const APP_FILES = [
  '/', '/index.html', '/manifest.webmanifest', '/config.js',
  '/css/tokens.css', '/css/base.css', '/css/layout.css', '/css/components.css',
  '/js/main.js', '/js/router.js', '/js/ui.js', '/js/state.js', '/js/auth.js', '/js/api.js',
  '/js/outbox.js', '/js/install.js', '/js/content.js', '/js/supabaseClient.js',
  '/js/core/geometry.js', '/js/core/checker.js', '/js/core/messages.js',
  '/js/components/visuals.js', '/js/components/tutorPanel.js',
  '/js/pages/login.js', '/js/pages/beranda.js', '/js/pages/materi.js', '/js/pages/eksplorasi.js',
  '/js/pages/kuis.js', '/js/pages/latihan.js', '/js/pages/progres.js', '/js/pages/tutor.js',
  '/content/modules.json', '/content/quiz.json', '/content/problems.json', '/content/badges.json',
  '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(APP_FILES);
    try {
      const cdn = await caches.open(CDN_CACHE);
      await cdn.add(new Request(SUPABASE_JS, { mode: 'cors' }));
    } catch (e) { /* CDN gagal: akan dicoba lagi saat online */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Data akun & login tidak pernah di-cache.
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('supabase.co')) return;

  const isCdn = url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isCdn) {
    event.respondWith(cacheFirst(req, CDN_CACHE));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Halaman: kembalikan index.html (aplikasi satu halaman).
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(new Request('/index.html'), APP_CACHE));
    return;
  }
  if (url.pathname === '/config.js') {
    event.respondWith(networkFirst(req, APP_CACHE));
    return;
  }
  event.respondWith(staleWhileRevalidate(req, APP_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
  return res;
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req)) || (await cache.match('/index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || update;
}
