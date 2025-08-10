const CACHE = 'vnd-rub-cache-v1';
const OFFLINE_FILES = [
  '.',
  'index.html',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        // cache new GET requests (simple strategy)
        if (e.request.method === 'GET' && resp && resp.status === 200 && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => {
        // offline fallback: for navigation return index.html
        if (e.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
