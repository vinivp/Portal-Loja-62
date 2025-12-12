self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("ponto-cache").then((cache) => {
      return cache.addAll([
        "/",
        "/paginas/Calculadora.html",
        "/manifest.json",
        "/img/savegnago-logo.png"
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
