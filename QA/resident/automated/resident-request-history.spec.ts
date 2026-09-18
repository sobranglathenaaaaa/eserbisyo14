import { test, expect } from '@playwright/test';

test.describe('Resident: Request History', () => {
  test('RES-HISTORY-001 should switch categories and persist selected view in URL', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Resident' }).click();
    await expect(page).toHaveURL(/\/resident\/dashboard/, { timeout: 30_000 });

    await page.goto('/resident/request-history');
    await expect(page.getByTestId('history-category-all')).toBeVisible();

    const notificationsTab = page.getByTestId('history-category-notifications');
    const allHistoryTab = page.getByTestId('history-category-all');

    await notificationsTab.click();
    await expect(page).toHaveURL(/\/resident\/request-history\?category=notifications/);
    await expect(notificationsTab).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await expect(page).toHaveURL(/\/resident\/request-history\?category=notifications/);
    await expect(notificationsTab).toHaveAttribute('aria-pressed', 'true');

    await allHistoryTab.click();
    await expect(page).toHaveURL(/\/resident\/request-history$/);
    await expect(allHistoryTab).toHaveAttribute('aria-pressed', 'true');
  });
});
