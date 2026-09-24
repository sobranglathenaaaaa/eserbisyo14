import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan, can } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { notifyResident } from '@/lib/api/notifications';
import type { NotificationEventKey } from '@/lib/api/notifications';
import {
  sendDocumentRequestStatusEmail,
  type DocumentRequestStatusEmail,
} from '@/lib/documents/document-request-emails';

type RouteContext = { params: Promise<{ requestId: string }> };
type AllowedStatus = 'pending' | 'staff_reviewed' | 'approved' | 'declined' | 'ready_for_pickup' | 'completed' | 'cancelled';

const allowedTransitions: Record<AllowedStatus, AllowedStatus[]> = {
  pending: ['approved', 'declined', 'cancelled'],
  staff_reviewed: ['approved', 'declined', 'cancelled'],
  approved: ['ready_for_pickup', 'declined'],
  ready_for_pickup: ['completed'],
  declined: [],
  completed: [],
  cancelled: [],
};

function shouldEmailStatus(status: AllowedStatus): status is DocumentRequestStatusEmail {
  return (
    status === 'staff_reviewed'
    || status === 'approved'
    || status === 'declined'
    || status === 'ready_for_pickup'
    || status === 'completed'
    || status === 'cancelled'
  );
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as { status: AllowedStatus; reason?: string; staffReviewNote?: string } | null;
  if (!body?.status) return fail('VALIDATION_ERROR', 'status is required', 400);
  const { requestId } = await context.params;

  const admin = getSupabaseAdminClient();
  const { data: existing } = await admin.from('document_requests').select('*').eq('id', requestId).eq('tenant_id', auth.tenantId).maybeSingle();
  if (!existing) return fail('RESOURCE_NOT_FOUND', 'Document request not found', 404);

  if (auth.role === 'resident') {
    if (existing.resident_id !== auth.userId || body.status !== 'cancelled' || existing.status !== 'pending') {
      return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
    }
  } else if (body.status === 'approved') {
    if (auth.role !== 'admin' || !can(auth.role, 'review_document_requests')) {
      return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
    }
  } else if (body.status === 'declined') {
    if (existing.status === 'pending' || existing.status === 'staff_reviewed') {
      if (auth.role !== 'admin' || !can(auth.role, 'review_document_requests')) {
        return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
      }
    } else if (!can(auth.role, 'process_document_requests')) {
      return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
    }
  } else if (body.status === 'staff_reviewed') {
    return fail('VALIDATION_ERROR', 'Staff review forwarding is no longer supported.', 400);
  } else {
    try {
      assertCan(auth.role, 'process_document_requests');
    } catch {
      return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
    }
  }

  const current = existing.status as AllowedStatus;
  if (!allowedTransitions[current].includes(body.status)) {
    return fail('RESOURCE_CONFLICT', `Invalid transition from ${current} to ${body.status}`, 409);
  }

  if (body.status === 'declined' && !body.reason?.trim()) {
    return fail('VALIDATION_ERROR', 'Decline reason is required.', 400);
  }

  const updates: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
  if (body.status === 'declined') {
    if (auth.role === 'admin') updates.admin_decision_reason = body.reason ?? null;
    else if (auth.role === 'staff') updates.processing_decline_reason = body.reason ?? null;
  }
  const { data, error } = await admin.from('document_requests').update(updates).eq('id', requestId).select('*').single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update status', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'document_requests.status_update',
    targetId: requestId,
    context: { from: current, to: body.status },
  });

  const statusLabel: Record<AllowedStatus, string> = {
    pending: 'Pending',
    staff_reviewed: 'Staff Reviewed',
    approved: 'Approved',
    declined: 'Declined',
    ready_for_pickup: 'Ready for Pickup',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  const eventKeyByStatus: Partial<Record<AllowedStatus, NotificationEventKey>> = {
    staff_reviewed: 'document.staff_reviewed',
    approved: 'document.approved',
    ready_for_pickup: 'document.ready_for_pickup',
    declined: 'document.declined',
    cancelled: 'document.cancelled',
  };

  const residentActionHref = '/resident/document-requests';
  const priority = body.status === 'declined' || body.status === 'cancelled' ? 'warning' : 'info';
  const eventKey = eventKeyByStatus[body.status] ?? 'document.status_changed';

  void notifyResident({
    tenantId: auth.tenantId,
    userId: existing.resident_id,
    title: `Request ${existing.reference_number} updated`,
    message: `Status changed from ${statusLabel[current]} to ${statusLabel[body.status]}.`,
    type: 'request',
    priority,
    eventKey,
    entityType: 'document_request',
    entityId: requestId,
    actionHref: residentActionHref,
  });

  if (shouldEmailStatus(body.status)) {
    await sendDocumentRequestStatusEmail({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      requestId,
      residentId: existing.resident_id,
      referenceNumber: existing.reference_number,
      previousStatus: current,
      nextStatus: body.status,
      note: body.reason ?? body.staffReviewNote ?? null,
    });
  }

  return ok(data);
}
