// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/scoring.html',
  '/styles.css',
  '/script.js',
  '/scoring.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
];

// Check if this is running in Edge
const isEdgeBrowser = () => {
  return self.navigator && self.navigator.userAgent && self.navigator.userAgent.indexOf("Edge") > -1;
};

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  // Force update for Edge browser
  if (isEdgeBrowser()) {
    self.skipWaiting();
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  // Force activate for Edge browser
  if (isEdgeBrowser()) {
    self.clients.claim();
  }
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - respond with cached resources when offline
self.addEventListener('fetch', event => {
  // Edge-specific handling
  if (isEdgeBrowser()) {
    // Simplified strategy for Edge: Try network first, then cache
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Standard handling for other browsers
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Open cache and store the response
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
            
          return response;
        });
      })
      .catch(() => {
        // If offline and requesting a page, show fallback content
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      })
  );
}); 