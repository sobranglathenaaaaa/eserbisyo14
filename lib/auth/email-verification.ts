import { createHash, randomInt } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { sendResendEmail } from '@/lib/email/resend';

const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type TokenRecord = {
  id: string;
  user_id: string;
  email: string;
  tenant_id: string;
  token_hash: string;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
  expires_at: string;
  used_at: string | null;
};

type ProfileRecord = {
  id: string;
  tenant_id: string;
};

type VerifyOtpResult =
  | { ok: true; userId: string; tenantId: string; email: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'max_attempts' };

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

export async function issueEmailVerificationOtp(input: {
  userId: string;
  email: string;
  tenantId: string;
}): Promise<{ otp: string; expiresAt: string }> {
  const admin = getSupabaseAdminClient();
  const otp = createOtpCode();
  const tokenHash = hashValue(otp);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  // Keep only one active OTP per user.
  await admin
    .from('email_verification_tokens')
    .update({ used_at: nowIso })
    .eq('user_id', input.userId)
    .is('used_at', null);

  const { error } = await admin.from('email_verification_tokens').insert({
    user_id: input.userId,
    tenant_id: input.tenantId,
    email: input.email,
    token_hash: tokenHash,
    attempt_count: 0,
    max_attempts: OTP_MAX_ATTEMPTS,
    expires_at: expiresAt,
    last_sent_at: nowIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { otp, expiresAt };
}

export async function verifyEmailVerificationOtp(input: {
  email: string;
  otp: string;
}): Promise<VerifyOtpResult> {
  const admin = getSupabaseAdminClient();
  const email = input.email.trim().toLowerCase();
  const tokenHash = hashValue(input.otp.trim());

  const { data: record, error: fetchError } = await admin
    .from('email_verification_tokens')
    .select('id,user_id,email,tenant_id,token_hash,attempt_count,max_attempts,created_at,expires_at,used_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TokenRecord>();

  if (fetchError || !record) {
    return { ok: false, reason: 'invalid' };
  }

  if (record.used_at) {
    return { ok: false, reason: 'used' };
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (record.attempt_count >= record.max_attempts) {
    return { ok: false, reason: 'max_attempts' };
  }

  if (record.token_hash !== tokenHash) {
    const nextAttemptCount = record.attempt_count + 1;
    const { data: updateRows } = await admin
      .from('email_verification_tokens')
      .update({
        attempt_count: nextAttemptCount,
      })
      .eq('id', record.id)
      .eq('attempt_count', record.attempt_count)
      .is('used_at', null)
      .select('attempt_count,max_attempts');

    const finalAttempts = updateRows?.[0]?.attempt_count ?? nextAttemptCount;
    const maxAttempts = updateRows?.[0]?.max_attempts ?? record.max_attempts;
    if (finalAttempts > maxAttempts) return { ok: false, reason: 'max_attempts' };
    return { ok: false, reason: 'invalid' };
  }

  const usedAt = new Date().toISOString();
  const { data: updatedRows, error: consumeError } = await admin
    .from('email_verification_tokens')
    .update({ used_at: usedAt })
    .eq('id', record.id)
    .eq('attempt_count', record.attempt_count)
    .is('used_at', null)
    .select('id');

  if (consumeError || !updatedRows || updatedRows.length === 0) {
    return { ok: false, reason: 'used' };
  }

  return {
    ok: true,
    userId: record.user_id,
    tenantId: record.tenant_id,
    email: record.email,
  };
}

export async function checkResendCooldown(userId: string): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const admin = getSupabaseAdminClient();
  const { data: latest } = await admin
    .from('email_verification_tokens')
    .select('created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ created_at: string }>();

  if (!latest?.created_at) {
    return { allowed: true };
  }

  const secondsSinceLastSend = Math.floor((Date.now() - new Date(latest.created_at).getTime()) / 1000);
  if (secondsSinceLastSend >= RESEND_COOLDOWN_SECONDS) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: RESEND_COOLDOWN_SECONDS - secondsSinceLastSend,
  };
}

export async function sendEmailVerificationMessage(input: {
  toEmail: string;
  fullName: string;
  otpCode: string;
}): Promise<void> {
  const subject = 'Verify your eSerbisyo account';
  const html = [
    `<p>Hello ${input.fullName || 'Resident'},</p>`,
    '<p>Use this one-time verification code to complete your registration:</p>',
    `<p style="font-size: 24px; font-weight: 700; letter-spacing: 0.14em;">${input.otpCode}</p>`,
    `<p>This code expires in ${OTP_TTL_MINUTES} minutes and can be entered once.</p>`,
    '<p>If you did not create this account, you can safely ignore this email.</p>',
  ].join('');
  const text = [
    `Hello ${input.fullName || 'Resident'},`,
    'Use this one-time verification code to complete your registration:',
    input.otpCode,
    `This code expires in ${OTP_TTL_MINUTES} minutes and can be entered once.`,
    'If you did not create this account, you can safely ignore this email.',
  ].join('\n');

  await sendResendEmail({
    to: input.toEmail,
    subject,
    html,
    text,
  });
}

export async function getUnverifiedProfileByEmail(email: string): Promise<ProfileRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id,tenant_id,is_verified,is_deleted')
    .eq('email', email)
    .maybeSingle<{ id: string; tenant_id: string; is_verified: boolean; is_deleted: boolean }>();

  if (!profile || profile.is_deleted || profile.is_verified) {
    return null;
  }

  return {
    id: profile.id,
    tenant_id: profile.tenant_id,
  };
}
