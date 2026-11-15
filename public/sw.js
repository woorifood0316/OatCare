// 참오트케어 home-screen app service worker.
// Pages always come from the network (prices, stock and login must be live); only when the phone is offline does a
// page request get the small offline notice. Nothing else is cached or intercepted.
const CACHE = 'oc-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.mode !== 'navigate' || req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
});
