import { test, expect } from '@playwright/test';
import { attachRoleCookiesToPage, createAuthedApiContext } from '../../_shared/automated/auth';
import { createQaRunTag } from '../../_shared/automated/env';
import { createDocumentRequest, getFirstDocumentTypeId } from '../../_shared/automated/document-request';
import { expectOkJson } from '../../_shared/automated/contracts';

test.describe('Resident: Document Requests', () => {
  test('RES-DOCREQ-001 should submit and fetch own document request', async ({ request, page }) => {
    const runTag = createQaRunTag();
    const purpose = `Resident document request ${runTag}`;

    const { api } = await createAuthedApiContext(request, 'resident');
    const documentTypeId = await getFirstDocumentTypeId((url) => api.get(url));

    const created = await createDocumentRequest(
      (url, data) => api.post(url, { data }),
      documentTypeId,
      purpose
    );

    const listResponse = await api.get('/api/v1/document-requests');
    const listPayload = await expectOkJson<{ requests: Array<{ id: string; purpose: string; status: string }> }>(listResponse);
    const match = listPayload.data.requests.find((item) => item.id === created.id);

    expect(match).toBeTruthy();
    expect(match?.status).toBe('pending');
    expect(match?.purpose).toContain(runTag);

    await attachRoleCookiesToPage(request, page, 'resident');
    await page.goto('/resident/document-requests');
    await expect(page.getByText('Submit New Request')).toBeVisible();
    await expect(page.getByText('Purpose of request *')).toBeVisible();
    await expect(page.getByText(/Example: employment requirement/)).toBeVisible();
    await expect(page.getByText(/SMS/i)).toHaveCount(0);
  });

  test('RES-DOCREQ-002 should cancel pending request from summary modal', async ({ request, page }) => {
    const runTag = createQaRunTag();
    const purpose = `Resident document cancel ${runTag}`;

    const { api } = await createAuthedApiContext(request, 'resident');
    const documentTypeId = await getFirstDocumentTypeId((url) => api.get(url));
    const created = await createDocumentRequest((url, data) => api.post(url, { data }), documentTypeId, purpose);

    await attachRoleCookiesToPage(request, page, 'resident');
    await page.goto('/resident/document-requests');
    await expect(page.getByText(created.reference_number)).toBeVisible();

    const card = page.locator('div').filter({ hasText: created.reference_number }).first();
    await card.getByRole('button', { name: /Open summary|Buksan ang buod/i }).click();

    await expect(page.getByText(created.reference_number)).toBeVisible();
    await page.getByRole('button', { name: /Cancel Request|Kanselahin ang Kahilingan/i }).click();
    await expect(page.getByText(/Request cancelled successfully|Matagumpay na kanselahin ang kahilingan/i)).toBeVisible();

    const listResponse = await api.get('/api/v1/document-requests');
    const listPayload = await expectOkJson<{ requests: Array<{ id: string; status: string }> }>(listResponse);
    const match = listPayload.data.requests.find((item) => item.id === created.id);
    expect(match?.status).toBe('cancelled');
  });
});
