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
    | {
        status?: string;
        actionLog?: any;
        proceeding?: any;
        cfa?: any;
        pnpReferral?: any;
        note?: string;
      }
    | null;
  if (!body) return fail('VALIDATION_ERROR', 'Body is required', 400);
  if (auth.role !== 'staff' && auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
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

  const rawRequestedStatus = body.status;
  let normalizedStatus = existing.status;
  if (rawRequestedStatus) {
    if (['resolved', 'closed', 'cfa_issued', 'referred_to_pnp'].includes(rawRequestedStatus)) {
      normalizedStatus = 'resolved';
    } else if (rawRequestedStatus === 'declined') {
      normalizedStatus = 'declined';
    } else if (rawRequestedStatus === 'pending' || rawRequestedStatus === 'submitted') {
      normalizedStatus = 'pending';
    } else {
      normalizedStatus = 'under_review';
    }
  }

  // If a proceeding is being scheduled, ensure status is under_review
  if (body.proceeding && normalizedStatus === 'pending') {
    normalizedStatus = 'under_review';
  }

  const updatePayload: Record<string, any> = {
    status: normalizedStatus,
    updated_at: new Date().toISOString(),
  };

  if (body.actionLog) updatePayload.action_log = body.actionLog;
  if (body.cfa) updatePayload.cfa = body.cfa;
  if (body.pnpReferral) updatePayload.pnp_referral = body.pnpReferral;

  let createdProceeding: any = null;
  if (body.proceeding) {
    const existingProceedings = Array.isArray(existing.proceedings) ? existing.proceedings : [];
    createdProceeding = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...body.proceeding,
      createdAt: new Date().toISOString(),
    };
    updatePayload.proceedings = [...existingProceedings, createdProceeding];
  }

  const { data, error } = await admin
    .from('incident_reports')
    .update(updatePayload)
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
    context: { from: previousStatus, to: normalizedStatus, requestedStatus: rawRequestedStatus, note: body.note ?? '' },
  });

  const priority = normalizedStatus === 'resolved' ? 'info' : normalizedStatus === 'under_review' ? 'warning' : normalizedStatus === 'declined' ? 'warning' : 'info';
  const statusLabel = normalizedStatus === 'approved'
    ? 'Approved'
    : normalizedStatus === 'under_review'
      ? 'Under Review'
      : normalizedStatus === 'proceed_to_barangay'
        ? 'Proceed to Barangay'
        : normalizedStatus === 'resolved'
          ? 'Resolved'
          : normalizedStatus === 'declined'
            ? 'Declined'
            : 'Pending';

  void notifyResident({
    tenantId: auth.tenantId,
    userId: data.resident_id,
    title: createdProceeding ? 'Barangay Hearing Scheduled' : `Incident report ${statusLabel}`,
    message: createdProceeding
      ? `A hearing has been scheduled on ${new Date(createdProceeding.scheduledAt).toLocaleDateString()} at ${createdProceeding.venue || 'Barangay Hall'}.`
      : body.note?.trim() ? body.note.trim() : 'Your report status has been updated.',
    type: 'report',
    priority: createdProceeding ? 'urgent' : priority,
    eventKey: 'incident.status_changed',
    entityType: 'incident_report',
    entityId: incidentId,
    actionHref: '/resident/blotter-reporting',
  });

  const caseNumber = `${data.id.substring(0, 8).toUpperCase()}-${new Date(data.created_at).getFullYear()}`;

  // Send email for hearing schedule
  if (createdProceeding) {
    void sendIncidentStatusEmail({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      incidentId,
      residentId: data.resident_id,
      caseNumber,
      title: data.title,
      previousStatus,
      nextStatus: 'hearing_scheduled',
      note: body.note?.trim() || null,
      hearingDetails: {
        stage: createdProceeding.stage,
        scheduledAt: createdProceeding.scheduledAt,
        venue: createdProceeding.venue,
        presidingOfficer: createdProceeding.presidingOfficer,
        notes: createdProceeding.minutes,
      },
    });
  } else if (normalizedStatus === 'under_review' || normalizedStatus === 'declined' || normalizedStatus === 'resolved') {
    // Send email for other major status transitions
    void sendIncidentStatusEmail({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      incidentId,
      residentId: data.resident_id,
      caseNumber,
      title: data.title,
      previousStatus,
      nextStatus: normalizedStatus as any,
      note: body.note?.trim() || null,
    });
  }

  return ok(data);
}
