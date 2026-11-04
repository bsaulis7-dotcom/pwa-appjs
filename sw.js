const CACHE_NAME = 'app-pwa-v2';
const urlsToCache = [
    './',
    './index.html',
    './styles.css', // <-- ¡Agregado aquí para que funcione offline!
    './app.js',
    './manifest.json'
];

// 1. Instalación del Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Recursos del sistema guardados en caché con éxito');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// 2. Activación y limpieza de cachés viejas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando caché antigua del sistema:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Interceptar peticiones con estrategia robusta offline
self.addEventListener('fetch', event => {
    // Solo manejamos peticiones GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Si está en caché, lo devuelve de inmediato
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Si no está en caché, lo busca en la red
                return fetch(event.request)
                    .then(networkResponse => {
                        return networkResponse;
                    })
                    .catch(() => {
                        // Si falla la red y es una petición de navegación ( HTML ), 
                        // devolvemos el index.html principal para que la app no falle.
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                    });
            })
    );
});