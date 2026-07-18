/* ============================================================
   sw.js — TimeTab Service Worker
   Strategy: Cache-First for static assets, Network-First for HTML
   Lucide CDN cached on first request for offline use
   Version: 3
   ============================================================ */

const CACHE_VERSION  = 'timetab-v3';
const RUNTIME_CACHE  = 'timetab-runtime-v3';

/* All static assets to pre-cache on install */
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/manifest.json',
  '/timetable.json',
  '/css/brutal.css',
  '/css/style.css',
  '/css/landing.css',
  '/js/app.js',
  '/js/timer.js',
  '/js/timetable.js',
  '/js/notification.js',
  '/js/install.js',
  '/js/storage.js',
  '/js/icons.js',
  '/assets/logo.svg',
  '/assets/icons/icon-192.svg',
  '/assets/icons/icon-512.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-512.png',
  '/assets/screenshots/home.png',
];

/* ================================================================
   INSTALL — Pre-cache all static assets
   ================================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW] Pre-caching assets…');
        // Use individual adds so one failure doesn't abort the whole batch
        return Promise.allSettled(
          PRECACHE_ASSETS.map(url => cache.add(url).catch(err => {
            console.warn('[SW] Could not cache:', url, err.message);
          }))
        );
      })
      .then(() => {
        console.log('[SW] Install complete — skipping wait');
        return self.skipWaiting();
      })
  );
});

/* ================================================================
   ACTIVATE — Clean up old caches and claim clients immediately
   ================================================================ */
self.addEventListener('activate', (event) => {
  const VALID_CACHES = [CACHE_VERSION, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(key => !VALID_CACHES.includes(key))
            .map(key => {
              console.log('[SW] Removing stale cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => {
        console.log('[SW] Activated — claiming clients');
        return self.clients.claim();
      })
  );
});

/* ================================================================
   FETCH — Tiered strategy
   ================================================================ */
self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin   = url.origin === self.location.origin;
  const isGoogleFonts  = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isLucideCDN    = url.hostname === 'unpkg.com' && url.pathname.includes('lucide');

  // Ignore unrecognised cross-origin requests
  if (!isSameOrigin && !isGoogleFonts && !isLucideCDN) return;

  // ---- Strategy A: Navigation (HTML) — Network-first, fallback to cache ----
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh HTML
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve cached HTML (prefer exact match, fall back to app.html)
          return caches.match(event.request)
            || caches.match('/app.html')
            || caches.match('/index.html');
        })
    );
    return;
  }

  // ---- Strategy B: CDN resources (Fonts, Lucide) — Cache-first with network fallback ----
  if (isGoogleFonts || isLucideCDN) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline and not cached — return empty for fonts (graceful degradation)
          return new Response('', { status: 503, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // ---- Strategy C: Static assets — Cache-first, update in background ----
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type !== 'error') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(event.request, clone));
        }
        return response;
      }).catch(() => cached || new Response('', { status: 503 }));

      // Return cached immediately; update happens in background
      return cached || networkFetch;
    })
  );
});

/* ================================================================
   MESSAGE — Allow pages to trigger SW actions
   ================================================================ */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
