/**
 * Tilawa — security headers, defined once.
 * -----------------------------------------------------------------------------
 * The application is a static export, so `next.config.ts`'s `headers()` does
 * not reach production: there is no Next server to run it. Headers are applied
 * by the host instead, from the `public/_headers` file that
 * `scripts/generate-headers.mjs` writes from this module.
 *
 * Both consumers import from here so the policy that runs in `next dev` and the
 * policy the CDN serves cannot drift apart — which is the failure mode that
 * makes a CSP look enforced while it is quietly absent in production.
 *
 * @see scripts/generate-headers.mjs
 * @see DEPLOYMENT.md for which hosts honour `_headers`.
 */

/** Origins serving recitation audio. */
const AUDIO_ORIGINS =
  'https://everyayah.com https://*.everyayah.com https://download.quranicaudio.com';

/**
 * The tafsir content API.
 *
 * Reached directly from the browser now that there is no server to proxy it.
 * Allow-listed by exact origin rather than trusted wholesale, and every
 * response is stripped to plain text before it can reach the DOM.
 *
 * @see src/services/tafsir.ts
 */
const API_ORIGINS = 'https://api.quran.com';

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` is present for styles because Next injects critical CSS
 * inline, and for scripts because the theme bootstrap runs inline before first
 * paint. Neither is ideal and both are worth removing with a nonce — but a
 * nonce needs a server to generate it per request, and this application
 * deliberately has none. That trade is stated here rather than papered over.
 */
export const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  `connect-src 'self' ${API_ORIGINS} ${AUDIO_ORIGINS}`,
  `media-src 'self' blob: ${AUDIO_ORIGINS}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

/**
 * Headers applied to every response.
 *
 * `microphone=(self)` rather than `microphone=()`: the recitation features on
 * the roadmap need `getUserMedia`, and a blanket denial here would refuse it
 * before any consent prompt could be shown. Permission is still asked for
 * normally by the browser — this only stops the *document* being forbidden
 * from asking. Camera and geolocation stay denied outright; nothing in a Quran
 * reader has any business with either.
 */
export const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
  },
];

/** Long-lived caching for content-addressed or immutable assets. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** The service worker must never be served from a stale HTTP cache. */
export const NO_STORE_CACHE_CONTROL = 'no-cache, no-store, must-revalidate';

/**
 * Per-path header overrides, in the order a host should evaluate them.
 *
 * `/data/*` and `/fonts/*` are immutable by construction — a verse payload for
 * a given surah never changes, and font files are replaced rather than edited —
 * so they are cached for a year. `/sw.js` is the opposite: cache it and a
 * client can be stranded on an outdated shell with no way to recover.
 */
export const pathHeaders = [
  { source: '/data/*', headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE_CONTROL }] },
  { source: '/fonts/*', headers: [{ key: 'Cache-Control', value: IMMUTABLE_CACHE_CONTROL }] },
  {
    source: '/sw.js',
    headers: [
      { key: 'Cache-Control', value: NO_STORE_CACHE_CONTROL },
      { key: 'Service-Worker-Allowed', value: '/' },
    ],
  },
];
