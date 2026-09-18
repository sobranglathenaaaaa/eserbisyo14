'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Locale, Session, User, UserRole, AppState } from '@/lib/types/models';
import { logout } from '@/lib/frontend-data/store';
import { useAppState } from '@/lib/frontend-data/use-app-state';

export interface PortalShellContext {
  session: Session;
  user: User;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  logoutAndRedirect: () => void;
  state: AppState;
}

function PortalShellSkeleton() {
  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top,#f7fcf9_0%,#eef6f1_42%,#e6f1ec_100%)] p-3 md:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading portal</span>
      <div className="mx-auto max-w-[1560px]">
        <div
          className="mb-4 min-h-[104px] rounded-[18px] border border-[color:var(--portal-shell-border)] bg-[color:rgba(13,53,38,0.94)] p-4 shadow-[var(--portal-shadow-1)]"
          aria-hidden="true"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/15 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="grid gap-2">
                <div className="h-3 w-40 rounded-full bg-white/20 motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-2.5 w-28 rounded-full bg-white/15 motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 rounded-[10px] bg-white/15 motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-9 w-24 rounded-[10px] bg-white/15 motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
          <aside
            className="hidden rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-4 shadow-[var(--portal-shadow-1)] lg:block"
            aria-hidden="true"
          >
            <div className="mb-4 h-14 rounded-[var(--portal-radius-md)] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
            <div className="grid gap-3">
              <div className="h-3 w-24 rounded-full bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-11 rounded-[var(--portal-radius-md)] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-11 rounded-[var(--portal-radius-md)] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-11 rounded-[var(--portal-radius-md)] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-3 w-20 rounded-full bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-11 rounded-[var(--portal-radius-md)] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
          </aside>

          <section className="grid content-start gap-4 md:gap-5" aria-hidden="true">
            <div className="rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] p-4 shadow-[var(--portal-shadow-1)]">
              <div className="grid gap-3">
                <div className="h-3 w-28 rounded-full bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-8 w-4/5 rounded-[12px] bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-full rounded-full bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
                <div className="h-4 w-2/3 rounded-full bg-[color:var(--portal-surface-3)] motion-safe:animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-44 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[var(--portal-shadow-1)] motion-safe:animate-pulse motion-reduce:animate-none" />
              <div className="h-44 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[var(--portal-shadow-1)] motion-safe:animate-pulse motion-reduce:animate-none" />
            </div>
            <div className="h-52 rounded-[var(--portal-radius-lg)] border border-[color:var(--portal-border-soft)] bg-[color:var(--portal-surface-1)] shadow-[var(--portal-shadow-1)] motion-safe:animate-pulse motion-reduce:animate-none" />
          </section>
        </div>
      </div>
    </main>
  );
}

function roleHome(role: UserRole) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  return '/resident/dashboard';
}

export function PortalShellBase({
  role,
  allowedRoles,
  children,
}: {
  role?: UserRole;
  allowedRoles?: UserRole[];
  children: (context: PortalShellContext) => React.ReactNode;
}) {
  const { state, session, user, locale, setLocale, loading, error } = useAppState();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isRecoveringSession, setIsRecoveringSession] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveAllowedRoles = allowedRoles ?? (role ? [role] : undefined);

  useEffect(() => {
    if (!mounted || loading || error) return;

    if (!session || !user) {
      if (isRecoveringSession) return;
      setIsRecoveringSession(true);
      router.replace('/login');
      return;
    }

    if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) {
      router.replace(roleHome(user.role));
    }
  }, [effectiveAllowedRoles, error, isRecoveringSession, loading, mounted, router, session, user]);

  if (!mounted || loading) {
    return <PortalShellSkeleton />;
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[color:#f3f9f5] p-6 text-sm text-[color:var(--text-700)]">
        {error}
      </main>
    );
  }

  if (!session || !user || (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role))) {
    return <PortalShellSkeleton />;
  }

  const logoutAndRedirect = () => {
    void (async () => {
      await logout();
      router.replace('/login');
      router.refresh();
    })();
  };

  return children({ session, user, locale, setLocale, logoutAndRedirect, state });
}
