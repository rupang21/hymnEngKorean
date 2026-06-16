const CACHE_NAME = 'hymnal-v16';
const STATIC_ASSETS = [
  'index.html',
  'css/styles.css',
  'js/app.js',
  'manifest.json',
  'data/hymns.json',
  'data/trinity_hymns.json',
  'data/trinity_hymns_1990.json',
  'data/catechism.json',
  'data/larger_catechism.json',
  'data/liturgies.json'
];

// Install Event - Pre-cache Static Assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Pre-caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up Old Caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Cache-First Strategy with Network Fallback & Dynamic Caching
self.addEventListener('fetch', event => {
  // Only handle HTTP/HTTPS protocols (avoid chrome-extension:// etc.)
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Check if response is valid before caching
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              // Note: cross-origin requests (like fonts or images on CDNs) might have type opaque or cors.
              // For sheet music or google fonts, we want to cache them too!
              if (event.request.url.includes('googleusercontent') || 
                  event.request.url.includes('gstatic') || 
                  event.request.url.includes('googleapis') ||
                  event.request.url.includes('assets/scores')) {
                  // Keep going to cache dynamic asset
              } else {
                  return networkResponse;
              }
            }

            // Clone response to save in cache while returning it
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(err => {
            console.log('[Service Worker] Fetch failed:', err);
            // Fallback for offline sheet music or layout if not in cache
            return new Response('Network error occurred', { status: 408, headers: { 'Content-Type': 'text/plain' } });
          });
      })
  );
});
