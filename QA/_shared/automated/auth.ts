import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';
import { expect, request as playwrightRequest } from '@playwright/test';
import { getQaBaseUrl, getQaCredential, getQaTenantId, type QaRole } from './env';
import { expectOkJson } from './contracts';

type LoginData = {
  userId: string;
  role: QaRole;
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
};

export async function loginByRole(request: APIRequestContext, role: QaRole): Promise<LoginData> {
  const { email, password } = getQaCredential(role);
  const response = await request.post(`${getQaBaseUrl()}/api/v1/auth/login`, {
    data: { email, password },
  });

  const payload = await expectOkJson<LoginData>(response);
  expect(payload.data.role).toBe(role);
  return payload.data;
}

export async function createAuthedApiContext(
  request: APIRequestContext,
  role: QaRole
): Promise<{ api: APIRequestContext; auth: LoginData }> {
  const auth = await loginByRole(request, role);
  const api = await playwrightRequest.newContext({
    baseURL: getQaBaseUrl(),
    extraHTTPHeaders: {
      authorization: `Bearer ${auth.session.accessToken}`,
      'x-tenant-id': getQaTenantId(),
    },
  });
  return { api, auth };
}

export async function attachRoleCookiesToPage(request: APIRequestContext, page: Page, role: QaRole): Promise<LoginData> {
  const auth = await loginByRole(request, role);
  const context: BrowserContext = page.context();
  const baseUrl = getQaBaseUrl();

  await page.addInitScript((session) => {
    (window as unknown as { __ESERBISYO_E2E_SESSION__?: unknown }).__ESERBISYO_E2E_SESSION__ = session;
  }, {
    userId: auth.userId,
    role: auth.role,
    locale: 'en',
  });

  await context.addCookies([
    { name: 'sb-access-token', value: auth.session.accessToken, url: baseUrl },
    { name: 'x-user-id', value: auth.userId, url: baseUrl },
    { name: 'x-user-role', value: auth.role, url: baseUrl },
    { name: 'x-tenant-id', value: getQaTenantId(), url: baseUrl },
  ]);

  return auth;
}
