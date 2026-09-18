import { expect, test } from '@playwright/test';
import { isRegistrationEmailVerificationRequired } from '../../../lib/auth/email-verification-toggle';

test.describe('Email verification toggle parsing', () => {
  test('requires verification in production when EMAIL_VERIFICATION_ENABLED=true', () => {
    expect(
      isRegistrationEmailVerificationRequired({
        NODE_ENV: 'production',
        EMAIL_VERIFICATION_ENABLED: 'true',
      })
    ).toBe(true);
  });

  test('disables verification in production when EMAIL_VERIFICATION_ENABLED=false', () => {
    expect(
      isRegistrationEmailVerificationRequired({
        NODE_ENV: 'production',
        EMAIL_VERIFICATION_ENABLED: 'false',
      })
    ).toBe(false);
  });

  test('defaults to required in non-production when env is unset', () => {
    expect(
      isRegistrationEmailVerificationRequired({
        NODE_ENV: 'development',
      })
    ).toBe(true);
  });

  test('respects env toggle in non-production', () => {
    expect(
      isRegistrationEmailVerificationRequired({
        NODE_ENV: 'development',
        EMAIL_VERIFICATION_ENABLED: 'false',
      })
    ).toBe(false);
  });

  test('throws on invalid production values', () => {
    expect(() =>
      isRegistrationEmailVerificationRequired({
        NODE_ENV: 'production',
        EMAIL_VERIFICATION_ENABLED: 'yes',
      })
    ).toThrow(/EMAIL_VERIFICATION_ENABLED/);
  });
});
