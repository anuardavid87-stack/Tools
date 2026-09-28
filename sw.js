/**
 * ToolMaster Pro - Progressive Web App (PWA) Service Worker
 * Proporciona soporte offline completo, caché de recursos estáticos y bypass para llamadas en vivo a Supabase.
 */

const CACHE_NAME = 'toolmaster-pro-v1.2';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './supabase-config.js',
  './manifest.json',
  './lib/vue.global.prod.js',
  './lib/tailwindcss.js',
  './lib/supabase.js',
  './icons/icon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg'
];

// Evento Install: Pre-cargar en caché todos los recursos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-cargando archivos estáticos para uso offline...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    }).catch((err) => {
      console.warn('[PWA SW] Error al pre-cargar caché:', err);
    })
  );
});

// Evento Activate: Limpiar cachés antiguas si se actualiza la versión
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[PWA SW] Eliminando versión antigua de caché:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Evento Fetch: Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Omitir peticiones a la API o WebSocket de Supabase (siempre deben ir en vivo a la red)
  if (url.hostname.includes('supabase.co') || url.protocol === 'ws:' || url.protocol === 'wss:') {
    return;
  }

  // 2. Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  // 3. Estrategia: Cache First con Network Fallback (y actualización en segundo plano)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Si está en caché, devolverlo inmediatamente y refrescar en segundo plano si hay red
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {
          // Sin conexión: no pasa nada, ya servimos de caché
        });
        return cachedResponse;
      }

      // Si no está en caché, buscar en la red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback para navegación de página: devolver index.html si no hay conexión
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
