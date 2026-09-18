import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';

let browserClient: SupabaseClient | null = null;

function isInvalidRefreshTokenError(error: unknown): boolean {
  // Accept Error instances as well as plain objects that may come from
  // serialized/transported auth errors (e.g. AuthApiError-like objects).
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('invalid refresh token') || message.includes('refresh token not found');
  }

  if (typeof error === 'object' && error !== null) {
    const maybe = error as Record<string, unknown>;
    // Some errors expose a `code` property (e.g. `refresh_token_not_found`).
    const code = typeof maybe.code === 'string' ? maybe.code.toLowerCase() : '';
    if (code === 'refresh_token_not_found' || code === 'invalid_refresh_token') return true;

    // Fallback to message-like property when available.
    const msg = typeof maybe.message === 'string' ? maybe.message.toLowerCase() : '';
    return msg.includes('invalid refresh token') || msg.includes('refresh token not found');
  }

  return false;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseBrowserClient must be called from a browser context.');
  }

  if (browserClient) {
    return browserClient;
  }

  const { url, publishableKey } = getSupabasePublicEnv();
  browserClient = createClient(url, publishableKey);
  return browserClient;
}

export async function clearSupabaseBrowserSession(client: SupabaseClient = getSupabaseBrowserClient()) {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // Best-effort cleanup only.
  }
}

export async function getSupabaseSessionSafely(client: SupabaseClient = getSupabaseBrowserClient()) {
  try {
    return await client.auth.getSession();
  } catch (error) {
    if (!isInvalidRefreshTokenError(error)) throw error;
    await clearSupabaseBrowserSession(client);
    return { data: { session: null }, error: null };
  }
}
