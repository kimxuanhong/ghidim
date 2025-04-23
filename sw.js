// Service Worker for Card Game Score Tracker
const CACHE_NAME = 'card-game-v8';
const BASE_PATH = '/ghidim';
const urlsToCache = [
    // HTML pages
    `${BASE_PATH}/`,
    `${BASE_PATH}/index.html`,
    `${BASE_PATH}/scoring.html`,

    // CSS and JavaScript
    `${BASE_PATH}/styles.css`,
    `${BASE_PATH}/script.js`,
    `${BASE_PATH}/scoring.js`,
    `${BASE_PATH}/firebase.js`,
    `${BASE_PATH}/firebase-config.js`,

    // Icons and manifest
    `${BASE_PATH}/manifest.json`,
    `${BASE_PATH}/icons/icon-128x128.png`,
    `${BASE_PATH}/icons/icon-512x512.png`,

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

    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('[Service Worker] Caching resources');
            return cache.addAll(urlsToCache);
        })
        .catch(err => {
            console.error('[Service Worker] Cache add failed:', err);
        })
    );
});

// Kích hoạt: xóa các cache cũ và chiếm quyền điều khiển
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    event.waitUntil(
        Promise.all([
            // Chiếm quyền điều khiển ngay lập tức
            self.clients.claim(),
            // Xóa các cache cũ
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

// Thay đổi chiến lược: Cache First, fallback to Network
self.addEventListener('fetch', event => {
    // Bỏ qua các yêu cầu không phải HTTP/HTTPS
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Nếu tìm thấy trong cache, trả về và đồng thời cập nhật cache ngầm
                    const fetchPromise = fetch(event.request)
                        .then(response => {
                            // Cập nhật cache nếu đó là yêu cầu hợp lệ
                            if (response && response.status === 200 && response.type === 'basic') {
                                const responseToCache = response.clone();
                                caches.open(CACHE_NAME)
                                    .then(cache => {
                                        cache.put(event.request, responseToCache);
                                    });
                            }
                            return response;
                        })
                        .catch(err => {
                            console.log('[Service Worker] Fetch failed; returning cached response instead.', err);
                        });

                    // Trả về phản hồi từ cache ngay lập tức
                    return cachedResponse;
                }

                // Nếu không có trong cache, fetch từ mạng
                return fetch(event.request)
                    .then(response => {
                        // Nếu không phải là yêu cầu hợp lệ, trả về response ngay
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone response để cache
                        const responseToCache = response.clone();

                        // Thêm vào cache
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(error => {
                        console.error('[Service Worker] Fetch failed:', error);
                        
                        // Nếu là yêu cầu đến trang HTML, trả về trang offline
                        if (event.request.mode === 'navigate') {
                            return caches.match(`${BASE_PATH}/index.html`);
                        }
                        
                        // Thử tìm một cache phù hợp cho tài nguyên tương tự
                        return caches.match(new Request(event.request.url));
                    });
            })
    );
});