self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("voto-informado-v1").then((cache) => {
      return cache.addAll([
        "/voto_informado2025/",
        "/voto_informado2025/index.html",
        "/voto_informado2025/styles.css",
        "/voto_informado2025/app.js",
        "/voto_informado2025/images/favicon/web-app-manifest-192x192.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
