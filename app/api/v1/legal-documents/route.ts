import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { requireAuth } from '@/lib/auth/request-auth';
import { isLegalDocumentSlug, type LegalDocument } from '@/lib/content/legal-documents';
import { getLegalDocuments } from '@/lib/content/legal-documents.server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type LegalDocumentBody = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  body?: unknown;
};

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  const tenantId = auth instanceof Response ? undefined : auth.tenantId;
  const documents = await getLegalDocuments(tenantId);
  return ok({ documents });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  if (auth.role !== 'admin') {
    return fail('AUTH_FORBIDDEN', 'Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as LegalDocumentBody | null;
  if (!body || !isLegalDocumentSlug(body.slug)) {
    return fail('VALIDATION_ERROR', 'A valid legal document slug is required', 400);
  }

  const title = normalizeText(body.title);
  const description = normalizeText(body.description);
  const content = normalizeText(body.body);

  if (!title || !description || !content) {
    return fail('VALIDATION_ERROR', 'Title, description, and content are required', 400);
  }

  const nowIso = new Date().toISOString();
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('legal_documents')
    .upsert(
      {
        tenant_id: auth.tenantId,
        slug: body.slug,
        title,
        description,
        body: content,
        updated_by: auth.userId,
        updated_at: nowIso,
      },
      { onConflict: 'tenant_id,slug' }
    )
    .select('slug,title,description,body,updated_at,updated_by')
    .single();

  if (error || !data) {
    return fail('INTERNAL_ERROR', error?.message ?? 'Unable to save legal document', 500);
  }

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'legal_documents.update',
    targetId: body.slug,
    context: { slug: body.slug },
  });

  const document: LegalDocument = {
    slug: body.slug,
    title: String(data.title),
    description: String(data.description),
    body: String(data.body),
    updatedAt: String(data.updated_at),
    updatedBy: data.updated_by as string | null,
    persisted: true,
  };

  return ok({ document });
}
