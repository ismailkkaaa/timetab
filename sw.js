/* ============================================================
   sw.js — Service Worker: Cache-First Strategy
   ============================================================ */

const CACHE_NAME = 'timetab-v1';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './app.html',
  './manifest.json',
  './timetable.json',
  './css/brutal.css',
  './css/style.css',
  './css/landing.css',
  './js/app.js',
  './js/timer.js',
  './js/timetable.js',
  './js/notification.js',
  './js/install.js',
  './js/storage.js',
  './assets/logo.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  // Google Fonts — cached at runtime on first request
];

// ---- Install: Cache all static assets ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ---- Activate: Remove old caches ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ---- Fetch: Cache-First with Network Fallback ----
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (except Google Fonts)
  const url = new URL(event.request.url);
  const isGoogleFonts = url.hostname.includes('fonts.googleapis.com') ||
                        url.hostname.includes('fonts.gstatic.com');
  const isSameOrigin  = url.origin === self.location.origin;

  if (!isSameOrigin && !isGoogleFonts) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      // Not in cache — fetch from network and cache it
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./app.html');
          }
        });
    })
  );
});
