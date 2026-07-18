/* ============================================================
   sw.js — TimeTab Service Worker v4
   Relative-path safe — works on GitHub Pages subdirectories
   and any hosting root equally.
   ============================================================ */

const CACHE_VERSION = 'timetab-v4';
const RUNTIME_CACHE = 'timetab-runtime-v4';

/*
  Build absolute URLs from relative paths using the SW's own location.
  This makes the SW work correctly whether hosted at:
    https://example.com/           (root)
    https://ismailkkaaa.github.io/timetab/   (subdirectory)
*/
const BASE = new URL('./', self.location.href).href;

function rel(path) {
  return new URL(path, BASE).href;
}

const PRECACHE_URLS = [
  rel(''),                                   // root (index.html)
  rel('index.html'),
  rel('app.html'),
  rel('manifest.json'),
  rel('timetable.json'),
  rel('css/brutal.css'),
  rel('css/style.css'),
  rel('css/landing.css'),
  rel('js/app.js'),
  rel('js/timer.js'),
  rel('js/timetable.js'),
  rel('js/notification.js'),
  rel('js/install.js'),
  rel('js/storage.js'),
  rel('js/icons.js'),
  rel('assets/logo.svg'),
  rel('assets/icons/icon-192.svg'),
  rel('assets/icons/icon-512.svg'),
  rel('assets/icons/icon-192.png'),
  rel('assets/icons/icon-512.png'),
  rel('assets/icons/icon-maskable-512.png'),
  rel('assets/screenshots/home.png'),
];

/* ================================================================
   INSTALL — Pre-cache all static assets
   ================================================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => {
        console.log('[SW v4] Pre-caching', PRECACHE_URLS.length, 'assets…');
        // allSettled so a single 404 does not abort the entire install
        return Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) =>
              console.warn('[SW] Could not cache:', url, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('[SW v4] Install complete');
        return self.skipWaiting(); // take control immediately
      })
  );
});

/* ================================================================
   ACTIVATE — Purge stale caches and claim all open tabs
   ================================================================ */
self.addEventListener('activate', (event) => {
  const KEEP = new Set([CACHE_VERSION, RUNTIME_CACHE]);
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names.filter((n) => !KEEP.has(n)).map((n) => {
            console.log('[SW v4] Removing stale cache:', n);
            return caches.delete(n);
          })
        )
      )
      .then(() => {
        console.log('[SW v4] Activated — claiming clients');
        return self.clients.claim();
      })
  );
});

/* ================================================================
   FETCH — Tiered caching strategy
   ================================================================ */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isSameOrigin  = url.origin === self.location.origin;
  const isGoogleFonts = url.hostname === 'fonts.googleapis.com' ||
                        url.hostname === 'fonts.gstatic.com';
  const isLucideCDN   = url.hostname === 'unpkg.com' &&
                        url.pathname.includes('lucide');
  const isCDN         = isGoogleFonts || isLucideCDN;

  // Ignore unknown cross-origin requests
  if (!isSameOrigin && !isCDN) return;

  /* ------------------------------------------------------------------
     Strategy A — Navigation requests (HTML pages)
     Network-first → fallback to cached page → fallback to app.html
  ------------------------------------------------------------------ */
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cached) => cached || caches.match(rel('app.html')))
        )
    );
    return;
  }

  /* ------------------------------------------------------------------
     Strategy B — CDN resources (Fonts, Lucide icons)
     Cache-first → fetch and cache → graceful offline response
  ------------------------------------------------------------------ */
  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((res) => {
            if (res && res.status === 200) {
              caches.open(RUNTIME_CACHE).then((c) => c.put(event.request, res.clone()));
            }
            return res;
          })
          .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
      })
    );
    return;
  }

  /* ------------------------------------------------------------------
     Strategy C — All other same-origin assets
     Cache-first → update in background (stale-while-revalidate)
  ------------------------------------------------------------------ */
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fromNetwork = fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE_VERSION).then((c) => c.put(event.request, res.clone()));
          }
          return res;
        })
        .catch(() => cached || new Response('', { status: 503 }));

      return cached || fromNetwork;
    })
  );
});

/* ================================================================
   MESSAGE — Remote skip-waiting for update flows
   ================================================================ */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
