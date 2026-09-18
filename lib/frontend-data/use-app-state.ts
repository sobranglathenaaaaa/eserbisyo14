'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AppState, Locale } from '../types/models';
import { getState, getStateSync, setSessionLocale, subscribeToState } from './store';

export function useAppState() {
  const [state, setState] = useState<AppState>(() => getStateSync());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const nextState = await getState();
        if (!active) return;
        setState(nextState);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load app state.');
        setLoading(false);
      }
    };

    const unsubscribe = subscribeToState(() => {
      void (async () => {
        const nextState = await getState();
        if (!active) return;
        setState(nextState);
      })();
    });

    void hydrate();
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const session = useMemo(() => state.session, [state]);
  const user = useMemo(() => {
    if (!state.session) return null;
    return state.users.find((item) => item.id === state.session?.userId && !item.isDeleted) ?? null;
  }, [state]);

  const setLocale = (locale: Locale) => {
    void setSessionLocale(locale);
  };

  return {
    state,
    session,
    user,
    locale: session?.locale ?? 'en',
    setLocale,
    loading,
    error,
  };
}
