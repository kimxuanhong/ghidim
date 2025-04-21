// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v4';
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
  
  // Firebase libs (external resources) - these are marked as optional
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
        // First try to cache all local resources (essential ones)
        const localResources = urlsToCache.filter(url => !url.includes('gstatic.com'));
        return cache.addAll(localResources)
          .then(() => {
            // Then try to cache Firebase resources, but don't fail if they can't be cached
            const firebaseResources = urlsToCache.filter(url => url.includes('gstatic.com'));
            return Promise.allSettled(
              firebaseResources.map(url => 
                fetch(url, { mode: 'no-cors' })
                  .then(response => cache.put(url, response))
                  .catch(err => console.log('Could not cache Firebase resource:', url, err))
              )
            );
          });
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
  // Skip non-GET requests and non-http(s) requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }
  
  // Special handling for Firebase API requests - don't try to cache or handle them
  if (event.request.url.includes('firebasedatabase.app') || 
      event.request.url.includes('firebaseio.com')) {
    // Let the browser handle Firebase requests naturally
    // This prevents issues when offline as Firebase has its own offline capabilities
    return;
  }
  
  // For Firebase library resources, try cache first, then network
  if (event.request.url.includes('gstatic.com')) {
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
            .catch(error => {
              console.error('Failed to fetch Firebase library:', error);
              // Return a fallback response for Firebase libraries
              return new Response(
                'console.log("Firebase library not available offline");', 
                { 
                  headers: { 'Content-Type': 'application/javascript' },
                  status: 200
                }
              );
            });
        })
    );
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
  
  // For all other requests, try network first, then cache
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
            if (event.request.headers.get('accept') && 
                event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Otherwise just return a 404-like response
            return new Response('Not found', { status: 404, statusText: 'Not found' });
          });
      })
  );
}); 