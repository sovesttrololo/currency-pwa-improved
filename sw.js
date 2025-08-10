const CACHE_NAME = 'currency-calc-v1';
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

// Обработка запросов
self.addEventListener('fetch', event => {
  // Игнорируем запросы, которые не поддерживаются (например, chrome-extension)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    // Сначала пытаемся получить ресурс из сети
    fetch(event.request)
      .then(response => {
        // Если запрос успешен, клонируем ответ и сохраняем его в кэш
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Если сеть недоступна, пытаемся получить ресурс из кэша
        return caches.match(event.request);
      })
  );
});
