self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Yeh empty fetch handler Chrome ko batata hai ke app offline support karti hai
  event.respondWith(fetch(event.request));
});