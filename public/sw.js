const CACHE_NAME = "nebula-static-v3";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.json", "/nebula_logo.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nebula-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Never store authenticated HTML, API responses, user uploads or videos.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        async () =>
          (await caches.match(OFFLINE_URL)) || new Response("Sem conexão", { status: 503 }),
      ),
    );
    return;
  }

  if (
    !url.pathname.startsWith("/assets/") &&
    !/^\/(nebula_logo|pwa-icon-\d+|pwa-maskable-512|favicon)\.png$/.test(url.pathname)
  )
    return;
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      const type = response.headers.get("content-type") || "";
      if (response.ok && /javascript|css|image|font|woff/.test(type)) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        const assets = keys.filter((key) => new URL(key.url).pathname.startsWith("/assets/"));
        await Promise.all(
          assets.slice(0, Math.max(0, assets.length - 80)).map((key) => cache.delete(key)),
        );
      }
      return response;
    })(),
  );
});
