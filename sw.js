// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v1';
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
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // Nếu tìm thấy trong cache, trả về luôn
                return cachedResponse;
            }

            // Nếu không có trong cache, fetch từ mạng và cache lại
            return fetch(event.request).then(networkResponse => {
                // Chỉ cache nếu response hợp lệ
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Nếu fetch mạng cũng thất bại, trả về fallback nếu có
                if (event.request.headers.get('accept')?.includes('text/html')) {
                    return caches.match('/index.html');
                }

                return new Response('Không thể tải tài nguyên.', {
                    status: 504,
                    statusText: 'Gateway Timeout'
                });
            });
        })
    );
});
