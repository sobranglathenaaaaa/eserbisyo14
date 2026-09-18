const CACHE_NAME = 'eserbisyo-shell-v2';
const DRAFT_KEY = 'eserbisyo-offline-draft';
const APP_CACHE_PREFIX = 'eserbisyo-shell-';
const PRECACHE_URLS = ['/', '/login'];

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('/');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
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
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  const isDocumentRequest = request.mode === 'navigate' || request.destination === 'document';
  if (isDocumentRequest) {
    event.respondWith(networkFirst(request));
    return;
  }

  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(request.destination);
  if (isStaticAsset) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SAVE_DRAFT') {
    self.registration?.active?.postMessage({ type: 'DRAFT_SAVED', key: DRAFT_KEY });
  }
});
