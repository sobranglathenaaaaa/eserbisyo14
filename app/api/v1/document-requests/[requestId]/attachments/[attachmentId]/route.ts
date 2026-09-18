import { NextRequest, NextResponse } from 'next/server';
import { fail } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient, DOCUMENT_REQUEST_ATTACHMENTS_BUCKET } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ requestId: string; attachmentId: string }> };

type AttachmentRow = {
  id: string;
  request_id: string;
  file_path: string;
  file_name: string;
};

type RequestRow = {
  id: string;
  resident_id: string;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { requestId, attachmentId } = await context.params;
  const admin = getSupabaseAdminClient();
  const { data: attachment } = await admin
    .from('document_request_attachments')
    .select('id,request_id,file_path,file_name')
    .eq('id', attachmentId)
    .eq('request_id', requestId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle<AttachmentRow>();
  if (!attachment) return fail('RESOURCE_NOT_FOUND', 'Attachment not found.', 404);

  const { data: requestRow } = await admin
    .from('document_requests')
    .select('id,resident_id')
    .eq('id', requestId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle<RequestRow>();
  if (!requestRow) return fail('RESOURCE_NOT_FOUND', 'Document request not found.', 404);

  const canRead = auth.role === 'admin' || auth.role === 'staff' || requestRow.resident_id === auth.userId;
  if (!canRead) return fail('AUTH_FORBIDDEN', 'Forbidden', 403);

  const { data: signed, error } = await admin.storage
    .from(DOCUMENT_REQUEST_ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.file_path, 60, {
      download: attachment.file_name,
    });
  if (error || !signed?.signedUrl) {
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to open attachment.', 500);
  }

  return NextResponse.redirect(signed.signedUrl);
}
