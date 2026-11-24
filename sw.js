// ============================================================================
// sw.js - Service Worker con App Shell que incluye ./geo-helper.js
// Restricción técnica: 100% Promesas nativas (.then, .catch, .finally)
// ============================================================================

const CACHE_NAME = 'pwa-geo-modular-v1';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './geo-helper.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instalación: Precaché de los recursos estáticos obligatorios (incluyendo ./geo-helper.js)
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precargando App Shell en caché:', APP_SHELL);
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error durante la instalación:', error);
      })
      .finally(() => {
        console.log('[SW] Fase de instalación finalizada.');
      })
  );
});

// Activación: Limpieza de cachés antiguas y toma de control del scope
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        const promesasLimpieza = keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
          return Promise.resolve();
        });
        return Promise.all(promesasLimpieza);
      })
      .then(() => {
        return self.clients.claim();
      })
      .catch((error) => {
        console.error('[SW] Error durante la activación:', error);
      })
      .finally(() => {
        console.log('[SW] Service Worker activo y controlando el ámbito.');
      })
  );
});

// Estrategia Cache First con fallback a red para activos estáticos
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .catch((error) => {
            console.warn('[SW] Red no disponible para:', event.request.url, error);
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});
