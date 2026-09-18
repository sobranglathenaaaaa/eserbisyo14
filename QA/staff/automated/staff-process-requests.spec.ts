import { test, expect } from '@playwright/test';
import { attachRoleCookiesToPage, createAuthedApiContext } from '../../_shared/automated/auth';
import { createQaRunTag } from '../../_shared/automated/env';
import { createDocumentRequest, getAutoReleaseDocumentType } from '../../_shared/automated/document-request';
import { expectOkJson } from '../../_shared/automated/contracts';

test.describe('Staff: Process Requests', () => {
  test('STF-REQ-003 should move approved request to processing then completed', async ({ request, page }) => {
    const runTag = createQaRunTag();

    const residentCtx = await createAuthedApiContext(request, 'resident');
    const documentType = await getAutoReleaseDocumentType((url) => residentCtx.api.get(url));
    const created = await createDocumentRequest(
      (url, data) => residentCtx.api.post(url, { data }),
      documentType.id,
      `Staff processing flow ${runTag}`,
      documentType.type
    );
    const pendingOnly = await createDocumentRequest(
      (url, data) => residentCtx.api.post(url, { data }),
      documentType.id,
      `Pending request hidden from staff ${runTag}`,
      documentType.type
    );

    const adminCtx = await createAuthedApiContext(request, 'admin');
    await adminCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'approved' },
    });

    await attachRoleCookiesToPage(request, page, 'staff');
    await page.goto('/staff/process-requests');
    await expect(page.locator('a[href="/admin/document-requests"]')).toHaveCount(0);
    await expect(page.locator('a[href="/admin/reservations"]')).toHaveCount(0);

    await page.getByPlaceholder('Reference, name, type').fill(created.reference_number);
    await expect(page.getByText(created.reference_number)).toBeVisible();

    await page.getByPlaceholder('Reference, name, type').fill(pendingOnly.reference_number);
    await expect(page.getByText(pendingOnly.reference_number)).toHaveCount(0);

    const staffCtx = await createAuthedApiContext(request, 'staff');
    const processingResponse = await staffCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'processing' },
    });
    const processingPayload = await expectOkJson<{ status: string }>(processingResponse);
    expect(processingPayload.data.status).toBe('processing');

    const completeResponse = await staffCtx.api.post(`/api/v1/document-requests/${created.id}/complete`, {
      data: {
        verificationMetadata: {
          parsedFields: {
            residentName: 'QA Resident',
            residentAddressLine: '15 M. Cruz Street, Barangay Progreso, San Juan City',
            address: '15 M. Cruz Street, Barangay Progreso, San Juan City',
            requestedBy: 'QA Resident',
            reasonResidency: 'Yes',
            issuedDate: new Date().toISOString().slice(0, 10),
          },
        },
      },
    });
    const completePayload = await expectOkJson<{
      request: { status: string };
      generatedDocumentId: string;
      portalHref: string;
      email: { sent: boolean; error?: string };
    }>(completeResponse);
    expect(completePayload.data.request.status).toBe('completed');
    expect(completePayload.data.generatedDocumentId).toBeTruthy();
    expect(completePayload.data.portalHref).toContain(completePayload.data.generatedDocumentId);
    expect(typeof completePayload.data.email.sent).toBe('boolean');

    const printableResponse = await residentCtx.api.get(
      `/api/v1/generated-documents/${completePayload.data.generatedDocumentId}/printable`
    );
    const printablePayload = await expectOkJson<{ html: string }>(printableResponse);
    expect(printablePayload.data.html).toContain('<');

    const duplicateCompleteResponse = await staffCtx.api.post(`/api/v1/document-requests/${created.id}/complete`, {
      data: {
        verificationMetadata: {
          parsedFields: {
            residentName: 'QA Resident',
            residentAddressLine: '15 M. Cruz Street, Barangay Progreso, San Juan City',
            address: '15 M. Cruz Street, Barangay Progreso, San Juan City',
            requestedBy: 'QA Resident',
            reasonResidency: 'Yes',
            issuedDate: new Date().toISOString().slice(0, 10),
          },
        },
      },
    });
    const duplicatePayload = await expectOkJson<{ generatedDocumentId: string }>(duplicateCompleteResponse);
    expect(duplicatePayload.data.generatedDocumentId).toBe(completePayload.data.generatedDocumentId);

    await page.goto('/staff/process-requests');
    await expect(page.getByText('Document Requests')).toBeVisible();
  });
});
