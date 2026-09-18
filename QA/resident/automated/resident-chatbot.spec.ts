import { expect, test } from '@playwright/test';
import { getQaBaseUrl, getQaTenantId } from '../../_shared/automated/env';

const ASSISTANT_RESPONSE = {
  success: true,
  data: {
    sessionId: 'qa-chatbot-session',
    assistantMessage: {
      sender: 'assistant',
      createdAt: new Date().toISOString(),
      temporary: true,
      text: [
        'Summary: Open the correct service page first, then submit your request details.',
        'Action Steps:',
        '1. Open Document Requests from the resident menu.',
        '2. Choose the correct document type and fill in your purpose.',
        '3. Submit the request and monitor updates in Notifications.',
        'Reminder: Double-check your details before submitting.',
        'Next Page: Document Requests (/resident/document-requests)',
      ].join('\n'),
    },
  },
};

test.describe('Resident: Chatbot', () => {
  test.beforeEach(async ({ context, page }) => {
    const baseUrl = getQaBaseUrl();
    await context.addCookies([
      { name: 'sb-access-token', value: 'qa-e2e-token', url: baseUrl },
      { name: 'x-user-id', value: 'qa-resident-user', url: baseUrl },
      { name: 'x-user-role', value: 'resident', url: baseUrl },
      { name: 'x-tenant-id', value: getQaTenantId(), url: baseUrl },
    ]);
    await page.addInitScript(() => {
      (window as any).__ESERBISYO_E2E_SESSION__ = {
        userId: 'qa-resident-user',
        role: 'resident',
        locale: 'en',
        email: 'qa-resident@example.com',
        fullName: 'QA Resident',
      };
    });
  });

  test('RES-CHAT-001 should render structured assistant guidance clearly', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ASSISTANT_RESPONSE),
      });
    });

    await page.goto('/resident/chatbot');

    const composer = page.getByPlaceholder('Example: What should I prepare before requesting a barangay certificate?');
    await expect(composer).toBeVisible();
    await composer.fill('I need help requesting a barangay clearance.');

    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByText('Summary')).toBeVisible();
    await expect(page.getByText('Action steps')).toBeVisible();
    await expect(page.getByText('Reminder:')).toBeVisible();
    await expect(page.getByText('Next page:')).toBeVisible();
    await expect(page.getByText('Document Requests (/resident/document-requests)')).toBeVisible();
  });

  test('RES-CHAT-003 FAQ buttons should send a question', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ASSISTANT_RESPONSE),
      });
    });

    await page.goto('/resident/chatbot');

    await page.getByRole('button', { name: 'How do I request a document?' }).click();

    await expect(page.getByText('How do I request a document?')).toBeVisible();
    await expect(page.getByText('Summary')).toBeVisible();
  });

  test('RES-CHAT-002 floating assistant should render structured guidance', async ({ page }) => {
    await page.route('**/api/v1/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ASSISTANT_RESPONSE),
      });
    });

    await page.goto('/resident/dashboard');

    await page.getByRole('button', { name: 'Open AI Assistant' }).click();

    const composer = page.getByPlaceholder('Type your question...');
    await expect(composer).toBeVisible();
    await composer.fill('I need help requesting a barangay clearance.');

    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText('Summary')).toBeVisible();
    await expect(page.getByText('Action steps')).toBeVisible();
    await expect(page.getByText('Reminder:')).toBeVisible();
    await expect(page.getByText('Next page:')).toBeVisible();
    await expect(page.getByText('Document Requests (/resident/document-requests)')).toBeVisible();
  });
});
