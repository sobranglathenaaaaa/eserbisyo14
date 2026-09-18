import { test, expect, type Page } from '@playwright/test';
import { expectFailCode, expectOkJson } from '../../_shared/automated/contracts';
import { createQaRunTag, getQaTenantId } from '../../_shared/automated/env';

type RegisterPayload = {
  email: string;
  password: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix?: string;
  sex: string;
  civilStatus: string;
  citizenship: string;
  birthDate: string;
  contactNumber: string;
  addressLine: string;
  province: string;
  city?: string;
  barangay: string;
  idType: string;
  idNumber: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
};

const sampleIdPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBAQEAOwAAAABJRU5ErkJggg==',
  'base64'
);

function buildPayload(runTag: string): RegisterPayload {
  const email = `resident.${runTag.toLowerCase()}@qa.local`;
  return {
    email,
    password: 'Resident123!',
    firstName: 'Juan',
    middleName: `QA${runTag.slice(-2)}`,
    lastName: 'Cruz',
    suffix: 'Jr.',
    sex: 'Male',
    civilStatus: 'Single',
    citizenship: 'Filipino',
    birthDate: '1997-03-15',
    contactNumber: '09123456789',
    addressLine: `123 Main St ${runTag}`,
    province: 'Metro Manila',
    city: 'San Juan',
    barangay: 'Progreso',
    idType: 'Passport',
    idNumber: `ID-${runTag}`,
    termsAccepted: true,
    privacyAccepted: true,
  };
}

async function fillRegisterForm(page: Page, payload: RegisterPayload) {
  await page.getByLabel('First Name *').fill(payload.firstName);
  await page.getByLabel('Middle Name (optional)').fill(payload.middleName);
  await page.getByLabel('Last Name *').fill(payload.lastName);
  await page.getByLabel('Suffix (optional)').fill(payload.suffix ?? '');
  await page.getByLabel('Sex *').selectOption(payload.sex);
  await page.getByLabel('Civil Status *').selectOption(payload.civilStatus);
  await page.getByLabel('Citizenship *').fill(payload.citizenship);
  await page.getByLabel('Birthdate *').fill(payload.birthDate);
  await page.getByLabel('House/Unit/Building/Village/Street *').fill(payload.addressLine);
  await page.getByLabel('Province *').fill(payload.province);
  await page.getByLabel('City (optional)').fill(payload.city ?? '');
  await page.getByLabel('Barangay *').fill(payload.barangay);
  await page.getByLabel('Contact #1 *').fill(payload.contactNumber);
  await page.getByLabel('Email *').fill(payload.email);
  await page.getByLabel('ID Type *').selectOption(payload.idType);
  await page.getByLabel('ID Number *').fill(payload.idNumber);
  await page.locator('#id-image-file').setInputFiles({
    name: 'id-card.png',
    mimeType: 'image/png',
    buffer: sampleIdPng,
  });
  await page.locator('#register-password').fill(payload.password);
  await page.locator('#confirm-password').fill(payload.password);
}

function toMultipartPayload(payload: RegisterPayload, includeIdUpload = true) {
  const multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }> = {
    email: payload.email,
    password: payload.password,
    firstName: payload.firstName,
    middleName: payload.middleName,
    lastName: payload.lastName,
    suffix: payload.suffix ?? '',
    sex: payload.sex,
    civilStatus: payload.civilStatus,
    citizenship: payload.citizenship,
    birthDate: payload.birthDate,
    contactNumber: payload.contactNumber,
    addressLine: payload.addressLine,
    province: payload.province,
    city: payload.city ?? '',
    barangay: payload.barangay,
    idType: payload.idType,
    idNumber: payload.idNumber,
    termsAccepted: String(payload.termsAccepted),
    privacyAccepted: String(payload.privacyAccepted),
  };

  if (includeIdUpload) {
    multipart.idImageFile = {
      name: 'resident-id.png',
      mimeType: 'image/png',
      buffer: sampleIdPng,
    };
  }

  return multipart;
}

