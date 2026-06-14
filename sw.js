// Minimal service worker — its only job today is to exist so the app is
// installable as a PWA. No offline caching yet (deliberate); a cache-first
// strategy for the app shell can be added here later without touching the
// registration or the manifest.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
