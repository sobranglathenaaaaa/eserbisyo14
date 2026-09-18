import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { AuthContext } from '@/lib/auth/request-auth';

type CountTable = 'document_requests' | 'incident_reports';

async function countRows(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  auth: AuthContext,
  table: CountTable,
  filters: Record<string, string> = {}
) {
  let query = admin.from(table).select('id', { count: 'exact', head: true }).eq('tenant_id', auth.tenantId);

  if (auth.role === 'resident') {
    query = query.eq('resident_id', auth.userId);
  }

  for (const [column, value] of Object.entries(filters)) {
    query = query.eq(column, value);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'read_dashboard');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
  }

  const admin = getSupabaseAdminClient();

  try {
    let feedbackQuery = admin.from('feedback').select('rating').eq('tenant_id', auth.tenantId);
    if (auth.role === 'resident') {
      feedbackQuery = feedbackQuery.eq('resident_id', auth.userId);
    }

    const [
      totalRequests,
      pendingRequests,
      approvedRequests,
      completedRequests,
      pendingReports,
      underReviewReports,
      resolvedReports,
      feedback,
    ] = await Promise.all([
      countRows(admin, auth, 'document_requests'),
      countRows(admin, auth, 'document_requests', { status: 'pending' }),
      countRows(admin, auth, 'document_requests', { status: 'approved' }),
      countRows(admin, auth, 'document_requests', { status: 'completed' }),
      countRows(admin, auth, 'incident_reports', { status: 'pending' }),
      countRows(admin, auth, 'incident_reports', { status: 'under_review' }),
      countRows(admin, auth, 'incident_reports', { status: 'resolved' }),
      feedbackQuery,
    ]);

    if (feedback.error) return fail('INTERNAL_ERROR', feedback.error.message, 500);

    const feedbackRows = feedback.data ?? [];
    const averageRating = feedbackRows.length
      ? Number((feedbackRows.reduce((sum, item) => sum + Number(item.rating ?? 0), 0) / feedbackRows.length).toFixed(2))
      : 0;

    return ok({
      totalRequests,
      pendingRequests,
      approvedRequests,
      completedRequests,
      reportSummary: {
        pending: pendingReports,
        underReview: underReviewReports,
        resolved: resolvedReports,
      },
      averageRating,
    });
  } catch (error) {
    return fail('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unable to load dashboard summary', 500);
  }
}
