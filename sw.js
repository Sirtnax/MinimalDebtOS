/* ============================================================
   DebtOS — Service Worker
   ============================================================ */

const CACHE_NAME = 'debtos-v2';
const urlsToCache = [
  '/MinimalDebtOS/',
  '/MinimalDebtOS/index.html',
  '/MinimalDebtOS/app.js',
  '/MinimalDebtOS/styles.css',
  '/MinimalDebtOS/manifest.json',
  '/MinimalDebtOS/icon-192.png',
  '/MinimalDebtOS/icon-512.png',
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event — network-first for app shell (so updates reach users),
// cache-first for everything else (fonts, icons)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isAppShell = url.origin === self.location.origin;

  if (isAppShell) {
    // Network-first: always try to get the latest, fall back to cache offline
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(r => r || caches.match('/MinimalDebtOS/index.html'))
        )
    );
    return;
  }

  // Cache-first for cross-origin assets (fonts etc.)
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'error') return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
