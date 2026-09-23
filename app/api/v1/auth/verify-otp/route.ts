import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { verifyPasswordResetOtp } from '@/lib/auth/password-reset';

type VerifyOtpPayload = {
  email: string;
  otp: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VerifyOtpPayload | null;
  const email = body?.email?.trim().toLowerCase();
  const otp = body?.otp?.trim();

  if (!email || !otp) {
    return fail('VALIDATION_ERROR', 'Email and verification code are required.', 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    return fail('VALIDATION_ERROR', 'Verification code must be exactly 6 digits.', 400);
  }

  try {
    const result = await verifyPasswordResetOtp({ email, otp });

    if (!result.ok) {
      if (result.reason === 'expired') {
        return fail('AUTH_UNAUTHORIZED', 'Verification code has expired. Please request a new code.', 401, {
          reason: result.reason,
        });
      }
      if (result.reason === 'max_attempts') {
        return fail(
          'AUTH_UNAUTHORIZED',
          'Maximum verification attempts reached. Please request a new code.',
          401,
          { reason: result.reason }
        );
      }
      return fail('AUTH_UNAUTHORIZED', 'Invalid or already used verification code.', 401, {
        reason: result.reason,
      });
    }

    return ok({ verified: true, email });
  } catch (error) {
    console.error('[auth.verify-otp] Verification error:', error instanceof Error ? error.message : 'Unknown error');
    return fail('INTERNAL_ERROR', 'Unable to verify reset code.', 500);
  }
}
