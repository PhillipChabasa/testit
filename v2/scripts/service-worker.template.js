/* TESTIT 2: keeps study data untouched and waits for an explicit safe update. */
const CACHE_NAME = __CACHE_NAME__;
const SHELL_URLS = __SHELL_URLS__;
const shellPaths = new Set(
  SHELL_URLS.map((path) => new URL(path, self.registration.scope).pathname),
);
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)),
  );
});
self.addEventListener("activate", (event) => {
  // Retain existing caches during cutover; other open clients may still need them.
  event.waitUntil(self.clients.claim());
});
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url),
    scope = new URL(self.registration.scope);
  if (
    request.method !== "GET" ||
    url.origin !== scope.origin ||
    url.pathname.startsWith(scope.pathname + "legacy/")
  )
    return;
  if (
    request.mode === "navigate" &&
    (url.pathname === scope.pathname ||
      url.pathname === scope.pathname + "index.html")
  ) {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          // Never overwrite an older version's offline shell with a newer HTML build.
          return response.ok
            ? response
            : (await caches.open(CACHE_NAME))
                .match(new URL("./index.html", scope).href)
                .then((cached) => cached || response);
        })
        .catch(
          async () =>
            (await (
              await caches.open(CACHE_NAME)
            ).match(new URL("./index.html", scope).href)) ||
            new Response("Offline", { status: 503 }),
        ),
    );
    return;
  }
  if (shellPaths.has(url.pathname))
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || fetch(request);
      })(),
    );
});
