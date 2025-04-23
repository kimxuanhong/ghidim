// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v7';
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

// Cài đặt: cache các tài nguyên tĩnh và kích hoạt ngay
self.addEventListener('install', event => {
    console.log('[Service Worker] Install');
    // Kích hoạt ngay thay vì chờ đến khi không còn client cũ
    self.skipWaiting().then(r => console.log('[Service Worker] Installed'));

    event.waitUntil(caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching resources');
                return cache.addAll(urlsToCache);
            }).catch(err => {
                console.error('[Service Worker] Cache add failed:', err);
            })
    );
});

// Kích hoạt: xóa các cache cũ và chiếm quyền điều khiển
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

// Intercept fetch: ưu tiên mạng, fallback về cache nếu lỗi
self.addEventListener('fetch', event => {
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
                    return caches.match('/ghidim/index.html');
                }
            })
    );
});