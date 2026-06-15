// Service worker: serves the app from a version-keyed cache so every deploy is
// an atomic, consistent snapshot — fixing the "new HTML + stale CSS" that a
// plain HTTP cache (GitHub Pages sends max-age=600 on everything) can produce
// right after a deploy.
//
// How the version works: the browser detects a new worker by byte-comparing
// sw.js on each visit (it fetches sw.js bypassing the HTTP cache for this
// check). VERSION below is stamped with the commit SHA at deploy time (see
// .github/workflows/deploy.yml), so each commit yields a unique cache name.
// install -> caches under the new name; activate -> deletes the old caches.
// Because every request is served from one versioned cache, a page load is
// always a single consistent version, never a mix.
//
// In local/LAN dev the placeholder is left untouched, so IS_PRODUCTION is false
// and the worker is a network-only pass-through — changes are always fresh while
// developing, and the app stays installable as a PWA.

const VERSION = '__BUILD_VERSION__';
const IS_PRODUCTION = VERSION !== '__BUILD_VERSION__';
const CACHE = `quem-sou-eu-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop every cache that isn't the current version.
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (!IS_PRODUCTION) return; // dev: let the network handle everything

  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // only our own assets

  // Cache-first: within a version the files never change, and a new deploy lands
  // under a new cache name and wipes this one, so there is nothing stale to fear.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
