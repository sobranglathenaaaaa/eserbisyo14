import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import { sendIncidentStatusEmail } from '@/lib/incidents/incident-status-emails';

type RouteContext = { params: Promise<{ incidentId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { incidentId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | { status: 'pending' | 'approved' | 'under_review' | 'proceed_to_barangay' | 'resolved' | 'declined'; note?: string }
    | null;
  if (!body?.status) return fail('VALIDATION_ERROR', 'status is required', 400);
  if (auth.role !== 'staff' && auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }
  if ((body.status === 'approved' || body.status === 'under_review' || body.status === 'proceed_to_barangay') && auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Admin access required to approve incidents', 403);
  }
  if (body.status === 'resolved' && auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Admin access required to mark incidents as resolved', 403);
  }
  if (body.status === 'declined' && auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Admin access required to decline incidents', 403);
  }

  const admin = getSupabaseAdminClient();
  
  // Get current report data first to determine if this is a status change
  const { data: existing, error: fetchError } = await admin
    .from('incident_reports')
    .select('*')
    .eq('id', incidentId)
    .eq('tenant_id', auth.tenantId)
    .single();
  if (fetchError || !existing) return fail('RESOURCE_NOT_FOUND', fetchError?.message ?? 'Incident not found', 404);

  const { data, error } = await admin
    .from('incident_reports')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', incidentId)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single();
  if (error || !data) return fail('RESOURCE_NOT_FOUND', error?.message ?? 'Incident not found', 404);

  const previousStatus = existing.status;

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'incidents.status_update',
    targetId: incidentId,
    context: { from: previousStatus, to: body.status, note: body.note ?? '' },
  });

  const priority = body.status === 'resolved' ? 'info' : body.status === 'under_review' ? 'warning' : body.status === 'declined' ? 'warning' : 'info';
  const statusLabel = body.status === 'approved'
    ? 'Approved'
    : body.status === 'under_review'
      ? 'Under Review'
      : body.status === 'proceed_to_barangay'
        ? 'Proceed to Barangay'
        : body.status === 'resolved'
          ? 'Resolved'
          : body.status === 'declined'
            ? 'Declined'
            : 'Pending';
  void notifyResident({
    tenantId: auth.tenantId,
    userId: data.resident_id,
    title: `Incident report ${statusLabel}`,
    message: body.note?.trim() ? body.note.trim() : 'Your report status has been updated.',
    type: 'report',
    priority,
    eventKey: 'incident.status_changed',
    entityType: 'incident_report',
    entityId: incidentId,
    actionHref: '/resident/blotter-reporting',
  });

  // Send email for status transitions that warrant notification
  if (body.status === 'under_review' || body.status === 'declined') {
    const caseNumber = `${data.id.substring(0, 8).toUpperCase()}-${new Date(data.created_at).getFullYear()}`;
    void sendIncidentStatusEmail({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      incidentId,
      residentId: data.resident_id,
      caseNumber,
      title: data.title,
      previousStatus,
      nextStatus: body.status === 'declined' ? 'declined' : 'under_review',
      note: body.note?.trim() || null,
    });
  }

  return ok(data);
}
