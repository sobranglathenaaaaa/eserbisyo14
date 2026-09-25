import { createHash, randomBytes, randomInt } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { sendEmail } from '@/lib/email/sender';

const OTP_TTL_MINUTES = 5;
const TOKEN_TTL_MINUTES = 15;
const OTP_MAX_ATTEMPTS = 5;
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

type TokenRecord = {
  id: string;
  user_id: string;
  email: string;
  tenant_id: string;
  token_hash: string;
  otp_hash?: string | null;
  otp_attempt_count: number;
  otp_max_attempts: number;
  otp_expires_at?: string | null;
  expires_at: string;
  used_at: string | null;
  otp_verified_at?: string | null;
};

type ActiveProfileRecord = {
  id: string;
  tenant_id: string;
  full_name: string | null;
};

export type VerifyOtpResult =
  | { ok: true; userId: string; tenantId: string; email: string; token: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'max_attempts' };

export type ConsumeTokenResult =
  | { ok: true; userId: string; tenantId: string; email: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' | 'max_attempts' };

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createResetToken(): string {
  return randomBytes(32).toString('base64url');
}

function createOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

export async function issuePasswordResetToken(input: {
  userId: string;
  email: string;
  tenantId: string;
}): Promise<{ token: string; otp: string; expiresAt: string; otpExpiresAt: string }> {
  const admin = getSupabaseAdminClient();
  const token = createResetToken();
  const tokenHash = hashValue(token);
  const otp = createOtpCode();
  const otpHash = hashValue(otp);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
  const otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

  await admin
    .from('password_reset_tokens')
    .update({ used_at: nowIso })
    .eq('user_id', input.userId)
    .is('used_at', null);

  const { error } = await admin.from('password_reset_tokens').insert({
    user_id: input.userId,
    tenant_id: input.tenantId,
    email: input.email,
    token_hash: tokenHash,
    otp_hash: otpHash,
    expires_at: expiresAt,
    otp_expires_at: otpExpiresAt,
    otp_attempt_count: 0,
    otp_max_attempts: OTP_MAX_ATTEMPTS,
    last_sent_at: nowIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, otp, expiresAt, otpExpiresAt };
}

export async function verifyPasswordResetOtp(input: {
  email: string;
  otp: string;
}): Promise<VerifyOtpResult> {
  const admin = getSupabaseAdminClient();
  const email = input.email.trim().toLowerCase();
  const otpHash = hashValue(input.otp.trim());

  const { data: record, error: fetchError } = await admin
    .from('password_reset_tokens')
    .select('id,user_id,email,tenant_id,token_hash,otp_hash,otp_attempt_count,otp_max_attempts,otp_expires_at,expires_at,used_at,otp_verified_at')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<TokenRecord>();

  if (fetchError || !record || !record.otp_hash) {
    return { ok: false, reason: 'invalid' };
  }

  if (record.used_at) {
    return { ok: false, reason: 'used' };
  }

  const otpExpiry = record.otp_expires_at ? new Date(record.otp_expires_at).getTime() : new Date(record.expires_at).getTime();
  if (otpExpiry < Date.now()) {
    return { ok: false, reason: 'expired' };
  }

  if (record.otp_attempt_count >= (record.otp_max_attempts || OTP_MAX_ATTEMPTS)) {
    return { ok: false, reason: 'max_attempts' };
  }

  if (record.otp_hash !== otpHash) {
    const nextAttemptCount = record.otp_attempt_count + 1;
    await admin
      .from('password_reset_tokens')
      .update({ otp_attempt_count: nextAttemptCount })
      .eq('id', record.id)
      .is('used_at', null);

    if (nextAttemptCount >= (record.otp_max_attempts || OTP_MAX_ATTEMPTS)) {
      return { ok: false, reason: 'max_attempts' };
    }
    return { ok: false, reason: 'invalid' };
  }

  const nowIso = new Date().toISOString();
  await admin
    .from('password_reset_tokens')
    .update({ otp_verified_at: nowIso })
    .eq('id', record.id)
    .is('used_at', null);

  return {
    ok: true,
    userId: record.user_id,
    tenantId: record.tenant_id,
    email: record.email,
    token: record.token_hash,
  };
}

export async function consumePasswordResetToken(input: {
  rawToken?: string;
  email?: string;
  otp?: string;
}): Promise<ConsumeTokenResult> {
  const admin = getSupabaseAdminClient();

  let record: TokenRecord | null = null;

  if (input.rawToken) {
    const tokenHash = hashValue(input.rawToken.trim());
    const { data, error } = await admin
      .from('password_reset_tokens')
      .select('id,user_id,email,tenant_id,expires_at,used_at,otp_verified_at')
      .eq('token_hash', tokenHash)
      .maybeSingle<TokenRecord>();

    if (error || !data) {
      return { ok: false, reason: 'invalid' };
    }
    record = data;
  } else if (input.email && input.otp) {
    const email = input.email.trim().toLowerCase();
    const otpHash = hashValue(input.otp.trim());

    const { data, error } = await admin
      .from('password_reset_tokens')
      .select('id,user_id,email,tenant_id,expires_at,otp_expires_at,used_at,otp_hash,otp_attempt_count,otp_max_attempts,otp_verified_at')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<TokenRecord>();

    if (error || !data || !data.otp_hash) {
      return { ok: false, reason: 'invalid' };
    }

    if (data.used_at) return { ok: false, reason: 'used' };
    
    const otpExpiry = data.otp_expires_at ? new Date(data.otp_expires_at).getTime() : new Date(data.expires_at).getTime();
    if (otpExpiry < Date.now()) return { ok: false, reason: 'expired' };

    if (data.otp_attempt_count >= (data.otp_max_attempts || OTP_MAX_ATTEMPTS)) {
      return { ok: false, reason: 'max_attempts' };
    }

    if (data.otp_hash !== otpHash && !data.otp_verified_at) {
      const nextAttemptCount = data.otp_attempt_count + 1;
      await admin.from('password_reset_tokens').update({ otp_attempt_count: nextAttemptCount }).eq('id', data.id);
      return { ok: false, reason: 'invalid' };
    }

    record = data;
  } else {
    return { ok: false, reason: 'invalid' };
  }

  if (!record) return { ok: false, reason: 'invalid' };
  if (record.used_at) return { ok: false, reason: 'used' };
  if (new Date(record.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };

  const usedAt = new Date().toISOString();
  const { data: updatedRows, error: consumeError } = await admin
    .from('password_reset_tokens')
    .update({ used_at: usedAt })
    .eq('id', record.id)
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

export async function checkPasswordResetCooldown(
  userId: string
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const admin = getSupabaseAdminClient();
  const { data: latest } = await admin
    .from('password_reset_tokens')
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

export function buildPasswordResetLink(token: string): string {
  const baseUrl = process.env.FRONTEND_URL || getEmailVerificationEnv().appBaseUrl;
  return `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetMessage(input: {
  toEmail: string;
  fullName: string;
  otpCode: string;
  resetLink: string;
}): Promise<void> {
  const subject = 'Reset your eSerbisyo password';
  const html = [
    `<p>Hello ${input.fullName || 'Resident'},</p>`,
    '<p>We received a request to reset your eSerbisyo password. Use the code below to reset your password:</p>',
    '<div style="margin: 20px 0; padding: 15px; background: #f4f6f8; border-radius: 8px; text-align: center;">',
    `<p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">Your password reset code is:</p>`,
    `<p style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 0.2em; color: #1e293b;">${input.otpCode}</p>`,
    `<p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">This code expires in 5 minutes.</p>`,
    '</div>',
    '<p style="margin-top: 20px; font-size: 13px; color: #64748b;">If you did not request this, you can safely ignore this email.</p>',
  ].join('');

  const text = [
    `Hello ${input.fullName || 'Resident'},`,
    'We received a request to reset your eSerbisyo password.',
    '',
    `Your password reset code is: ${input.otpCode}`,
    'This code expires in 5 minutes.',
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n');

  await sendEmail({
    to: input.toEmail,
    subject,
    html,
    text,
  });
}

export async function getActiveProfileByEmail(email: string): Promise<ActiveProfileRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id,tenant_id,full_name,is_deleted')
    .eq('email', email)
    .maybeSingle<{ id: string; tenant_id: string; full_name: string | null; is_deleted: boolean }>();

  if (!profile || profile.is_deleted) {
    return null;
  }

  return {
    id: profile.id,
    tenant_id: profile.tenant_id,
    full_name: profile.full_name,
  };
}
