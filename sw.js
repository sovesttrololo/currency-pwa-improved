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
  // Для HTML, CSS, JS файлов используем Network First стратегию
  if (event.request.destination === 'document' || 
      event.request.destination === 'script' || 
      event.request.destination === 'style') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Клонируем ответ для кэширования
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // Если сеть недоступна, берем из кэша
          return caches.match(event.request);
        })
    );
  } else {
    // Для других ресурсов (изображения и т.д.) используем Cache First
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Возвращаем кэшированную версию или загружаем из сети
          return response || fetch(event.request);
        })
    );
  }
});
