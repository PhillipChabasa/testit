// ═══════════════════════════════════════════════════
//  TESTIT SERVICE WORKER  v4.0  (PWA)
//  Strategy:
//    • App shell  → Cache-first (instant loads)
//    • Google APIs → Network-only (never cache tokens)
//    • Google Fonts → Stale-while-revalidate
//    • Everything else → Network-first with cache fallback
// ═══════════════════════════════════════════════════

const CACHE_NAME   = 'testit-v4';
const SHELL_URLS   = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: pre-cache the app shell ────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: remove stale caches ───────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch routing ────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept Google auth / API calls — always network
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('accounts.google.com') ||
    url.hostname.includes('oauth2.googleapis.com')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Google Fonts: stale-while-revalidate
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // App shell URLs: cache-first
  if (SHELL_URLS.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(networkFirst(request));
});

// ── Background sync for Drive ─────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'testit-drive-sync') {
    // Signal all clients to run sync
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
        .then(clients => {
          clients.forEach(c => c.postMessage({ type: 'BACKGROUND_SYNC' }));
        })
    );
  }
});

// ── Message handler (ping from app) ──────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Cache a specific URL on demand
  if (event.data && event.data.type === 'CACHE_URL') {
    caches.open(CACHE_NAME).then(cache => cache.add(event.data.url));
  }
});

// ── Strategy helpers ─────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    }
    return response;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}
