const CACHE_NAME = 'payment-pwa-v1';
const CACHE_FILES = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js'
];

// =========================================================
// Promesa: Instala el Service Worker y cachea archivos necesarios
// =========================================================
self.addEventListener('install', (event) => {
    console.log('SW: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(CACHE_FILES))
            .then(() => self.skipWaiting())
            .catch(err => console.error('Error al cachear:', err))
    );
});

// =========================================================
// Promise.all(): Activa el Service Worker y elimina caches antiguos en paralelo
// =========================================================
self.addEventListener('activate', (event) => {
    console.log('SW: Activando...');
    event.waitUntil(
        caches.keys()
            .then(keys => {
                return Promise.all(
                    keys.map(key => {
                        if (key !== CACHE_NAME) {
                            console.log('Eliminando cache viejo:', key);
                            return caches.delete(key);
                        }
                    })
                );
            })
            .then(() => self.clients.claim())
    );
});

// =========================================================
// Promesa: Intercepta peticiones usando estrategia Cache First
// =========================================================
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                if (cached) {
                    console.log('Desde cache:', event.request.url);
                    return cached;
                }

                console.log('Desde red:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => cache.put(event.request, responseClone));
                        }
                        return response;
                    })
                    .catch(err => {
                        console.error('Error fetch:', err);
                        throw err;
                    });
            })
    );
});

console.log('Service Worker listo');
