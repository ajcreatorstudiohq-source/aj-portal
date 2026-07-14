self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Yeh line Chrome ki sab se bari requirement hai PWA ke liye
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});