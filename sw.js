/* OmniCore AI service worker — caches the app shell so repeat visits open
   instantly and the interface works offline. Same-origin GET requests only:
   hashed build assets are cache-first (they never change), the HTML page is
   network-first so a new deploy is picked up on the next visit. */
const CACHE = "omnicore-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith("omnicore-shell-") && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isPage) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        const c = await caches.open(CACHE); c.put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req)) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok && (url.pathname.includes("/assets/") || url.pathname.includes("/models/") || /\.(svg|png|webmanifest)$/.test(url.pathname))) {
      const c = await caches.open(CACHE);
      await c.put(req, res.clone());
      // Hashed bundles from older deploys are never requested again; keep the
      // cache bounded by evicting the oldest entries.
      const keys = await c.keys();
      if (keys.length > 220) await Promise.all(keys.slice(0, keys.length - 180).map((k) => c.delete(k)));
    }
    return res;
  })());
});
