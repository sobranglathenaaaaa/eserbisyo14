import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  checkResendCooldown,
  getUnverifiedProfileByEmail,
  issueEmailVerificationOtp,
  sendEmailVerificationMessage,
} from '@/lib/auth/email-verification';

type ResendPayload = { email: string };

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as ResendPayload | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return fail('VALIDATION_ERROR', 'Email is required', 400);
  }

  const profile = await getUnverifiedProfileByEmail(email);
  if (!profile) {
    return ok({ sent: true });
  }

  const cooldown = await checkResendCooldown(profile.id);
  if (!cooldown.allowed) {
    return fail(
      'RATE_LIMITED',
      `Please wait ${cooldown.retryAfterSeconds}s before requesting another verification code.`,
      429,
      { retryAfterSeconds: cooldown.retryAfterSeconds }
    );
  }

  const admin = getSupabaseAdminClient();
  const { data: nameRow } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', profile.id)
    .maybeSingle<{ full_name: string | null }>();

  const otpData = await issueEmailVerificationOtp({
    userId: profile.id,
    email,
    tenantId: profile.tenant_id,
  });

  await sendEmailVerificationMessage({
    toEmail: email,
    fullName: nameRow?.full_name ?? 'Resident',
    otpCode: otpData.otp,
  });

  await admin.from('email_logs').insert({
    tenant_id: profile.tenant_id,
    to_user_id: profile.id,
    to_email: email,
    subject: 'Verify your eSerbisyo account (OTP)',
    body: 'Verification OTP sent (redacted). Expires in 10 minutes.',
  });

  return ok({ sent: true });
}
