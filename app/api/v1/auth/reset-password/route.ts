import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { consumePasswordResetToken } from '@/lib/auth/password-reset';

type ResetPasswordPayload = {
  token?: string;
  email?: string;
  otp?: string;
  newPassword: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ResetPasswordPayload | null;
  const token = body?.token?.trim();
  const email = body?.email?.trim().toLowerCase();
  const otp = body?.otp?.trim();
  const newPassword = body?.newPassword ?? '';

  if ((!token && (!email || !otp)) || !newPassword) {
    return fail('VALIDATION_ERROR', 'A valid reset token or (email and verification code) along with new password is required.', 400);
  }

  if (newPassword.length < 8) {
    return fail('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400);
  }

  const consumed = await consumePasswordResetToken({ rawToken: token, email, otp });
  if (!consumed.ok) {
    const message =
      consumed.reason === 'expired'
        ? 'Reset code or link has expired. Please request a new password reset.'
        : consumed.reason === 'max_attempts'
        ? 'Maximum verification attempts reached. Please request a new password reset.'
        : 'Invalid or already used password reset code or token.';
    return fail('AUTH_UNAUTHORIZED', message, 401, { reason: consumed.reason });
  }

  const admin = getSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(consumed.userId, {
    password: newPassword,
  });

  if (error) {
    return fail('INTERNAL_ERROR', error.message, 500);
  }

  return ok({ reset: true });
}
