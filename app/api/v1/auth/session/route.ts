import { NextRequest } from 'next/server';
import { ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';

function jwtExpiresAt(token: string): string {
  try {
    const payload = token.split('.')[1] ?? '';
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as { exp?: number };
    if (!decoded.exp) return new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return new Date(decoded.exp * 1000).toISOString();
  } catch {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  return ok({
    userId: auth.userId,
    role: auth.role,
    profile: {
      id: auth.profile.id,
      fullName: auth.profile.full_name,
      email: auth.profile.email,
      locale: auth.profile.locale,
      isVerified: auth.profile.is_verified,
      approvalStatus: auth.profile.approval_status,
    },
    expiresAt: jwtExpiresAt(auth.token),
  });
}

