import { test, expect } from '@playwright/test';
import { attachRoleCookiesToPage, createAuthedApiContext } from '../../_shared/automated/auth';
import { expectOkJson } from '../../_shared/automated/contracts';

test.describe('Resident: Notifications', () => {
  test('RES-NOTIF-001 should fetch and mark notification as read when available', async ({ request, page }) => {
    const { api } = await createAuthedApiContext(request, 'resident');

    const listResponse = await api.get('/api/v1/notifications?unreadOnly=true');
    const listPayload = await expectOkJson<{ notifications: Array<{ id: string; read: boolean }> }>(listResponse);

    if (listPayload.data.notifications.length > 0) {
      const target = listPayload.data.notifications[0];
      const readResponse = await api.patch(`/api/v1/notifications/${target.id}/read`);
      const readPayload = await expectOkJson<{ read: boolean }>(readResponse);
      expect(readPayload.data.read).toBe(true);
    }

    await attachRoleCookiesToPage(request, page, 'resident');
    await page.goto('/resident/notifications');
    await expect(page.getByText('In-app Notifications')).toBeVisible();
  });
});
