// sw.js — Service Worker (PWA offline support)
const CACHE = "wtd-v3";
const PRECACHE = [
  "/",
  "/index.html",
  "/css/base.css",
  "/css/home.css",
  "/css/checkin.css",
  "/css/scouting.css",
  "/js/firebase-init.js",
  "/js/game-logic.js",
  "/js/db.js",
  "/js/app.js",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Network-first for Firebase, cache-first for static assets
  if (
    e.request.url.includes("firestore") ||
    e.request.url.includes("googleapis")
  ) {
    return; // Let Firebase handle its own requests
  }
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request)),
  );
});
