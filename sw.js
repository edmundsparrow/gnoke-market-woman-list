/* sw.js — Gnoke Market Woman List service worker.

   Cache-first: every asset below is precached on install, then served
   from cache immediately on every request, with a background refetch
   to keep the cache warm for next time. This app's actual data
   (trips/items) lives in localStorage via SQL.js — NOT in this cache —
   so nothing here can ever touch or lose a user's records. This file
   only controls how the app's *code* (HTML/CSS/JS/wasm) is served.

   IMPORTANT: previous version of this list had several wrong paths
   (./settings.html, ./about.html, ./menu.js, ./js/db-core.js) that
   don't exist — cache.addAll() is all-or-nothing, so ANY bad path
   failed the ENTIRE precache silently (it was wrapped in .catch(()=>{})).
   That's why offline only "sort of" worked before: it relied on the
   browser's own incidental HTTP cache rather than this service worker
   actually having anything cached. Fixed below: real paths only, and
   failures are now logged instead of swallowed.

   Update model: installing a new sw.js does NOT auto-activate anymore.
   It installs and waits. The Settings page has an "Update" button that
   asks the waiting worker to activate, then reloads. This is
   deliberate — auto-activating mid-use could yank the on-screen list
   out from under someone typing a price into a market stall.
*/

const CACHE_NAME = 'gnoke-market-v3';

const ASSETS = [
  './',
  './index.html',
  './main/index.html',
  './main/settings.html',
  './main/about.html',
  './main/history.html',
  './main/menu.js',
  './style.css',
  './global.png',
  './manifest.json',
  './js/state.js',
  './js/theme.js',
  './js/ui.js',
  './js/db.js',
  './js/share.js',
  './js/app.js',
  './js/vendor/sql-wasm.js',
  './js/vendor/sql-wasm.wasm',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const results = await Promise.allSettled(
        ASSETS.map((path) => cache.add(path))
      );
      const failed = results
        .map((r, i) => (r.status === 'rejected' ? ASSETS[i] : null))
        .filter(Boolean);
      if (failed.length) {
        console.warn('[sw] failed to precache:', failed);
      } else {
        console.log('[sw] precached all', ASSETS.length, 'files');
      }
    })()
    // No self.skipWaiting() here on purpose — see file header. The new
    // worker sits in "waiting" until the user (or the update button)
    // tells it to take over.
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Lets the page's "Update" button force this waiting worker to activate
// immediately instead of waiting for all tabs to close on their own.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);

      if (cached) {
        // Cache-first: respond immediately, refresh in the background
        // so the cache stays current without the user waiting on it.
        event.waitUntil(
          fetch(event.request)
            .then((res) => { if (res && res.ok) cache.put(event.request, res); })
            .catch(() => {})
        );
        return cached;
      }

      try {
        const res = await fetch(event.request);
        if (res && res.ok) cache.put(event.request, res.clone());
        return res;
      } catch (e) {
        return cached || Response.error();
      }
    })()
  );
});
