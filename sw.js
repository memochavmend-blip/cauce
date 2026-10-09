/* Cauce · service worker
   Red primero para la página: si hay señal, siempre abre la última versión,
   así una actualización llega sola sin tener que recargar a la fuerza.
   Si no hay señal, abre la copia guardada — marcar el gimnasio a las 5:30
   no debería depender de tener datos. */
const PREFIJO = "cauce-";
const CACHE = PREFIJO + "v2";
const BASE = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).catch(() => {}));
});

/* Solo se borran las cachés propias. Cache Storage es por origen, no por
   carpeta: en GitHub Pages todas las apps de una misma cuenta comparten
   origen, así que borrar «todo lo que no sea mío» le tira la caché a la
   app de al lado y la deja sin modo sin conexión sin que nadie se entere. */
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks
      .filter(k => k.startsWith(PREFIJO) && k !== CACHE)
      .map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  /* Audio y video no se tocan: son peticiones por rangos y si pasan por la
     caché fallan. Aquí no hay, pero el día que haya no hay que acordarse. */
  if (req.headers.has("range")) return;

  const raiz = new URL("./", location.href).pathname;
  const esPagina = req.mode === "navigate" || url.pathname.endsWith(".html");
  if (esPagina) {
    /* no-store: que la caché del navegador no devuelva una versión vieja
       por debajo. La copia de aquí es el respaldo, y es la única. */
    e.respondWith(fetch(req, { cache: "no-store" })
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then(r => {
        if (r) return r;
        /* El respaldo a la app solo vale para la app. Otra página dentro de
           la carpeta cae a su propia copia o a nada: devolver la app en su
           lugar haría que un manual o un PDF abrieran el tablero del día. */
        return url.pathname === raiz || url.pathname === raiz + "index.html"
          ? caches.match("./").then(c => c || Response.error())
          : Response.error();
      })));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)
    .then(res => { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return res; })));
});
