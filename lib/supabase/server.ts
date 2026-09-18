import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv } from './env';

export function getSupabaseServerClient(): SupabaseClient {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

