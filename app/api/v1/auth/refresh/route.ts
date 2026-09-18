import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('sb-refresh-token')?.value;
  if (!refreshToken) {
    return fail('AUTH_UNAUTHORIZED', 'Authentication required', 401);
  }

  const client = getSupabaseServerClient();
  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session?.access_token || !data.session.refresh_token) {
    return fail('AUTH_UNAUTHORIZED', 'Authentication required', 401);
  }

  const response = ok({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at,
  });
  const isProduction = process.env.NODE_ENV === 'production';

  response.cookies.set('sb-access-token', data.session.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  });
  response.cookies.set('sb-refresh-token', data.session.refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/',
  });

  return response;
}
