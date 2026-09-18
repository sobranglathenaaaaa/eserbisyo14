import { test, expect } from '@playwright/test';
import { createAuthedApiContext } from '../_shared/automated/auth';
import { createQaRunTag } from '../_shared/automated/env';
import { createDocumentRequest, getAutoReleaseDocumentType } from '../_shared/automated/document-request';
import { expectFailCode, expectOkJson } from '../_shared/automated/contracts';

test.describe('Cross Role Smoke: Document Request Lifecycle', () => {
  test('WF-001 should complete resident -> admin -> staff -> resident verification', async ({ request }) => {
    const runTag = createQaRunTag();

    const residentCtx = await createAuthedApiContext(request, 'resident');
    const documentType = await getAutoReleaseDocumentType((url) => residentCtx.api.get(url));
    const created = await createDocumentRequest(
      (url, data) => residentCtx.api.post(url, { data }),
      documentType.id,
      `Cross role lifecycle ${runTag}`,
      documentType.type
    );

    const adminCtx = await createAuthedApiContext(request, 'admin');
    const declineWithoutReason = await adminCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'declined' },
    });
    await expectFailCode(declineWithoutReason, 'VALIDATION_ERROR');

    const approved = await adminCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'approved' },
    });
    const approvedPayload = await expectOkJson<{ status: string }>(approved);
    expect(approvedPayload.data.status).toBe('approved');

    const staffCtx = await createAuthedApiContext(request, 'staff');
    const processing = await staffCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'processing' },
    });
    const processingPayload = await expectOkJson<{ status: string }>(processing);
    expect(processingPayload.data.status).toBe('processing');

    const completed = await staffCtx.api.post(`/api/v1/document-requests/${created.id}/complete`, {
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
    }>(completed);
    expect(completePayload.data.request.status).toBe('completed');
    expect(completePayload.data.generatedDocumentId).toBeTruthy();
    expect(completePayload.data.portalHref).toContain('documentId=');

    const residentListResponse = await residentCtx.api.get('/api/v1/document-requests');
    const residentList = await expectOkJson<{ requests: Array<{ id: string; status: string }> }>(residentListResponse);
    const target = residentList.data.requests.find((item) => item.id === created.id);

    expect(target?.status).toBe('completed');

    await expect
      .poll(async () => {
        const notificationsResponse = await residentCtx.api.get('/api/v1/notifications');
        const notificationsPayload = await expectOkJson<{
          notifications: Array<{ event_key: string; entity_id: string | null; action_href: string | null }>;
        }>(notificationsResponse);
        return notificationsPayload.data.notifications
          .filter((item) => item.entity_id === created.id)
          .map((item) => item.event_key)
          .sort();
      })
      .toEqual(['document.approved', 'document.completed', 'document.processing']);
  });
});
