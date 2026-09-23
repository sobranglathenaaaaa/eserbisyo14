import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildPasswordResetLink,
  checkPasswordResetCooldown,
  getActiveProfileByEmail,
  issuePasswordResetToken,
  sendPasswordResetMessage,
} from '@/lib/auth/password-reset';

type ResendOtpPayload = { email: string };

const GENERIC_RESEND_MESSAGE = 'If an account with that email exists, a new password reset email has been sent.';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ResendOtpPayload | null;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !email.includes('@')) {
    return fail('VALIDATION_ERROR', 'A valid email address is required', 400);
  }

  const profile = await getActiveProfileByEmail(email);
  if (!profile) {
    return ok({ sent: true, message: GENERIC_RESEND_MESSAGE });
  }

  const cooldown = await checkPasswordResetCooldown(profile.id);
  if (!cooldown.allowed) {
    return fail(
      'RATE_LIMITED',
      `Please wait ${cooldown.retryAfterSeconds}s before requesting another verification code.`,
      429,
      { retryAfterSeconds: cooldown.retryAfterSeconds }
    );
  }

  try {
    const tokenData = await issuePasswordResetToken({
      userId: profile.id,
      email,
      tenantId: profile.tenant_id,
    });

    const resetLink = buildPasswordResetLink(tokenData.token);
    await sendPasswordResetMessage({
      toEmail: email,
      fullName: profile.full_name ?? 'Resident',
      otpCode: tokenData.otp,
      resetLink,
    });

    const admin = getSupabaseAdminClient();
    await admin.from('email_logs').insert({
      tenant_id: profile.tenant_id,
      to_user_id: profile.id,
      to_email: email,
      subject: 'Resent eSerbisyo password reset code',
      body: 'Password reset OTP and link resent.',
    });
  } catch (error) {
    console.error('[auth.resend-otp] Failed to resend password reset email:', error instanceof Error ? error.message : 'Unknown error');
  }

  return ok({ sent: true, message: GENERIC_RESEND_MESSAGE });
}
