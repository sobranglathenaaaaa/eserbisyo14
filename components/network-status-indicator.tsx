'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  getPendingOfflineCount,
  subscribeToOfflineOutbox,
  syncAllOfflineActions,
} from '@/lib/offline/offline-sync';
import { syncBrowserPgToSupabase } from '@/lib/offline/browser-pglite';

export default function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRestoredToast, setShowRestoredToast] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    setPendingCount(getPendingOfflineCount());

    const handleOnline = async () => {
      setIsOnline(true);
      setShowRestoredToast(true);
      setIsSyncing(true);

      try {
        // Auto sync both Outbox actions and in-browser PostgreSQL (PGlite) records
        const [outboxRes, pgRes] = await Promise.allSettled([
          getPendingOfflineCount() > 0 ? syncAllOfflineActions() : Promise.resolve({ synced: 0, failed: 0 }),
          syncBrowserPgToSupabase(),
        ]);

        const syncedOutbox = outboxRes.status === 'fulfilled' ? outboxRes.value.synced : 0;
        const syncedPg =
          pgRes.status === 'fulfilled' ? pgRes.value.syncedDocs + pgRes.value.syncedIncidents : 0;
        const totalSynced = syncedOutbox + syncedPg;

        setPendingCount(getPendingOfflineCount());
        if (totalSynced > 0) {
          setSyncMessage(`Nai-sync ang ${totalSynced} transaksyon sa Supabase database.`);
        }
      } catch (err) {
        console.warn('Auto-sync error:', err);
      } finally {
        setIsSyncing(false);
      }

      setTimeout(() => {
        setShowRestoredToast(false);
        setSyncMessage(null);
      }, 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredToast(false);
    };

    const unsubscribeOutbox = subscribeToOfflineOutbox(() => {
      setPendingCount(getPendingOfflineCount());
    });

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeOutbox();
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const [outboxRes, pgRes] = await Promise.allSettled([
        syncAllOfflineActions(),
        syncBrowserPgToSupabase(),
      ]);

      const syncedOutbox = outboxRes.status === 'fulfilled' ? outboxRes.value.synced : 0;
      const syncedPg =
        pgRes.status === 'fulfilled' ? pgRes.value.syncedDocs + pgRes.value.syncedIncidents : 0;
      const totalSynced = syncedOutbox + syncedPg;

      setPendingCount(getPendingOfflineCount());
      if (totalSynced > 0) {
        setSyncMessage(`Nai-sync ang ${totalSynced} transaksyon sa Supabase.`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // If online and no pending toast, render nothing to keep UI clean
  if (isOnline && !showRestoredToast && !syncMessage) {
    return null;
  }

  return (
    <aside
      aria-label="Network and synchronization status"
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-all duration-300 ease-in-out"
    >
      <div className="max-w-3xl mx-auto px-3 pt-2">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="pointer-events-auto bg-amber-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-amber-500/40 flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <WifiOff className="h-4 w-4 shrink-0 text-amber-100" />
              <div className="truncate">
                <span className="font-bold">Offline Mode:</span> Gumagana gamit ang naka-save na datos.
                {pendingCount > 0 && (
                  <span className="ml-1.5 font-semibold bg-amber-800/80 px-2 py-0.5 rounded-md text-amber-100">
                    {pendingCount} submission naka-queue
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 bg-amber-800 hover:bg-amber-900 text-white px-2.5 py-1 rounded-lg font-medium text-xs transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Subukan Muli</span>
              </button>
            </div>
          </div>
        )}

        {/* Back Online Notification Toast */}
        {isOnline && (showRestoredToast || syncMessage) && (
          <div className="pointer-events-auto bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-600 flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2.5">
              <Wifi className="h-4 w-4 text-emerald-200 shrink-0" />
              <div>
                <span className="font-bold">May Internet Connection na:</span>{' '}
                {syncMessage || (isSyncing ? 'Nagsi-sync ng data...' : 'Naka-konekta na muli sa eSerbisyo.')}
              </div>
            </div>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 bg-emerald-900 hover:bg-emerald-950 text-emerald-100 px-3 py-1 rounded-lg font-semibold text-xs transition-colors disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                <span>{isSyncing ? 'Nagsi-sync...' : `I-sync (${pendingCount})`}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
