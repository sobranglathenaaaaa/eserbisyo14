import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as ChangePasswordPayload | null;
  const currentPassword = body?.currentPassword ?? '';
  const newPassword = body?.newPassword ?? '';

  if (!currentPassword || !newPassword) {
    return fail('VALIDATION_ERROR', 'Current password and new password are required.', 400);
  }
  if (newPassword.length < 8) {
    return fail('VALIDATION_ERROR', 'Password must be at least 8 characters.', 400);
  }
  if (newPassword === currentPassword) {
    return fail('VALIDATION_ERROR', 'New password must be different from current password.', 400);
  }

  const client = getSupabaseServerClient();
  const { error: verifyError } = await client.auth.signInWithPassword({
    email: auth.profile.email,
    password: currentPassword,
  });
  if (verifyError) {
    return fail('AUTH_INVALID_CREDENTIALS', 'Current password is incorrect.', 401);
  }

  const admin = getSupabaseAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(auth.userId, {
    password: newPassword,
  });
  if (updateError) {
    return fail('INTERNAL_ERROR', updateError.message, 500);
  }

  return ok({ changed: true });
}
