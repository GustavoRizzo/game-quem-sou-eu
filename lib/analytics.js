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
// Check by prefix, not by comparing against the literal placeholder string:
// the sed in deploy.yml replaces every line that contains the placeholder, so
// `GA_ID !== '__GA_MEASUREMENT_ID__'` would also get its RHS replaced and would
// always evaluate to false. Real IDs start with 'G-'; placeholders start with '__'.
const IS_ENABLED = !GA_ID.startsWith('__');

if (IS_ENABLED) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js only recognizes queued commands that are `arguments` objects (the
  // canonical snippet pushes `arguments`, not an array). Pushing a real array
  // here makes gtag.js silently ignore 'config'/'event', so no /g/collect hit
  // is ever sent. Keep the classic function form.
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA_ID);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

// Fires a custom GA4 event. No-op when analytics is disabled (dev) or the
// script was blocked (ad blocker) — callers never need to check.
export function track(name, params = {}) {
  window.gtag?.('event', name, params);
}
