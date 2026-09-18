import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient, DOCUMENT_REQUEST_ATTACHMENTS_BUCKET } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ requestId: string }> };

type RequestRow = {
  id: string;
  tenant_id: string;
  resident_id: string;
  status: string;
};

type AttachmentRow = {
  id: string;
  request_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_REQUEST = 10;
const MAX_FILES_PER_UPLOAD = 5;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

function canReadRequest(auth: { role: string; userId: string }, requestRow: RequestRow) {
  return auth.role === 'admin' || auth.role === 'staff' || requestRow.resident_id === auth.userId;
}

function canUploadToRequest(auth: { role: string; userId: string }, requestRow: RequestRow) {
  if (auth.role === 'resident') {
    return requestRow.resident_id === auth.userId && requestRow.status === 'pending';
  }
  if (auth.role === 'admin' || auth.role === 'staff') {
    return !['completed', 'cancelled'].includes(requestRow.status);
  }
  return false;
}

function inferExtension(file: File) {
  const byType: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (byType[file.type]) return byType[file.type];
  const lastDot = file.name.lastIndexOf('.');
  return lastDot > -1 && lastDot < file.name.length - 1 ? file.name.slice(lastDot + 1).toLowerCase() : '';
}

function sanitizeFileName(fileName: string) {
  const clean = fileName.replace(/[^\w.\- ()]/g, '_').trim();
  return clean || 'supporting-document';
}

function isAllowedAttachment(file: File) {
  if (ALLOWED_MIME_TYPES.has(file.type)) return true;
  return ALLOWED_EXTENSIONS.has(inferExtension(file));
}

function mapAttachment(row: AttachmentRow) {
  return {
    id: row.id,
    requestId: row.request_id,
    uploadedBy: row.uploaded_by ?? undefined,
    fileName: row.file_name,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes ?? undefined,
    downloadUrl: `/api/v1/document-requests/${row.request_id}/attachments/${row.id}`,
    createdAt: row.created_at,
  };
}

async function getRequestForAttachmentAction(requestId: string, tenantId: string) {
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('document_requests')
    .select('id,tenant_id,resident_id,status')
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .maybeSingle<RequestRow>();
  return data;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { requestId } = await context.params;
  const requestRow = await getRequestForAttachmentAction(requestId, auth.tenantId);
  if (!requestRow) return fail('RESOURCE_NOT_FOUND', 'Document request not found.', 404);
  if (!canReadRequest(auth, requestRow)) return fail('AUTH_FORBIDDEN', 'Forbidden', 403);

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('document_request_attachments')
    .select('id,request_id,uploaded_by,file_name,file_path,mime_type,file_size_bytes,created_at')
    .eq('tenant_id', auth.tenantId)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });
  if (error) return fail('INTERNAL_ERROR', error.message, 500);

  return ok({ attachments: ((data as AttachmentRow[] | null) ?? []).map(mapAttachment) });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { requestId } = await context.params;
  const requestRow = await getRequestForAttachmentAction(requestId, auth.tenantId);
  if (!requestRow) return fail('RESOURCE_NOT_FOUND', 'Document request not found.', 404);
  if (!canUploadToRequest(auth, requestRow)) {
    return fail('AUTH_FORBIDDEN', 'Attachments can only be added by the resident while pending or by staff/admin before completion.', 403);
  }

  if (auth.role !== 'resident') {
    try {
      assertCan(auth.role, 'process_document_requests');
    } catch {
      return fail('AUTH_FORBIDDEN', 'Forbidden', 403);
    }
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) return fail('VALIDATION_ERROR', 'Invalid multipart payload.', 400);

  const files = [...formData.getAll('files'), ...formData.getAll('file')].filter(
    (value): value is File => value instanceof File && value.size > 0,
  );
  if (!files.length) return fail('VALIDATION_ERROR', 'At least one attachment file is required.', 400);
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return fail('VALIDATION_ERROR', `Upload up to ${MAX_FILES_PER_UPLOAD} files at a time.`, 400);
  }

  for (const file of files) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return fail('VALIDATION_ERROR', 'Each attachment must be 5MB or smaller.', 400);
    }
    if (!isAllowedAttachment(file)) {
      return fail('VALIDATION_ERROR', 'Only PDF, JPG, PNG, and WEBP attachments are supported.', 400);
    }
  }

  const admin = getSupabaseAdminClient();
  const { count, error: countError } = await admin
    .from('document_request_attachments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)
    .eq('request_id', requestId);
  if (countError) return fail('INTERNAL_ERROR', countError.message, 500);
  if ((count ?? 0) + files.length > MAX_ATTACHMENTS_PER_REQUEST) {
    return fail('VALIDATION_ERROR', `A request can have up to ${MAX_ATTACHMENTS_PER_REQUEST} attachments.`, 400);
  }

  const uploadedPaths: string[] = [];
  const insertedIds: string[] = [];
  const insertedRows: AttachmentRow[] = [];

  try {
    for (const file of files) {
      const extension = inferExtension(file) || 'bin';
      const objectPath = `${auth.tenantId}/${requestId}/${crypto.randomUUID()}.${extension}`;
      const mimeType = file.type || (extension === 'pdf' ? 'application/pdf' : 'application/octet-stream');
      const { error: uploadError } = await admin.storage
        .from(DOCUMENT_REQUEST_ATTACHMENTS_BUCKET)
        .upload(objectPath, file, {
          cacheControl: '3600',
          contentType: mimeType,
          upsert: false,
        });
      if (uploadError) throw new Error(uploadError.message);
      uploadedPaths.push(objectPath);

      const { data: inserted, error: insertError } = await admin
        .from('document_request_attachments')
        .insert({
          tenant_id: auth.tenantId,
          request_id: requestId,
          uploaded_by: auth.userId,
          file_name: sanitizeFileName(file.name),
          file_path: objectPath,
          mime_type: mimeType,
          file_size_bytes: file.size,
        })
        .select('id,request_id,uploaded_by,file_name,file_path,mime_type,file_size_bytes,created_at')
        .single<AttachmentRow>();
      if (insertError || !inserted) throw new Error(insertError?.message ?? 'Unable to save attachment metadata.');

      insertedIds.push(inserted.id);
      insertedRows.push(inserted);
    }
  } catch (error) {
    if (uploadedPaths.length) {
      await admin.storage.from(DOCUMENT_REQUEST_ATTACHMENTS_BUCKET).remove(uploadedPaths);
    }
    if (insertedIds.length) {
      await admin.from('document_request_attachments').delete().in('id', insertedIds);
    }
    return fail('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unable to upload attachments.', 500);
  }

  return ok({ attachments: insertedRows.map(mapAttachment) }, { status: 201 });
}
