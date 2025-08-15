const CACHE_NAME = 'currency-calc-v2'; // Изменена версия кэша
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './script.js',
  './icon-192.png',
  './icon-512.png',
  './favicon.ico'
];

// Установка Service Worker и кэширование файлов
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .catch(err => console.error('Ошибка кэширования', err))
  );
  self.skipWaiting();
});

// Активация и очистка старого кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаление старого кэша:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Обработка запросов - сначала сеть, потом кэш (Network First для HTML/JS/CSS)
self.addEventListener('fetch', event => {
    if (event.request.mode === 'navigate') {
        // Для HTML — Cache First
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(resp => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resp.clone());
                        return resp;
                    });
                });
            })
        );
    } else if (event.request.destination === 'script' || event.request.destination === 'style') {
        // Для JS/CSS — Cache First
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(resp => {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, resp.clone());
                    });
                    return resp;
                });
            })
        );
    } else {
        // Остальное — Cache First
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});

