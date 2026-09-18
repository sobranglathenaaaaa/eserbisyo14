'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { UserRole } from '@/lib/types/models';

function roleHome(role: UserRole) {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'staff') return '/staff/dashboard';
  return '/resident/dashboard';
}

export function LegalBackButton() {
  const [target, setTarget] = useState('/login');
  const [label, setLabel] = useState('Back to Login');
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    try {
      const sp = typeof window !== 'undefined' ? window.location.search : '';
      if (sp.includes('embed=1') || sp.includes('embed=true')) setIsEmbedded(true);
    } catch (e) {
      // ignore
    }

    void (async () => {
      try {
        const response = await fetch('/api/v1/auth/session', { credentials: 'same-origin' });
        if (!response.ok) return;
        const payload = (await response.json()) as { success?: boolean; data?: { role?: UserRole } };
        const role = payload.success ? payload.data?.role : null;
        if (!role || cancelled) return;
        setTarget(roleHome(role));
        setLabel('Back to Dashboard');
      } catch {
        // Logged-out users keep the default login target.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isEmbedded) return null;

  return (
    <Link
      href={target}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-[color:#1b6b46] bg-white px-4 py-2 text-sm font-semibold text-[color:#144b32] shadow-[0_2px_10px_rgba(20,75,50,0.08)] transition-colors hover:bg-[#f3faf6]"
    >
      <ChevronLeft size={16} />
      {label}
    </Link>
  );
}
