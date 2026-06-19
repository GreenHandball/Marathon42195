const CACHE = "rtw-v15";

// Eksterne biblioteker og kortdata.
const STATIC_ASSETS = [
  "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/topojson/3.0.2/topojson.min.js",
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
];

// Install: Cache alle statiske ressourcer med det samme
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(STATIC_ASSETS.map(url => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// Activate: Slet gamle caches for at frigøre plads og undgå konflikter
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Gør det muligt for appen at tvinge en øjeblikkelig opdatering
self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

// Fetch: Håndtering af netværksanmodninger
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;

  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // ROBUST TJEK: Sammenligner origin og sti (ignorerer tilfældige query-parametre eller formateringsfejl)
  const isStatic = STATIC_ASSETS.some(asset => {
    try {
      const assetUrl = new URL(asset);
      return assetUrl.origin === url.origin && assetUrl.pathname === url.pathname;
    } catch {
      return false;
    }
  });

  // 1. App-filer (HTML, JS, CSS på dit eget domæne): NETWORK-FIRST
  if (isSameOrigin && !isStatic) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(e.request).then(c => c || caches.match("./index.html"))
        )
    );
    return;
  }

  // 2. Statiske eksterne filer (D3, TopoJSON, Kort, Skrifttyper): CACHE-FIRST
  e.respondWith(
    caches.match(e.request).then(cached =>
