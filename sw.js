const CACHE = 'vnd-rub-cache-v2';
const FILES = ['.','index.html','style.css','script.js','manifest.json','icons/icon-192.png','icons/icon-512.png'];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  if (evt.request.method !== 'GET') return;
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(evt.request, copy));
        return resp;
      }).catch(()=>{
        if (evt.request.mode === 'navigate') return caches.match('index.html');
      });
    })
  );
});
