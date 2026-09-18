import { NextRequest } from 'next/server';
import { ok, fail } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  buildPasswordResetLink,
  checkPasswordResetCooldown,
  getActiveProfileByEmail,
  issuePasswordResetToken,
  sendPasswordResetMessage,
} from '@/lib/auth/password-reset';

type ForgotPasswordPayload = { email: string };

const GENERIC_SUCCESS_MESSAGE = 'If an account exists, we sent a reset link.';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ForgotPasswordPayload | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return fail('VALIDATION_ERROR', 'Email is required', 400);
  }

  const profile = await getActiveProfileByEmail(email);
  if (!profile) {
    return ok({ sent: true, message: GENERIC_SUCCESS_MESSAGE });
  }

  const cooldown = await checkPasswordResetCooldown(profile.id);
  if (!cooldown.allowed) {
    return fail(
      'RATE_LIMITED',
      `Please wait ${cooldown.retryAfterSeconds}s before requesting another password reset email.`,
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
      resetLink,
    });

    const admin = getSupabaseAdminClient();
    await admin.from('email_logs').insert({
      tenant_id: profile.tenant_id,
      to_user_id: profile.id,
      to_email: email,
      subject: 'Reset your eSerbisyo password',
      body: resetLink,
    });
  } catch (error) {
    console.error('[auth.forgot-password] Failed to send password reset email:', error);
    // Keep response neutral to avoid account enumeration and implementation disclosure.
  }

  return ok({ sent: true, message: GENERIC_SUCCESS_MESSAGE });
}
