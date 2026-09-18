import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient, RESIDENT_ID_UPLOADS_BUCKET } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';
import { sendRegistrationDecisionMessage, type RegistrationFinalStatus } from '@/lib/auth/registration-approval';

type RouteContext = { params: Promise<{ userId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  const isAdmin = auth.role === 'admin';
  const isStaff = auth.role === 'staff';
  if (!isAdmin && !isStaff) {
    return fail('AUTH_FORBIDDEN', 'Access denied', 403);
  }

  const { userId } = await context.params;
  const body = (await request.json().catch(() => null)) as
    | {
      fullName?: string;
      role?: 'admin' | 'staff' | 'resident';
      isVerified?: boolean;
      isDeleted?: boolean;
      approvalStatus?:
        | 'pending_staff_review'
        | 'staff_forwarded_to_admin'
        | 'staff_rejected'
        | 'admin_approved'
        | 'admin_rejected';
      approvalReviewNote?: string;
    }
    | null;
  if (!body) return fail('VALIDATION_ERROR', 'Invalid request body', 400);

  const includesAdminManagedFields =
    typeof body.fullName === 'string' ||
    typeof body.isVerified === 'boolean' ||
    typeof body.isDeleted === 'boolean' ||
    Boolean(body.role);

  if (includesAdminManagedFields && !isAdmin) {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = { updated_at: nowIso };
  if (typeof body.fullName === 'string') updates.full_name = body.fullName.trim();
  if (typeof body.isVerified === 'boolean') updates.is_verified = body.isVerified;
  if (typeof body.isDeleted === 'boolean') updates.is_deleted = body.isDeleted;

  const admin = getSupabaseAdminClient();
  const { data: targetProfile, error: targetProfileError } = await admin
    .from('profiles')
    .select('id,tenant_id,role,approval_status,full_name,email')
    .eq('id', userId)
    .maybeSingle();

  if (targetProfileError || !targetProfile || targetProfile.tenant_id !== auth.tenantId) {
    return fail('RESOURCE_NOT_FOUND', 'User not found', 404);
  }

  if (body.role) {
    // Do not allow role changes for registrations that have been rejected
    if (targetProfile.approval_status === 'staff_rejected' || targetProfile.approval_status === 'admin_rejected') {
      return fail('VALIDATION_ERROR', 'Cannot change role of a rejected registration', 400);
    }

    if (targetProfile.role === 'admin' && targetProfile.id !== auth.userId) {
      return fail('AUTH_FORBIDDEN', "You cannot change another admin's role", 403);
    }

    updates.role = body.role;
  }

  if (typeof body.isDeleted === 'boolean' && body.isDeleted) {
    if (userId === auth.userId) {
      return fail('VALIDATION_ERROR', 'You cannot archive your own account', 400);
    }

    if (targetProfile.role === 'admin') {
      const { count, error: adminCountError } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', auth.tenantId)
        .eq('role', 'admin')
        .eq('is_deleted', false);

      if (adminCountError) {
        return fail('INTERNAL_ERROR', adminCountError.message, 500);
      }

      if ((count ?? 0) <= 1) {
        return fail('VALIDATION_ERROR', 'Cannot archive the last admin account', 400);
      }
    }
  }

  const nextApprovalStatus = body.approvalStatus ?? null;
  if (nextApprovalStatus) {
    if (targetProfile.role !== 'resident') {
      return fail('VALIDATION_ERROR', 'Only resident registrations can be approved or rejected', 400);
    }

    const currentStatus = targetProfile.approval_status as
      | 'pending_staff_review'
      | 'staff_forwarded_to_admin'
      | 'staff_rejected'
      | 'admin_approved'
      | 'admin_rejected';

    if (isStaff) {
      const staffAllowed =
        currentStatus === 'pending_staff_review' &&
        (nextApprovalStatus === 'staff_forwarded_to_admin' || nextApprovalStatus === 'staff_rejected');
      if (!staffAllowed) {
        return fail('VALIDATION_ERROR', 'Staff can only review pending registrations', 400);
      }
      updates.staff_reviewed_by = auth.userId;
      updates.staff_reviewed_at = nowIso;
      updates.staff_review_note = body.approvalReviewNote?.trim() || null;
    }

    if (isAdmin) {
      const adminAllowed =
        currentStatus === 'staff_forwarded_to_admin' &&
        (nextApprovalStatus === 'admin_approved' || nextApprovalStatus === 'admin_rejected');
      if (!adminAllowed) {
        return fail('VALIDATION_ERROR', 'Admin can only finalize registrations forwarded by staff', 400);
      }
      updates.approval_reviewed_by = auth.userId;
      updates.approval_reviewed_at = nowIso;
      updates.approval_review_note = body.approvalReviewNote?.trim() || null;
    }

    updates.approval_status = nextApprovalStatus;
  }

  const { data, error } = await admin.from('profiles').update(updates).eq('id', userId).eq('tenant_id', auth.tenantId).select('*').single();
  if (error || !data) {
    return fail('RESOURCE_NOT_FOUND', error?.message ?? 'User not found', 404);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'users.update',
    targetId: userId,
    context: updates,
  });
  // Send notification when staff rejects a registration so the resident gets an email.
  if (
    isStaff &&
    nextApprovalStatus &&
    nextApprovalStatus === 'staff_rejected' &&
    targetProfile.role === 'resident' &&
    targetProfile.approval_status !== nextApprovalStatus
  ) {
    try {
      const mail = await sendRegistrationDecisionMessage({
        toEmail: targetProfile.email,
        fullName: targetProfile.full_name,
        // indicate staff triggered this rejection so the email copy can reflect that
        status: 'admin_rejected',
        reviewNote: body.approvalReviewNote,
        actor: 'staff',
      });

      await admin.from('email_logs').insert({
        tenant_id: auth.tenantId,
        to_user_id: userId,
        to_email: targetProfile.email,
        subject: mail.subject,
        body: mail.body,
      });
    } catch (emailError) {
      console.error('[users.update] Failed to send staff rejection email:', emailError);
    }
  }

  if (
    isAdmin &&
    nextApprovalStatus &&
    (nextApprovalStatus === 'admin_approved' || nextApprovalStatus === 'admin_rejected') &&
    targetProfile.role === 'resident' &&
    targetProfile.approval_status !== nextApprovalStatus
  ) {
    try {
      const mail = await sendRegistrationDecisionMessage({
        toEmail: targetProfile.email,
        fullName: targetProfile.full_name,
        status: nextApprovalStatus as RegistrationFinalStatus,
        reviewNote: body.approvalReviewNote,
        actor: 'admin',
      });

      await admin.from('email_logs').insert({
        tenant_id: auth.tenantId,
        to_user_id: userId,
        to_email: targetProfile.email,
        subject: mail.subject,
        body: mail.body,
      });
    } catch (emailError) {
      console.error('[users.update] Failed to send approval decision email:', emailError);
    }
  }

  return ok(data);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const { userId } = await context.params;
  if (userId === auth.userId) {
    return fail('VALIDATION_ERROR', 'You cannot permanently delete your own account', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: targetProfile, error: targetProfileError } = await admin
    .from('profiles')
    .select('id,tenant_id,role,id_file_path,id_file_name,id_file_path_back,id_file_name_back')
    .eq('id', userId)
    .maybeSingle();

  if (targetProfileError || !targetProfile || targetProfile.tenant_id !== auth.tenantId) {
    return fail('RESOURCE_NOT_FOUND', 'User not found', 404);
  }

  if (targetProfile.role === 'admin') {
    const { count, error: adminCountError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId)
      .eq('role', 'admin')
      .eq('is_deleted', false);

    if (adminCountError) {
      return fail('INTERNAL_ERROR', adminCountError.message, 500);
    }

    if ((count ?? 0) <= 1) {
      return fail('VALIDATION_ERROR', 'Cannot permanently delete the last admin account', 400);
    }
  }

  const idFrontPath = targetProfile.id_file_path?.trim() || targetProfile.id_file_name?.trim() || null;
  const idBackPath = targetProfile.id_file_path_back?.trim() || targetProfile.id_file_name_back?.trim() || null;
  const idPaths = [idFrontPath, idBackPath].filter((path): path is string => Boolean(path));

  const { data: ownedDocumentRequests, error: ownedDocumentRequestsError } = await admin
    .from('document_requests')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('resident_id', userId);

  if (ownedDocumentRequestsError) {
    return fail('INTERNAL_ERROR', ownedDocumentRequestsError.message, 500);
  }

  const ownedDocumentRequestIds = ((ownedDocumentRequests ?? []) as Array<{ id: string }>).map((request) => request.id);

  if (ownedDocumentRequestIds.length > 0) {
    const { error: generatedDocumentsDetachError } = await admin
      .from('generated_documents')
      .update({ request_id: null })
      .eq('tenant_id', auth.tenantId)
      .in('request_id', ownedDocumentRequestIds);

    if (generatedDocumentsDetachError) {
      return fail('INTERNAL_ERROR', generatedDocumentsDetachError.message, 500);
    }

    const { error: feedbackDeleteError } = await admin
      .from('feedback')
      .delete()
      .eq('tenant_id', auth.tenantId)
      .in('request_id', ownedDocumentRequestIds);

    if (feedbackDeleteError) {
      return fail('INTERNAL_ERROR', feedbackDeleteError.message, 500);
    }
  }

  const nullProcessedByTables = ['document_requests', 'generated_documents'] as const;
  for (const table of nullProcessedByTables) {
    const { error } = await admin.from(table).update({ processed_by: null }).eq('tenant_id', auth.tenantId).eq('processed_by', userId);
    if (error) {
      return fail('INTERNAL_ERROR', error.message, 500);
    }
  }

  const nullUpdatedByTables = ['document_templates'] as const;
  for (const table of nullUpdatedByTables) {
    const { error } = await admin.from(table).update({ updated_by: null }).eq('tenant_id', auth.tenantId).eq('updated_by', userId);
    if (error) {
      return fail('INTERNAL_ERROR', error.message, 500);
    }
  }

  const nullCreatedByTables = ['announcements'] as const;
  for (const table of nullCreatedByTables) {
    const { error } = await admin.from(table).update({ created_by: null }).eq('tenant_id', auth.tenantId).eq('created_by', userId);
    if (error) {
      return fail('INTERNAL_ERROR', error.message, 500);
    }
  }

  const { error: auditDetachError } = await admin.from('audit_logs').update({ actor_id: null }).eq('tenant_id', auth.tenantId).eq('actor_id', userId);
  if (auditDetachError) {
    return fail('INTERNAL_ERROR', auditDetachError.message, 500);
  }

  const { error: profileDeleteError } = await admin
    .from('profiles')
    .delete()
    .eq('id', userId)
    .eq('tenant_id', auth.tenantId);

  if (profileDeleteError) {
    return fail('INTERNAL_ERROR', profileDeleteError.message, 500);
  }

  // Explicitly request hard-delete in Auth so the email can be registered again.
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId, false);
  if (authDeleteError) {
    const normalized = authDeleteError.message.toLowerCase();
    const alreadyMissing = normalized.includes('not found') || normalized.includes('does not exist');
    if (!alreadyMissing) {
      return fail('INTERNAL_ERROR', authDeleteError.message, 500);
    }
  }

  if (idPaths.length > 0) {
    const { error: storageDeleteError } = await admin.storage.from(RESIDENT_ID_UPLOADS_BUCKET).remove(idPaths);
    if (storageDeleteError) {
      console.error('[users.delete] Failed to remove resident ID uploads:', storageDeleteError);
    }
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'users.delete',
    targetId: userId,
    context: { permanent: true },
  });

  return ok({ deleted: true, userId });
}
