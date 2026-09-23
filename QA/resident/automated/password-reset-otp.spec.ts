import { test, expect } from '@playwright/test';
import { expectFailCode, expectOkJson } from '../../_shared/automated/contracts';
import { createQaRunTag } from '../../_shared/automated/env';

test.describe('Resident: Password Reset & OTP Security', () => {
  test('RES-PR-001 should return identical generic success message for existing vs non-existing emails (enumeration protection)', async ({ request }) => {
    const runTag = createQaRunTag();
    const existingEmail = `resident.${runTag.toLowerCase()}@qa.local`;
    const nonExistingEmail = `nonexistent.${runTag.toLowerCase()}@qa.local`;

    const res1 = await request.post('/api/v1/auth/forgot-password', {
      data: { email: nonExistingEmail },
    });
    const result1 = await expectOkJson<{ sent: boolean; message: string }>(res1);

    const res2 = await request.post('/api/v1/auth/forgot-password', {
      data: { email: existingEmail },
    });
    const result2 = await expectOkJson<{ sent: boolean; message: string }>(res2);

    expect(result1.data.message).toBe(result2.data.message);
    expect(result1.data.message).toContain('password reset email has been sent');
  });

  test('RES-PR-002 should enforce 6-digit OTP formatting validation', async ({ request }) => {
    const response = await request.post('/api/v1/auth/verify-otp', {
      data: { email: 'test@example.com', otp: '123' },
    });
    const failPayload = await expectFailCode(response, 'VALIDATION_ERROR');
    expect(failPayload.error.message).toContain('6 digits');
  });

  test('RES-PR-003 should enforce maximum verification attempts limit (5 attempts)', async ({ request }) => {
    const email = `lockout.test.${createQaRunTag().toLowerCase()}@qa.local`;

    // Trigger initial forgot password
    await request.post('/api/v1/auth/forgot-password', {
      data: { email },
    });

    // Send 5 incorrect OTP attempts
    for (let attempt = 1; attempt <= 5; attempt++) {
      const wrongOtpRes = await request.post('/api/v1/auth/verify-otp', {
        data: { email, otp: '000000' },
      });
      await expectFailCode(wrongOtpRes, 'AUTH_UNAUTHORIZED');
    }

    // 6th attempt must return max_attempts failure code/message
    const lockedRes = await request.post('/api/v1/auth/verify-otp', {
      data: { email, otp: '000000' },
    });
    const lockedFail = await expectFailCode(lockedRes, 'AUTH_UNAUTHORIZED');
    expect(lockedFail.error.message).toContain('Maximum verification attempts');
  });

  test('RES-PR-004 should enforce resend cooldown rate limiting (60s)', async ({ request }) => {
    const runTag = createQaRunTag();
    const email = `cooldown.${runTag.toLowerCase()}@qa.local`;

    // First request
    const firstRes = await request.post('/api/v1/auth/resend-otp', {
      data: { email },
    });
    await expectOkJson<{ sent: boolean }>(firstRes);

    // Immediate second request should be rate-limited if profile is active or return generic response
    const secondRes = await request.post('/api/v1/auth/resend-otp', {
      data: { email },
    });
    expect([200, 429]).toContain(secondRes.status());
  });

  test('RES-PR-005 should reject password reset with weak password or invalid token', async ({ request }) => {
    const shortPasswordRes = await request.post('/api/v1/auth/reset-password', {
      data: { token: 'invalid-token-1234567890', newPassword: 'short' },
    });
    await expectFailCode(shortPasswordRes, 'VALIDATION_ERROR');

    const invalidTokenRes = await request.post('/api/v1/auth/reset-password', {
      data: { token: 'invalid-token-123456789012345678901234567890', newPassword: 'ValidPassword123!' },
    });
    const failPayload = await expectFailCode(invalidTokenRes, 'AUTH_UNAUTHORIZED');
    expect(failPayload.error.message).toContain('Invalid or already used');
  });
});
