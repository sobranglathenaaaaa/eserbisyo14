import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getEmailVerificationEnv } from '@/lib/supabase/env';
import { sendResendEmail } from '@/lib/email/resend';

const TOKEN_TTL_MINUTES = 60;
const RESEND_COOLDOWN_SECONDS = 60;

type TokenRecord = {
  id: string;
  user_id: string;
  email: string;
  tenant_id: string;
  expires_at: string;
  used_at: string | null;
};

type ActiveProfileRecord = {
  id: string;
  tenant_id: string;
  full_name: string | null;
};

type ConsumeTokenResult =
  | { ok: true; userId: string; tenantId: string; email: string }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function createToken(): string {
  return randomBytes(32).toString('base64url');
}

export async function issuePasswordResetToken(input: {
  userId: string;
  email: string;
  tenantId: string;
}): Promise<{ token: string; expiresAt: string }> {
  const admin = getSupabaseAdminClient();
  const token = createToken();
  const tokenHash = hashToken(token);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();

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
    expires_at: expiresAt,
    last_sent_at: nowIso,
  });

  if (error) {
    throw new Error(error.message);
  }

  return { token, expiresAt };
}

export async function consumePasswordResetToken(rawToken: string): Promise<ConsumeTokenResult> {
  const admin = getSupabaseAdminClient();
  const tokenHash = hashToken(rawToken);

  const { data: record, error: fetchError } = await admin
    .from('password_reset_tokens')
    .select('id,user_id,email,tenant_id,expires_at,used_at')
    .eq('token_hash', tokenHash)
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
  const env = getEmailVerificationEnv();
  return `${env.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetMessage(input: {
  toEmail: string;
  fullName: string;
  resetLink: string;
}): Promise<void> {
  const subject = 'Reset your eSerbisyo password';
  const html = [
    `<p>Hello ${input.fullName || 'Resident'},</p>`,
    '<p>We received a request to reset your eSerbisyo password.</p>',
    `<p><a href="${input.resetLink}">Reset my password</a></p>`,
    '<p>This link expires in 60 minutes. If you did not request this, you can ignore this email.</p>',
  ].join('');
  const text = [
    `Hello ${input.fullName || 'Resident'},`,
    'We received a request to reset your eSerbisyo password.',
    `Reset link: ${input.resetLink}`,
    'This link expires in 60 minutes. If you did not request this, you can ignore this email.',
  ].join('\n');

  await sendResendEmail({
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
