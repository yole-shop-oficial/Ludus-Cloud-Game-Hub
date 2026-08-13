const CACHE_NAME = 'ludus-cache-v1';
const OFFLINE_URLS = [
  '/',
  '/manifest.json',
  '/globals.css',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS).catch((err) => {
        console.warn('Algunos recursos estáticos fallaron al precargar en ServiceWorker:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass entirely for Supabase database/realtime actions
  if (url.hostname.includes('supabase.co') || event.request.method !== 'GET') {
    return;
  }

  // Network-first falling back to cache for standard pages/assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache static files or Next.js JS files
            if (
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.jpg') ||
              url.pathname.endsWith('.svg') ||
              url.pathname.includes('_next/static')
            ) {
              cache.put(event.request, resClone);
            }
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // Custom response for offline fallback of missing resources
          return new Response('Offline: Recurso no precargado', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
