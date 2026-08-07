/* eslint-disable no-console */
/**
 * Tilawa — service worker.
 * -----------------------------------------------------------------------------
 * Hand-written rather than generated. A Quran reader has four genuinely
 * different classes of asset, and each wants a different strategy; a generic
 * plugin would either flatten them into one policy or bury the policy in
 * configuration nobody can audit.
 *
 *   navigations      network-first, falling back to cache, then /offline
 *   build output     cache-first, immutable (hashed filenames)
 *   surah data       cache-first, immutable (content never changes)
 *   fonts            cache-first, immutable
 *   API responses    stale-while-revalidate (tafsir, search)
 *   audio            passthrough — never cached
 *
 * Audio is deliberately excluded. Recitations are range-requested and a full
 * Mus'haf of them runs to gigabytes; caching them would silently consume a
 * user's storage quota and evict the verse data that actually makes the app
 * work offline.
 *
 * @see src/features/pwa/ServiceWorkerRegistrar.tsx for registration.
 */

/**
 * Bump on every deploy that changes the precache list or a strategy.
 * Old caches are deleted on activate.
 */
const VERSION = 'v2';

const CACHES = {
  shell: `tilawa-shell-${VERSION}`,
  assets: `tilawa-assets-${VERSION}`,
  data: `tilawa-data-${VERSION}`,
  api: `tilawa-api-${VERSION}`,
};

const OFFLINE_URL = '/offline';

/**
 * The minimum needed to render something useful with no network at all.
 *
 * Deliberately short: precaching all 114 surah payloads would mean a 4 MB
 * download on first visit for content most readers will never open. Surahs are
 * cached individually as they are read, which is both cheaper and better
 * matched to how the app is actually used.
 */
const PRECACHE_URLS = [
  '/',
  OFFLINE_URL,
  // Browsing indexes: their data is bundled, so they are fully usable offline.
  '/surah',
  '/juz',
  '/hizb',
  // Bookmarks and settings live entirely in LocalStorage, so this page works
  // perfectly with no network — but only if the shell itself is cached. It was
  // not, and an offline reader reaching for their saved ayat got the offline
  // page instead. Search is precached for the same reason: full-text search
  // needs the network, but the page explains that rather than failing blankly.
  '/bookmarks',
  '/search',
  '/about',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/data/surah/1.json',
];

/** Entries kept per cache before the oldest are evicted. */
const CACHE_LIMITS = {
  // 114 surah payloads plus 30 juz payloads, with headroom.
  [CACHES.data]: 160,
  [CACHES.api]: 220,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Trims a cache to its limit, oldest entry first. */
async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;

  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;

  // `cache.keys()` returns insertion order, so the head is the oldest.
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)));
}

/** Cache-first: serve from cache, fall back to network and store the result. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Only successful, non-opaque responses are worth storing; an opaque response
  // has an unknown status and could cache an error page forever.
  if (response.ok && response.type !== 'opaque') {
    await cache.put(request, response.clone());
    void trimCache(cacheName);
  }
  return response;
}

/**
 * Stale-while-revalidate: answer from cache immediately when possible, and
 * refresh the entry in the background for next time.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone()).then(() => trimCache(cacheName));
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const response = await network;
  if (response) return response;

  return new Response(
    JSON.stringify({ ok: false, error: 'لا يوجد اتصال بالإنترنت' }),
    { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
  );
}

/**
 * Network-first for navigations, so a reader online always gets the current
 * page, while an offline reader still gets whatever was cached — and the
 * offline page as a last resort.
 */
async function handleNavigation(request) {
  const cache = await caches.open(CACHES.shell);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // A previously visited page may have been stored without its query string.
    const url = new URL(request.url);
    const withoutQuery = await cache.match(url.pathname);
    if (withoutQuery) return withoutQuery;

    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response('لا يوجد اتصال بالإنترنت', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.shell);
      // Added individually so one 404 cannot fail the whole install — a broken
      // precache entry must never leave the app without a service worker.
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch (error) {
            console.warn('[tilawa:sw] Precache failed for', url, error);
          }
        }),
      );
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const known = new Set(Object.values(CACHES));
      const names = await caches.keys();

      await Promise.all(
        names
          .filter((name) => name.startsWith('tilawa-') && !known.has(name))
          .map((name) => caches.delete(name)),
      );

      // Navigation preload lets the browser start the network request in
      // parallel with worker startup, removing the worker from the critical
      // path on navigations.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// ---------------------------------------------------------------------------
// Fetch routing
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is cacheable, and cross-origin requests are left to the network.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    // Audio lives on a third-party CDN and uses range requests; passing it
    // through untouched keeps seeking working and keeps gigabytes of
    // recitation out of the cache.
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Immutable verse payloads — the single most valuable thing to have offline.
  if (url.pathname.startsWith('/data/')) {
    event.respondWith(cacheFirst(request, CACHES.data));
    return;
  }

  // Self-hosted fonts, content-hashed build output, and generated icons.
  if (
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(cacheFirst(request, CACHES.assets));
    return;
  }

  // Tafsir and search: fresh when possible, instant and offline-capable always.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, CACHES.api));
    return;
  }

  // Everything else same-origin: try the network, fall back to any cached copy.
  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response('', { status: 504 });
    }),
  );
});
