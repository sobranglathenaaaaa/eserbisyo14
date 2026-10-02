'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  WifiOff,
  RefreshCw,
  Home,
  FileText,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRight,
  Send,
  AlertTriangle,
} from 'lucide-react';
import { getOfflineOutbox, syncAllOfflineActions, type OfflineAction } from '@/lib/offline/offline-sync';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [outbox, setOutbox] = useState<OfflineAction[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : false);
    setOutbox(getOfflineOutbox());

    const handleOnline = () => {
      setIsOnline(true);
      void handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const result = await syncAllOfflineActions();
      setOutbox(getOfflineOutbox());
      if (result.synced > 0) {
        setSyncFeedback(`Matagumpay na nai-sync ang ${result.synced} transaksyon!`);
      } else if (result.failed > 0) {
        setSyncFeedback(`May ${result.failed} transaksyon na hindi na-sync. Pakisubukan muli.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = outbox.filter((item) => item.status === 'pending' || item.status === 'failed').length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/30 to-slate-100 px-4 py-8 text-slate-800 flex flex-col justify-between">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header Branding */}
        <header className="flex items-center justify-between border-b border-emerald-900/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              eS
            </div>
            <div>
              <h1 className="text-xl font-bold text-emerald-950 tracking-tight">eSerbisyo Barangay Portal</h1>
              <p className="text-xs text-emerald-800/80 font-medium">Digital Public Services • Offline Support Mode</p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                May Internet Connection Muli
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-amber-700" />
                Naka-Offline Mode
              </>
            )}
          </div>
        </header>

        {/* Hero Offline Message */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 sm:p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
          <div className="p-4 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <WifiOff className="h-12 w-12" />
          </div>
          <div className="space-y-2 flex-1">
            <h2 className="text-2xl font-bold text-slate-900">
              Kasalukuyang Mahina o Walang Koneksyon sa Internet
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Huwag mag-alala! Ang eSerbisyo ay may **offline caching & storage**. Maaari mo pa ring ma-access ang mga
              naunang nabuksang pahina, at ang anumang mga bagong forms o request na iyong isusumite ay awtomatikong
              ise-save sa iyong device at ipapadala kapag nagka-internet na muli.
            </p>
            <div className="pt-2 flex flex-wrap gap-3 items-center justify-center sm:justify-start">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Subukan Muling Kumonekta
              </button>
              {pendingCount > 0 && isOnline && (
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSyncing ? 'Nagsi-sync...' : `I-sync ang ${pendingCount} Na-save na Transaksyon`}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Feedback Alert */}
        {syncFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Outbox / Queued Submissions section if any */}
        {outbox.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-slate-900">Mga Naka-pending na Transaksyon ({pendingCount})</h3>
              </div>
              <span className="text-xs text-slate-500">Ise-sync kapag may signal na</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {outbox.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p className="text-xs text-slate-500">
                      Modulo: <span className="capitalize">{item.module}</span> • Na-save noong:{' '}
                      {new Date(item.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      item.status === 'syncing'
                        ? 'bg-blue-100 text-blue-800'
                        : item.status === 'failed'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'syncing'
                      ? 'Nagsi-sync...'
                      : item.status === 'failed'
                      ? 'Failed (Iuulit)'
                      : 'Naka-queue'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Nav to Cached Modules */}
        <section className="space-y-4">
          <h3 className="text-base font-bold text-slate-900">Bumalik sa mga Naka-cache na Portal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/resident/dashboard"
              className="p-5 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 w-fit">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                  Resident Portal
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  I-view ang iyong document requests, blotter reports, at profile history.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-emerald-700 gap-1 pt-2">
                Pumunta sa Resident Shell <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/staff/dashboard"
              className="p-5 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700 w-fit">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Staff Operations
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  I-view ang mga nakabinbing request, incident files, at reservations.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-blue-700 gap-1 pt-2">
                Pumunta sa Staff Shell <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              href="/"
              className="p-5 bg-white rounded-xl border border-slate-200 hover:border-slate-500 hover:shadow-md transition-all group flex flex-col justify-between space-y-3"
            >
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700 w-fit">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 group-hover:text-slate-800 transition-colors">
                  Pangunahing Landing Page
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Bumalik sa pampublikong pahina, mga anunsyo, at emergency hotlines.
                </p>
              </div>
              <div className="flex items-center text-xs font-semibold text-slate-700 gap-1 pt-2">
                Pumunta sa Home <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </section>

        {/* Emergency Contacts (Always useful when offline) */}
        <section className="bg-gradient-to-r from-emerald-900 to-emerald-950 text-white rounded-2xl p-6 sm:p-7 shadow-md space-y-4">
          <div className="flex items-center gap-3">
            <PhoneCall className="h-6 w-6 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg">Emergency & Barangay Direct Lines</h3>
              <p className="text-xs text-emerald-200">
                Maaaring tawagan agad gamit ang cellular phone kahit walang data connection:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-xs text-emerald-200 font-medium">Barangay Hall Hotline</p>
              <p className="text-base font-bold tracking-wide mt-0.5">(02) 8123-4567</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-xs text-emerald-200 font-medium">Barangay Tanod / Patrol</p>
              <p className="text-base font-bold tracking-wide mt-0.5">0917-800-BGY1</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <p className="text-xs text-emerald-200 font-medium">National Emergency Line</p>
              <p className="text-base font-bold tracking-wide mt-0.5">911 / 8888</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="max-w-4xl mx-auto w-full pt-8 text-center text-xs text-slate-500">
        eSerbisyo Offline Service Worker Engine • Powered by Next.js PWA
      </footer>
    </main>
  );
}
