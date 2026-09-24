import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { writeAuditLog } from '@/lib/api/audit';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import {
  DocumentReleaseError,
  releaseGeneratedDocumentForRequest,
} from '@/lib/documents/document-release';

type RouteContext = { params: Promise<{ requestId: string }> };

type CompletionPayload = {
  releaseNotes?: string;
  verificationMetadata?: unknown;
  ocrJobId?: string;
  documentLabel?: string;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'process_document_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Staff/Admin access required', 403);
  }

  const body = (await request.json().catch(() => null)) as CompletionPayload | null;
  const { requestId } = await context.params;

  try {
    const release = await releaseGeneratedDocumentForRequest({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      requestId,
      releaseNotes: body?.releaseNotes,
      verificationMetadata: body?.verificationMetadata,
      ocrJobId: body?.ocrJobId,
      documentLabel: body?.documentLabel,
    });

    await writeAuditLog({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      actorRole: auth.role,
      action: 'document_requests.complete',
      targetId: requestId,
      context: {
        releaseNotes: body?.releaseNotes ?? '',
        ocrJobId: body?.ocrJobId ?? null,
        documentType: release.documentLabel,
        generatedDocumentId: release.generatedDocumentId,
        emailSent: release.email.sent,
        reusedExistingDocument: release.reusedExistingDocument,
      },
    });

    return ok({
      readyForPickup: true,
      request: release.request,
      generatedDocumentId: release.generatedDocumentId,
      documentLabel: release.documentLabel,
      issuedDate: release.issuedDate,
      portalHref: release.portalHref,
      email: release.email,
    });
  } catch (error) {
    if (error instanceof DocumentReleaseError) {
      return fail(error.code, error.message, error.status, error.details);
    }
    return fail(
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unable to complete request',
      500,
    );
  }
}
