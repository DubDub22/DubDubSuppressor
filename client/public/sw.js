const CACHE_NAME = 'dubdub22-cache-v15';

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Only handle GET requests
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

    // Don't intercept API calls
    if (event.request.url.includes('/api/')) return;

    // Don't cache /assets/ — browser handles JS/CSS with native caching + ETags
    if (event.request.url.includes('/assets/')) return;

    event.respondWith(
        fetch(event.request.clone())
            .then(response => {
                // Only cache HTML (navigation requests) for offline support
                if (event.request.mode === 'navigate') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    if (event.request.mode === 'navigate') {
                        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
                    }
                    return new Response('', { status: 503 });
                });
            })
    );
});
