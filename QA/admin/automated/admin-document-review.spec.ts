import { test, expect } from '@playwright/test';
import { attachRoleCookiesToPage, createAuthedApiContext } from '../../_shared/automated/auth';
import { createQaRunTag } from '../../_shared/automated/env';
import { createDocumentRequest, getFirstDocumentTypeId } from '../../_shared/automated/document-request';
import { expectFailCode, expectOkJson } from '../../_shared/automated/contracts';

test.describe('Admin: Document Review', () => {
  test('ADM-DOCREQ-002 should approve a pending resident request', async ({ request, page }) => {
    const runTag = createQaRunTag();

    const residentCtx = await createAuthedApiContext(request, 'resident');
    const typeId = await getFirstDocumentTypeId((url) => residentCtx.api.get(url));
    const created = await createDocumentRequest(
      (url, data) => residentCtx.api.post(url, { data }),
      typeId,
      `Admin approval flow ${runTag}`
    );

    const staffCtx = await createAuthedApiContext(request, 'staff');
    const staffApproveResponse = await staffCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'approved' },
    });
    await expectFailCode(staffApproveResponse, 'AUTH_FORBIDDEN');

    const adminCtx = await createAuthedApiContext(request, 'admin');
    const approveResponse = await adminCtx.api.patch(`/api/v1/document-requests/${created.id}/status`, {
      data: { status: 'approved' },
    });
    const approvePayload = await expectOkJson<{ status: string }>(approveResponse);

    expect(approvePayload.data.status).toBe('approved');

    await attachRoleCookiesToPage(request, page, 'admin');
    await page.goto('/admin/document-requests');
    await expect(page.getByText('Document Requests')).toBeVisible();
    await expect(page.locator('a[href="/admin/reservations"]')).toHaveCount(0);
  });
});
