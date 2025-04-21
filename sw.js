// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v3';
const urlsToCache = [
  // HTML pages
  '/',
  '/index.html',
  '/scoring.html',
  
  // CSS and JavaScript
  '/styles.css',
  '/script.js',
  '/scoring.js',
  '/firebase.js',
  '/firebase-config.js',
  
  // Icons and manifest
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  
  // Firebase libs (external resources)
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js'
];

// Force update service worker immediately
self.addEventListener('install', event => {
  // Force service worker to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app resources');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', event => {
  // Take control of all clients immediately
  event.waitUntil(
    Promise.all([
      // Take control of uncontrolled clients
      self.clients.claim(),
      
      // Remove old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Network first, falling back to cache strategy for most requests
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('gstatic.com')) {
    return;
  }
  
  // For navigation requests (HTML pages), use cache first then network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request)
            .then(fetchResponse => {
              return caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
            })
            .catch(() => {
              // If both cache and network fail, return the offline page
              return caches.match('/index.html');
            });
        })
    );
    return;
  }
  
  // For other requests, try network first, then cache
  event.respondWith(
    fetch(event.request.clone())
      .then(response => {
        // Cache successful responses
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try the cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // If the request is for an HTML page, return the offline page
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Otherwise just return a 404-like response
            return new Response('Not found', { status: 404, statusText: 'Not found' });
          });
      })
  );
}); 