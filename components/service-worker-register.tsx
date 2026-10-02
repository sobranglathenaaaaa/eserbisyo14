'use client';

import { useEffect } from 'react';

const CACHE_PREFIX = 'eserbisyo-';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const disableServiceWorker = process.env.NEXT_PUBLIC_DISABLE_SW === 'true';
    const enableInDev = process.env.NEXT_PUBLIC_ENABLE_SW_DEV === 'true';
    const isProd = process.env.NODE_ENV === 'production';

    // In dev mode (unless explicitly enabled for testing offline SW), clean up old SW
    if (!isProd && !enableInDev || disableServiceWorker) {
      const cleanupDevServiceWorker = async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));

          if ('caches' in window) {
            const keys = await caches.keys();
            const appCacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
            await Promise.all(appCacheKeys.map((key) => caches.delete(key)));
          }
        } catch {
          // No-op when cleanup fails
        }
      };

      void cleanupDevServiceWorker();
      return;
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Check for SW updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Service Worker registration skipped or failed:', err);
      });
  }, []);

  return null;
}
