import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ incidentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const { incidentId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('incident_reports')
    .select('*')
    .eq('id', incidentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (error || !data) return fail('RESOURCE_NOT_FOUND', 'Incident not found', 404);
  if (auth.role === 'resident' && data.resident_id !== auth.userId) {
    return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
  }
  return ok(data);
}

