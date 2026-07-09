// Service Worker for Offline Capabilities and Asset Caching
const CACHE_NAME = 'invoice-pro-v1';
const ASSETS = [
  './index.html',
  './style.css',
  './app.js',
  './invoiceCore.js',
  './domHandlers.js',
  './calculations.js',
  './preview.js',
  './security.js',
  './storageAndExport.js',
  './language.js',
  './manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Fallback gracefully if network and cache both fail
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
