// ==========================================================
// SERVICE WORKER - Gestor de Pendientes
// Estrategia: "network-first" para los archivos de la app.
//   - Con internet: siempre trae la versión más nueva y la guarda.
//   - Sin internet (o internet muy lento): usa la copia guardada.
// Así las actualizaciones llegan solas, sin avisar a nadie.
// Los datos del cliente viven en localStorage y este archivo NO los toca.
// ==========================================================

// >>> REPOSITORIO DE PRUEBAS: usa estos valores.
// >>> REPOSITORIO REAL (clientes): cambia SOLO CACHE_NAME a 'app-pwa-v3'
// >>> y CACHE_PREFIX a 'app-pwa-'.
const CACHE_PREFIX = 'app-pwa-';
const CACHE_NAME = 'app-pwa-v3';

const NETWORK_TIMEOUT_MS = 5000; // si la red tarda más, se usa la copia guardada

const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json'
];

// 1. Instalación: guarda los archivos (saltándose la caché HTTP para no guardar copias viejas)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' }))))
            .then(() => self.skipWaiting())
    );
});

// 2. Activación: borra SOLO cachés viejas de esta misma app (mismo prefijo).
//    Así nunca borra la caché de otra app alojada en el mismo dominio.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

// 3. Network-first con tiempo límite y respaldo en caché
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    try {
        const response = await Promise.race([
            fetch(request),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS))
        ]);
        // Guardamos respuestas correctas (también las de CDN externos, que llegan como "opaque")
        if (response && (response.status === 200 || response.type === 'opaque')) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        if (request.mode === 'navigate') {
            const index = await cache.match('./index.html');
            if (index) return index;
        }
        return Response.error();
    }
}

self.addEventListener('fetch', event => {
    const request = event.request;
    if (request.method !== 'GET') return;
    if (!request.url.startsWith('http')) return;
    event.respondWith(networkFirst(request));
});
