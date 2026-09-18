import { expect, type APIResponse } from '@playwright/test';

export type ApiOk<T> = {
  success: true;
  data: T;
};

export type ApiFail = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export async function expectOkJson<T>(response: APIResponse): Promise<ApiOk<T>> {
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as ApiOk<T> | ApiFail;
  expect(payload.success).toBe(true);
  return payload as ApiOk<T>;
}

export async function expectFailCode(response: APIResponse, code: string): Promise<ApiFail> {
  const payload = (await response.json()) as ApiOk<unknown> | ApiFail;
  expect(payload.success).toBe(false);
  expect((payload as ApiFail).error.code).toBe(code);
  return payload as ApiFail;
}
