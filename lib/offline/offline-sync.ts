'use client';

export interface OfflineAction {
  id: string;
  module: 'resident' | 'staff' | 'admin' | 'public';
  title: string;
  description?: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload: any;
  headers?: Record<string, string>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
  retryCount: number;
}

const STORAGE_KEY = 'eserbisyo_offline_outbox_v1';
const SYNC_EVENT = 'eserbisyo-offline-outbox-change';

function getStoredOutbox(): OfflineAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineAction[];
  } catch {
    return [];
  }
}

function saveStoredOutbox(actions: OfflineAction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { count: actions.length } }));
  } catch (err) {
    console.error('Failed to save offline outbox to localStorage:', err);
  }
}

/**
 * Enqueue an action to be executed offline and synced when network is available.
 */
export function enqueueOfflineAction(action: Omit<OfflineAction, 'id' | 'createdAt' | 'status' | 'retryCount'>): OfflineAction {
  const newAction: OfflineAction = {
    ...action,
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  };

  const current = getStoredOutbox();
  const updated = [newAction, ...current];
  saveStoredOutbox(updated);
  return newAction;
}

/**
 * Get all queued offline actions
 */
export function getOfflineOutbox(): OfflineAction[] {
  return getStoredOutbox();
}

/**
 * Get count of pending actions
 */
export function getPendingOfflineCount(): number {
  return getStoredOutbox().filter((item) => item.status === 'pending' || item.status === 'failed').length;
}

/**
 * Remove an action from the outbox
 */
export function removeOfflineAction(id: string): void {
  const current = getStoredOutbox();
  const updated = current.filter((item) => item.id !== id);
  saveStoredOutbox(updated);
}

/**
 * Clear all completed items
 */
export function clearCompletedOfflineActions(): void {
  const current = getStoredOutbox();
  const updated = current.filter((item) => item.status !== 'completed');
  saveStoredOutbox(updated);
}

/**
 * Process and sync all pending actions to the server
 */
export async function syncAllOfflineActions(): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const actions = getStoredOutbox();
  const pending = actions.filter((item) => item.status === 'pending' || item.status === 'failed');

  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  // Process sequentially to preserve order of operations
  for (const item of pending) {
    // Mark as syncing
    const inFlight = getStoredOutbox().map((act) =>
      act.id === item.id ? { ...act, status: 'syncing' as const } : act
    );
    saveStoredOutbox(inFlight);

    try {
      const response = await fetch(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...(item.headers || {}),
        },
        body: JSON.stringify(item.payload),
      });

      if (response.ok) {
        syncedCount++;
        // Remove completed action or mark completed
        const refreshed = getStoredOutbox().filter((act) => act.id !== item.id);
        saveStoredOutbox(refreshed);
      } else {
        const errorText = await response.text().catch(() => 'Server error');
        failedCount++;
        const refreshed = getStoredOutbox().map((act) =>
          act.id === item.id
            ? {
                ...act,
                status: 'failed' as const,
                retryCount: act.retryCount + 1,
                error: `HTTP ${response.status}: ${errorText.slice(0, 100)}`,
              }
            : act
        );
        saveStoredOutbox(refreshed);
      }
    } catch (err: any) {
      failedCount++;
      const refreshed = getStoredOutbox().map((act) =>
        act.id === item.id
          ? {
              ...act,
              status: 'failed' as const,
              retryCount: act.retryCount + 1,
              error: err?.message || 'Network unreachable',
            }
          : act
      );
      saveStoredOutbox(refreshed);
    }
  }

  return { synced: syncedCount, failed: failedCount };
}

/**
 * Subscribe to outbox changes
 */
export function subscribeToOfflineOutbox(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(SYNC_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(SYNC_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