test.describe('Resident: Registration', () => {
  test('RES-AUTH-001 should register, login, and persist structured profile fields', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);

    const registerResponse = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    const registerResult = await expectOkJson<{
      userId: string;
      role: string;
      verificationRequired: boolean;
      verificationEmailSent: boolean;
      warning?: string;
    }>(registerResponse);
    expect(registerResult.data.role).toBe('resident');
    expect(typeof registerResult.data.verificationRequired).toBe('boolean');
    expect(typeof registerResult.data.verificationEmailSent).toBe('boolean');

    const loginResponse = await request.post('/api/v1/auth/login', {
      data: { email: payload.email, password: payload.password },
    });

    if (registerResult.data.verificationRequired) {
      const loginFail = await expectFailCode(loginResponse, 'AUTH_FORBIDDEN');
      expect(loginFail.error.message).toContain('verify your email');
      return;
    }

    const loginResult = await expectOkJson<{
      userId: string;
      role: string;
      session: { accessToken: string; refreshToken: string };
    }>(loginResponse);
    expect(loginResult.data.userId).toBe(registerResult.data.userId);

    const meResponse = await request.get('/api/v1/profiles/me', {
      headers: {
        authorization: `Bearer ${loginResult.data.session.accessToken}`,
        'x-tenant-id': getQaTenantId(),
      },
    });
    const meResult = await expectOkJson<{
      firstName: string | null;
      middleName: string | null;
      lastName: string | null;
      addressLine: string | null;
      barangay: string | null;
      province: string | null;
      termsAcceptedAt: string | null;
      privacyAcceptedAt: string | null;
      contactNumber: string | null;
    }>(meResponse);

    expect(meResult.data.firstName).toBe(payload.firstName);
    expect(meResult.data.middleName).toBe(payload.middleName);
    expect(meResult.data.lastName).toBe(payload.lastName);
    expect(meResult.data.addressLine).toContain(runTag);
    expect(meResult.data.barangay).toBe(payload.barangay);
    expect(meResult.data.province).toBe(payload.province);
    expect(meResult.data.contactNumber).toBe(payload.contactNumber);
    expect(meResult.data.termsAcceptedAt).toBeTruthy();
    expect(meResult.data.privacyAcceptedAt).toBeTruthy();
  });

  test('RES-AUTH-001A should allow omitted middle name and still register', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);
    payload.middleName = '';

    const registerResponse = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    const registerResult = await expectOkJson<{ userId: string; role: string }>(registerResponse);
    expect(registerResult.data.role).toBe('resident');
  });

  test('RES-AUTH-002 should block submit in UI when terms is not accepted', async ({ page }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);

    await page.goto('/register');
    await fillRegisterForm(page, payload);

    await page.getByLabel('I accept the Data Privacy Policy.').check();
    await page.getByRole('button', { name: 'Create resident account' }).click();

    await expect(page.getByText('Please agree to the Terms and Conditions.')).toBeVisible();
  });

  test('RES-AUTH-003 should reject if email is missing', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);
    payload.email = '';

    const response = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    await expectFailCode(response, 'VALIDATION_ERROR');
    expect(await response.text()).toContain('Missing required fields');
  });

  test('RES-AUTH-004 should reject if data privacy policy is not accepted', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);
    payload.privacyAccepted = false;

    const response = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    await expectFailCode(response, 'VALIDATION_ERROR');
    expect(await response.text()).toContain('Data Privacy Policy');
  });

  test('RES-AUTH-005 should return conflict on duplicate email', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);

    const firstRegister = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    await expectOkJson<{ userId: string }>(firstRegister);

    const secondRegister = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    await expectFailCode(secondRegister, 'RESOURCE_CONFLICT');
  });

  test('RES-AUTH-006 should reject register request when ID upload is missing', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);

    const response = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload, false),
    });
    await expectFailCode(response, 'VALIDATION_ERROR');
    expect(await response.text()).toContain('Upload Picture of ID is required');
  });

  test('RES-AUTH-007 should enforce OTP payload validation and max-attempt lockout', async ({ request }) => {
    const runTag = createQaRunTag();
    const payload = buildPayload(runTag);

    const registerResponse = await request.post('/api/v1/auth/register', {
      multipart: toMultipartPayload(payload),
    });
    const registerResult = await expectOkJson<{
      verificationRequired: boolean;
    }>(registerResponse);

    const missingPayloadResponse = await request.post('/api/v1/auth/verify', {
      data: { email: payload.email },
    });
    await expectFailCode(missingPayloadResponse, 'VALIDATION_ERROR');

    if (!registerResult.data.verificationRequired) {
      return;
    }

    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrongOtpResponse = await request.post('/api/v1/auth/verify', {
        data: { email: payload.email, otp: '000000' },
      });
      const wrongOtpFail = await expectFailCode(wrongOtpResponse, 'AUTH_UNAUTHORIZED');
      expect(wrongOtpFail.error.message).toContain('verification code');
    }

    const lockedResponse = await request.post('/api/v1/auth/verify', {
      data: { email: payload.email, otp: '000000' },
    });
    const lockedFail = await expectFailCode(lockedResponse, 'AUTH_UNAUTHORIZED');
    expect(lockedFail.error.message).toContain('maximum verification attempts');
  });
});
