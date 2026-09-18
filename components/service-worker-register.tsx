'use client';

import { useEffect } from 'react';

const CACHE_PREFIX = 'eserbisyo-';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const disableServiceWorker = process.env.NEXT_PUBLIC_DISABLE_SW === 'true';
    if (process.env.NODE_ENV !== 'production' || disableServiceWorker) {
      const cleanupDevServiceWorker = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ('caches' in window) {
          const keys = await caches.keys();
          const appCacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
          await Promise.all(appCacheKeys.map((key) => caches.delete(key)));
        }
      };

      cleanupDevServiceWorker().catch(() => {
        // No-op when service worker support checks fail.
      });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No-op when registration is unavailable.
    });
  }, []);

  return null;
}
