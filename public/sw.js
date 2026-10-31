/* TapRise Advanced Offline-First Service Worker (WhatsApp-style Cache Architecture) */

const CACHE_VERSION = 'taprise-v1.3.0';
const STATIC_CACHE_NAME = `taprise-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `taprise-dynamic-${CACHE_VERSION}`;
const PAGES_CACHE_NAME = `taprise-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Core routes and shell to precache for offline access
const PRECACHE_URLS = [
  '/',
  '/login/',
  '/login',
  '/register/',
  '/register',
  '/chat/',
  '/chat',
  '/admin/',
  '/admin',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico'
];

// Install Event: Precache essential routes & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then(async (cache) => {
      console.log('[TapRise SW] Precaching application shell & core routes...');
      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn('[TapRise SW] Precache skipped for:', url, err);
          }
        })
      );
      return self.skipWaiting();
    })
  );
});

// Activate Event: Clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => {
          if (![STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME, PAGES_CACHE_NAME].includes(name)) {
            console.log('[TapRise SW] Deleting obsolete cache:', name);
            return caches.delete(name);
          }
        })
      );
      await self.clients.claim();
      console.log('[TapRise SW] Active and controlling clients');
    })()
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and browser extensions
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. NAVIGATION REQUESTS (HTML Pages: /, /chat/, /admin/, /login/, etc.)
  // Strategy: Network-First with 2.5s timeout -> Fallback to Cache -> Fallback to offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);

          const networkResponse = await fetch(request, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(PAGES_CACHE_NAME);
            cache.put(request, networkResponse.clone());
            cache.put(url.pathname, networkResponse.clone());
            return networkResponse;
          }
        } catch (fetchErr) {
          console.log('[TapRise SW] Network failed or timed out for navigation:', url.pathname);
        }

        // Search cached pages
        const cachedPage =
          (await caches.match(request)) ||
          (await caches.match(url.pathname)) ||
          (await caches.match(url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : `${url.pathname}/`));

        if (cachedPage) {
          return cachedPage;
        }

        // Fallback to offline.html
        const offlinePage = await caches.match(OFFLINE_URL);
        if (offlinePage) {
          return offlinePage;
        }

        return new Response('TapRise Offline - Sem conexão à Internet', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })()
    );
    return;
  }

  // 2. STATIC ASSETS (_next/static, css, js, fonts, images)
  // Strategy: Cache-First (instant render from cache, stale-while-revalidate)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico');

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          fetch(request)
            .then(async (networkResponse) => {
              if (networkResponse && networkResponse.ok) {
                const cache = await caches.open(STATIC_CACHE_NAME);
                cache.put(request, networkResponse);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          return new Response('', { status: 408, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // 3. API & DYNAMIC REQUESTS (Network-First with Cache Fallback)
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(DYNAMIC_CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw err;
      }
    })()
  );
});
