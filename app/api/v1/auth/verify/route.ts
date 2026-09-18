import { NextRequest, NextResponse } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { verifyEmailVerificationOtp } from '@/lib/auth/email-verification';

type VerifyPayload = { email: string; otp: string };

async function completeVerification(email: string, otp: string) {
  const result = await verifyEmailVerificationOtp({ email, otp });
  if (!result.ok) {
    return result;
  }

  const admin = getSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from('profiles')
    .update({ is_verified: true })
    .eq('id', result.userId)
    .select('approval_status')
    .single<{
      approval_status:
      | 'pending_staff_review'
      | 'staff_forwarded_to_admin'
      | 'staff_rejected'
      | 'admin_approved'
      | 'admin_rejected';
    }>();

  if (error) {
    throw new Error(error.message);
  }

  return {
    ...result,
    approvalStatus: profile?.approval_status ?? 'pending_staff_review',
  };
}

function redirectToVerifyPage(request: NextRequest, params: Record<string, string>) {
  const url = request.nextUrl.clone();
  url.pathname = '/verify-email';
  url.search = '';

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  // OTP-only verification flow: legacy magic links no longer verify accounts.
  return redirectToVerifyPage(request, { legacy: '1' });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as VerifyPayload | null;
  const email = body?.email?.trim().toLowerCase();
  const otp = body?.otp?.trim();
  if (!email || !otp) {
    return fail('VALIDATION_ERROR', 'Email and verification code are required', 400);
  }

  try {
    const result = await completeVerification(email, otp);
    if (!result.ok) {
      if (result.reason === 'expired') {
        return fail('AUTH_UNAUTHORIZED', 'Verification code has expired. Please request a new code.', 401, { reason: result.reason });
      }
      if (result.reason === 'max_attempts') {
        return fail(
          'AUTH_UNAUTHORIZED',
          'You have reached the maximum verification attempts. Please request a new code.',
          401,
          { reason: result.reason }
        );
      }
      return fail('AUTH_UNAUTHORIZED', 'Invalid or already used verification code.', 401, { reason: result.reason });
    }

    return ok({ verified: true, approvalStatus: result.approvalStatus, email });
  } catch (error) {
    return fail('INTERNAL_ERROR', error instanceof Error ? error.message : 'Unable to verify account.', 500);
  }
}
