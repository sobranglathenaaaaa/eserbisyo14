import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { consumePasswordResetToken } from '@/lib/auth/password-reset';

type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ResetPasswordPayload | null;
  const token = body?.token?.trim();
  const newPassword = body?.newPassword ?? '';

  if (!token || !newPassword) {
    return fail('VALIDATION_ERROR', 'Token and new password are required', 400);
  }

  if (newPassword.length < 8) {
    return fail('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400);
  }

  const consumed = await consumePasswordResetToken(token);
  if (!consumed.ok) {
    const message =
      consumed.reason === 'expired'
        ? 'Reset token has expired. Please request another reset email.'
        : 'Invalid or already used reset token.';
    return fail('AUTH_UNAUTHORIZED', message, 401);
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
