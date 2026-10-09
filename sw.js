/* Cauce · service worker
   Red primero para la página: si hay señal, siempre abre la última versión,
   así una actualización llega sola sin tener que recargar a la fuerza.
   Si no hay señal, abre la copia guardada — marcar el gimnasio a las 5:30
   no debería depender de tener datos. */
const CACHE = "cauce-v1";
const BASE = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const esPagina = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (esPagina) {
    e.respondWith(fetch(req)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("./"))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)
    .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })));
});
