export type QaRole = 'resident' | 'admin' | 'staff';

export function getQaBaseUrl(): string {
  return process.env.QA_BASE_URL ?? 'http://localhost:3000';
}

export function getQaTenantId(): string {
  return process.env.QA_TENANT_ID ?? 'default';
}

export function getQaCredential(role: QaRole): { email: string; password: string } {
  const emailKey = `QA_${role.toUpperCase()}_EMAIL`;
  const passwordKey = `QA_${role.toUpperCase()}_PASSWORD`;

  const email = process.env[emailKey];
  const password = process.env[passwordKey];

  if (!email || !password) {
    throw new Error(`Missing credential env vars: ${emailKey} and/or ${passwordKey}`);
  }

  return { email, password };
}

export function createQaRunTag(now = new Date()): string {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return [
    'QA_RUN',
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join('_');
}
