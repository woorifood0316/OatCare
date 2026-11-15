// 참오트케어 home-screen app service worker.
// Pages always come from the network (prices, stock and login must be live); only when the phone is offline does a
// page request get the small offline notice. Nothing else is cached or intercepted.
const CACHE = 'oc-offline-v2';
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

// App notifications (web push): order / delivery notices sent by the shop (src/lib/push.ts).
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        data = { title: '참오트케어', body: event.data ? event.data.text() : '' };
    }
    const title = data.title || '참오트케어';
    event.waitUntil(
        self.registration.showNotification(title, {
            body: data.body || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: data.tag || undefined,
            data: { url: data.url || '/' },
        }),
    );
});

// Tapping a notification opens (or focuses) the page it is about.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            for (const c of list) {
                if (c.url.startsWith(self.location.origin) && 'focus' in c) {
                    c.navigate(url);
                    return c.focus();
                }
            }
            return self.clients.openWindow(url);
        }),
    );
});
