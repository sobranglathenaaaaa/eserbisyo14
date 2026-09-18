import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { parseCertificateFieldsFromQrPayload } from '@/lib/documents/indigency-certificate';
import {
  renderOcrTemplateFromDocx,
  resolvePrintableTemplateKey,
} from '@/lib/documents/ocr-template-renderers';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type RouteContext = { params: Promise<{ documentId: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const { documentId } = await context.params;
  const admin = getSupabaseAdminClient();

  const { data: generated } = await admin
    .from('generated_documents')
    .select('id,request_id,document_type,resident_name,date_issued,qr_payload')
    .eq('id', documentId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!generated) return fail('RESOURCE_NOT_FOUND', 'Generated document not found.', 404);

  if (auth.role === 'resident') {
    if (!generated.request_id) {
      return fail('AUTH_FORBIDDEN', 'Residents can only open linked generated documents.', 403);
    }
    const { data: requestRow } = await admin
      .from('document_requests')
      .select('id,resident_id')
      .eq('id', generated.request_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!requestRow || requestRow.resident_id !== auth.userId) {
      return fail('AUTH_FORBIDDEN', 'You do not have access to this generated document.', 403);
    }
  }

  const parsedFields = parseCertificateFieldsFromQrPayload(generated.qr_payload ?? '');
  const metadataTemplateKeyRaw = (() => {
    try {
      const payload = JSON.parse(generated.qr_payload ?? '') as { metadata?: { templateKey?: unknown } };
      return typeof payload?.metadata?.templateKey === 'string' ? payload.metadata.templateKey : null;
    } catch {
      return null;
    }
  })();
  const templateKey = resolvePrintableTemplateKey(metadataTemplateKeyRaw, generated.document_type);
  if (!templateKey) {
    return fail('VALIDATION_ERROR', 'Printable rendering is not configured for this document type.', 400);
  }
  let rendered: Awaited<ReturnType<typeof renderOcrTemplateFromDocx>>;
  try {
    rendered = await renderOcrTemplateFromDocx(
      templateKey,
      {
        residentName: generated.resident_name ?? 'Resident',
        dateIssued: generated.date_issued ?? new Date().toISOString().slice(0, 10),
      },
      parsedFields,
    );
  } catch (error) {
    return fail(
      'INTERNAL_ERROR',
      error instanceof Error
        ? `Unable to render the official DOCX document template: ${error.message}`
        : 'Unable to render the official DOCX document template.',
      500,
    );
  }

  return ok({ html: rendered.printableHtml });
}
