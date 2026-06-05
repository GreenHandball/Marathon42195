const CACHE = "rtw-v4";
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js",
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // Cache what we can, skip failures gracefully
      return Promise.allSettled(PRECACHE.map(url => c.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== "opaque") {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
