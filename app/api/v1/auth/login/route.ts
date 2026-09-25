import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

type LoginPayload = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as LoginPayload | null;
  if (!body?.email || !body?.password) {
    return fail('VALIDATION_ERROR', 'Email and password are required', 400);
  }

  const client = getSupabaseServerClient();
  let authUserId: string | null = null;
  let authAccessToken: string | null = null;
  let authRefreshToken: string | null = null;

  const { data, error } = await client.auth.signInWithPassword({
    email: body.email.trim().toLowerCase(),
    password: body.password,
  });

  if (!error && data.user?.id && data.session) {
    authUserId = data.user.id;
    authAccessToken = data.session.access_token;
    authRefreshToken = data.session.refresh_token;
  } else {
    // Offline / Local PostgreSQL fallback
    try {
      const { localPgPool } = await import('@/lib/supabase/local-pg');
      const res = await localPgPool.query(
        'SELECT id, role, is_deleted, is_verified, approval_status FROM public.profiles WHERE lower(email) = $1 LIMIT 1',
        [body.email.trim().toLowerCase()]
      );
      const localUser = res.rows[0];
      if (localUser && !localUser.is_deleted && localUser.approval_status === 'admin_approved') {
        authUserId = localUser.id;
        authAccessToken = 'local-offline-access-token-' + localUser.id;
        authRefreshToken = 'local-offline-refresh-token-' + localUser.id;
      }
    } catch (localErr) {
      console.warn('[login offline fallback error]:', localErr);
    }
  }

  if (!authUserId || !authAccessToken) {
    return fail('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  let profile: any = null;
  try {
    const admin = getSupabaseAdminClient();
    const { data: p } = await admin
      .from('profiles')
      .select('id,full_name,email,role,locale,is_verified,is_deleted,approval_status')
      .eq('id', authUserId)
      .maybeSingle();
    profile = p;
  } catch (err) {}

  if (!profile) {
    try {
      const { localPgPool } = await import('@/lib/supabase/local-pg');
      const res = await localPgPool.query(
        'SELECT id, full_name, email, role, locale, is_verified, is_deleted, approval_status FROM public.profiles WHERE id = $1 LIMIT 1',
        [authUserId]
      );
      profile = res.rows[0];
    } catch (localErr) {}
  }

  if (!profile || profile.is_deleted) {
    return fail('AUTH_UNAUTHORIZED', 'Account not found', 401);
  }

  if (!profile.is_verified) {
    try { await client.auth.signOut(); } catch {}
    return fail(
      'AUTH_FORBIDDEN',
      'Please verify your email before logging in using the verification code sent to your inbox.',
      403,
      { reason: 'email_unverified' }
    );
  }

  if (profile.approval_status !== 'admin_approved') {
    try { await client.auth.signOut(); } catch {}
    return fail(
      'AUTH_FORBIDDEN',
      'Your registration is still under review or not accepted.',
      403,
      { reason: 'pending_admin_approval' }
    );
  }

  const response = ok({
    userId: authUserId,
    role: profile.role,
    profile,
    session: {
      accessToken: authAccessToken,
      refreshToken: authRefreshToken ?? authAccessToken,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    },
  });

  response.cookies.set('x-user-id', authUserId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  response.cookies.set('x-user-role', profile.role, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  response.cookies.set('sb-access-token', authAccessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  response.cookies.set('sb-refresh-token', authRefreshToken ?? authAccessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return response;
}
