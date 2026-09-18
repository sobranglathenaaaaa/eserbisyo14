import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from './env';

let adminClient: SupabaseClient | null = null;
export const RESIDENT_ID_UPLOADS_BUCKET = 'resident-id-uploads';
export const DOCUMENT_REQUEST_ATTACHMENTS_BUCKET = 'document-request-attachments';

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  adminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
