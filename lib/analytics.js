// Loads GA4 (gtag.js) and exposes a thin track() helper for custom events.
//
// GA_ID is replaced with a real Measurement ID (G-XXXXXXXXXX) only in the
// copy published by .github/workflows/deploy.yml — same placeholder pattern
// as sw.js's __BUILD_VERSION__. In local/LAN dev the placeholder is left
// untouched, so analytics never loads and dev visits are never counted.
//
// The <script> tag importing this module is injected into every page only at
// deploy time (see deploy.yml), not checked into the HTML — so there is
// nothing to keep in sync across pages.

const GA_ID = '__GA_MEASUREMENT_ID__';
const IS_ENABLED = GA_ID !== '__GA_MEASUREMENT_ID__';

// TEMP DEBUG — remove once we confirm GA4 is reaching the browser in prod.
console.log('[analytics] GA_ID =', GA_ID, '| IS_ENABLED =', IS_ENABLED);

if (IS_ENABLED) {
  window.dataLayer = window.dataLayer || [];
  function gtag(...args) {
    window.dataLayer.push(args);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.onload = () => console.log('[analytics] gtag.js loaded OK');
  script.onerror = (e) => console.error('[analytics] gtag.js failed to load — likely blocked', e);
  document.head.appendChild(script);
}

// Fires a custom GA4 event. No-op when analytics is disabled (dev) or the
// script was blocked (ad blocker) — callers never need to check.
export function track(name, params = {}) {
  window.gtag?.('event', name, params);
}
