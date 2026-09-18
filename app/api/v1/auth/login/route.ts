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
  const { data, error } = await client.auth.signInWithPassword({
    email: body.email.trim().toLowerCase(),
    password: body.password,
  });
  if (error || !data.user?.id || !data.session) {
    return fail('AUTH_INVALID_CREDENTIALS', 'Invalid credentials', 401);
  }

  const admin = getSupabaseAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id,full_name,email,role,locale,is_verified,is_deleted,approval_status')
    .eq('id', data.user.id)
    .maybeSingle();
  if (!profile || profile.is_deleted) {
    return fail('AUTH_UNAUTHORIZED', 'Account not found', 401);
  }

  if (!profile.is_verified) {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Please verify your email before logging in using the verification code sent to your inbox.',
      403,
      { reason: 'email_unverified' }
    );
  }

  if (profile.approval_status === 'pending_staff_review') {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Your email is verified. Your registration is pending staff verification before admin approval.',
      403,
      { reason: 'pending_staff_review' }
    );
  }

  if (profile.approval_status === 'staff_forwarded_to_admin') {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Your registration is now with admin for final approval before you can log in.',
      403,
      { reason: 'pending_admin_approval' }
    );
  }

  if (profile.approval_status === 'staff_rejected') {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Your registration was not accepted after staff verification. Please contact the barangay office.',
      403,
      { reason: 'staff_rejected' }
    );
  }

  if (profile.approval_status === 'admin_rejected') {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Your registration was not approved by admin. Please contact the barangay office for assistance.',
      403,
      { reason: 'admin_rejected' }
    );
  }

  if (profile.approval_status !== 'admin_approved') {
    await client.auth.signOut();
    return fail(
      'AUTH_FORBIDDEN',
      'Your registration is still under review.',
      403,
      { reason: 'pending_admin_approval' }
    );
  }

  const response = ok({
    userId: data.user.id,
    role: profile.role,
    profile,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    },
  });

  response.cookies.set('x-user-id', data.user.id, {
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
  response.cookies.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
  response.cookies.set('sb-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return response;
}
