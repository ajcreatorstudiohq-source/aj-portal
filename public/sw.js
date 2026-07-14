self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));

// Yeh fetch event Chrome ki sab se bari requirement hai install button ke liye
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});