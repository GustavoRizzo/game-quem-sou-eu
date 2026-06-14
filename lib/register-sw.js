// Registers the service worker that makes the app installable.
// The URL is resolved relative to THIS module (import.meta.url), so it points
// at the site-root sw.js no matter which page imports it or what base path the
// site is served under (works both at "/" locally and at "/<repo>/" on Pages).

if ('serviceWorker' in navigator) {
  const swUrl = new URL('../sw.js', import.meta.url);
  navigator.serviceWorker.register(swUrl).catch((err) => {
    console.warn('Service worker registration failed:', err);
  });
}
