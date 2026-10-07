// CEDENAR OT - Service Worker
// Permite que la app funcione offline una vez instalada

const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = 'cedenar-ot-' + CACHE_VERSION;

// Archivos críticos a cachear (rutas absolutas para GitHub Pages project site)
const PRECACHE_URLS = [
  '/prubea/',
  '/prubea/index.html',
  '/prubea/manifest.json',
  '/prubea/icons/icon.svg',
  '/prubea/icons/icon-192.png',
  '/prubea/icons/icon-512.png'
];

// Instalación: cachear archivos críticos
self.addEventListener('install', event => {
  console.log('[SW] Instalando service worker...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando app shell');
        return cache.addAll(PRECACHE_URLS);
      })
      .catch(err => {
        console.warn('[SW] No se pudo cachear algún archivo (puede que no exista aún):', err);
      })
  );
});

// Activación: limpiar caches antiguas
self.addEventListener('activate', event => {
  console.log('[SW] Activando service worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => {
              console.log('[SW] Eliminando cache antigua:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: estrategia cache-first, network fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // Solo manejar peticiones al mismo origen
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, responseToCache))
                .catch(() => {});
            }
            return networkResponse;
          })
          .catch(() => {
            // Si es documento y no hay red, devolver el index cacheado
            if (event.request.destination === 'document') {
              return caches.match('/prubea/index.html');
            }
          });
      })
  );
});

// Mensaje: forzar activación
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
