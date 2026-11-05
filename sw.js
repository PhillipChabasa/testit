/* TESTIT 2: keeps study data untouched and waits for an explicit safe update. */
const CACHE_NAME = "testit2-shell-e18bb040a2fe8ee0";
const SHELL_URLS = ["./","./index.html","./manifest.json","./icons/icon-192.png","./icons/icon-512.png","./assets/History-D4Rfxz6k.js","./assets/Library-DwDVINlM.js","./assets/PromptBuilder-ko_Q5myH.js","./assets/Revision-tE_zNAjN.js","./assets/Settings-CPHq792c.js","./assets/TestBuilder-Cw8cO0ci.js","./assets/Workspace-CX_3q_bA.js","./assets/dm-sans-latin-400-normal-BwCSEQnW.woff","./assets/dm-sans-latin-400-normal-CW0RaeGs.woff2","./assets/dm-sans-latin-500-normal-B9HHJjqV.woff2","./assets/dm-sans-latin-500-normal-Dr3UlScf.woff","./assets/dm-sans-latin-600-normal-Aqo67rzb.woff2","./assets/dm-sans-latin-600-normal-BmdmIIQ2.woff","./assets/dm-sans-latin-700-normal-CUSSCpQX.woff","./assets/dm-sans-latin-700-normal-DvUfVpUG.woff2","./assets/download-ClnHVuKz.js","./assets/index-BSait_4u.css","./assets/index-DMiF-LOH.js","./assets/outfit-latin-400-normal-BGsTXAXT.woff2","./assets/outfit-latin-400-normal-DMwTpYkH.woff","./assets/outfit-latin-500-normal-ClnHRwRh.woff","./assets/outfit-latin-500-normal-DKnIMDSk.woff2","./assets/outfit-latin-600-normal-B7SfZ07L.woff2","./assets/outfit-latin-600-normal-BEfTtDA7.woff","./assets/outfit-latin-700-normal-Cu9v6i1X.woff2","./assets/outfit-latin-700-normal-D4itBLBr.woff","./assets/rotate-ccw-DBuiwhxf.js"];
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
