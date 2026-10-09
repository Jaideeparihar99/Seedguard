const CACHE_NAME = 'seedguard-shell-v16';
const APP_SHELL = [
  '/',
  '/styles.css',
  '/ocr.css',
  '/layout.css?v=2',
  '/functions.css?v=2',
  '/trace-check.css?v=4',
  '/sathi-ocr.css?v=1',
  '/hero.css?v=3',
  '/visual-review.css?v=1',
  '/language.css?v=1',
  '/offline.css?v=2',
  '/report.css?v=1',
  '/plan.css?v=1',
  '/germination.css?v=1',
  '/concern.css?v=1',
  '/testing-pathways.css?v=1',
  '/seed-standards.css?v=2',
  '/i18n.js?v=13',
  '/sathi-ocr.js?v=1',
  '/app.js?v=19',
  '/manifest.webmanifest',
  '/seedguard-icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('seedguard-shell-') && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) await (await caches.open(CACHE_NAME)).put('/', response.clone());
        return response;
      } catch {
        return (await caches.match('/')) || new Response('SeedGuard is offline. Reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') (await caches.open(CACHE_NAME)).put(request, response.clone());
    return response;
  })());
});
