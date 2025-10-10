const CACHE_NAME = "votoinformado-cache-v1";
const urlsToCache = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./images/favicon/web-app-manifest-192x192.png",
  "./images/favicon/web-app-manifest-512x512.png"
];

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Archivos en caché");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activación: limpieza de versiones antiguas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
});

// Interceptar peticiones y servir desde caché
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
