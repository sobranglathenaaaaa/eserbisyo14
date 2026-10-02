const CACHE_NAME = 'eserbisyo-shell-v3';
const DRAFT_KEY = 'eserbisyo-offline-draft';
const APP_CACHE_PREFIX = 'eserbisyo-';

// Core routes and shells to precache for offline availability across all portals
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/login',
  '/terms-and-conditions',
  '/data-privacy',
  '/manifest.webmanifest',
  '/favicon.ico',
];

// Network First with Cache Fallback and Offline Page Fallback (for HTML pages)
async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // 1. Try exact cached page
    const cachedPage = await cache.match(request);
    if (cachedPage) {
      return cachedPage;
    }

    // 2. Try match without query params or hash
    const url = new URL(request.url);
    const cleanUrl = url.origin + url.pathname;
    const cleanCached = await cache.match(cleanUrl);
    if (cleanCached) {
      return cleanCached;
    }

    // 3. Fallback to /offline page
    const offlinePage = await cache.match('/offline');
    if (offlinePage) {
      return offlinePage;
    }

    // 4. Ultimate fallback to root
    const rootPage = await cache.match('/');
    if (rootPage) {
      return rootPage;
    }

    return new Response(
      '<html><body><h1>Offline</h1><p>You are currently offline. Please check your internet connection.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' }, status: 503 }
    );
  }
}

// Cache First with background network refresh for static assets (JS, CSS, images, fonts)
async function cacheFirstAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    // Background refresh
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      })
      .catch(() => {
        // Ignore background fetch error when offline
      });
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return cached || new Response('', { status: 408, statusText: 'Request timed out offline' });
  }
}

// Stale-While-Revalidate for GET API requests (Announcements, Directory, Profile, Templates)
async function staleWhileRevalidateAPI(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((err) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'Currently offline and no cached version is available.',
          isOffline: true,
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      );
    });

  return cachedResponse || fetchPromise;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Pre-cache warning for some routes:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const staleKeys = keys.filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE_NAME);
      await Promise.all(staleKeys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Allow non-GET requests to pass directly to network (handled by offline-sync outbox if failed)
  if (request.method !== 'GET') {
    return;
  }

  // Handle HTML document navigation (e.g. resident, staff, admin pages)
  const isDocumentRequest = request.mode === 'navigate' || request.destination === 'document';
  if (isDocumentRequest) {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Handle Static Assets (CSS, JS, Fonts, Images)
  const isStaticAsset =
    ['style', 'script', 'image', 'font'].includes(request.destination) ||
    url.pathname.startsWith('/_next/static') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|css|js)$/i);

  if (isStaticAsset) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  // Handle Read-Only API requests (e.g. announcements, public lists, document templates)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidateAPI(request));
    return;
  }

  // Default fallback for any other GET request
  event.respondWith(networkFirstNavigation(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'SAVE_DRAFT') {
    self.registration?.active?.postMessage({ type: 'DRAFT_SAVED', key: DRAFT_KEY });
  }
});
