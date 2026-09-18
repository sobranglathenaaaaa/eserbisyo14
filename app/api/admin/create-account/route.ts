import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { UserRole } from '@/lib/types/models';
import { sendResendEmail } from '@/lib/email/resend';

type Payload = {
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  password: string;
  role: 'admin' | 'staff';
};

function getBearerToken(request: Request) {
  const authHeader = request.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length).trim();
}

function composeFullName(firstName: string, middleName: string | undefined, lastName: string) {
  return [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ');
}

async function resolveRoleFromToken(token: string): Promise<UserRole | null> {
  const supabase = getSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user?.id) return null;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
  return (profile?.role as UserRole | undefined) ?? null;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 });
  }

  const actorRole = await resolveRoleFromToken(token);
  if (actorRole !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const payload = (await request.json().catch(() => null)) as Payload | null;
  if (!payload) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!payload.firstName || !payload.lastName || !payload.email || !payload.password || !payload.role) {
    return NextResponse.json({ error: 'Missing required account fields.' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: payload.email.trim().toLowerCase(),
    password: payload.password,
    email_confirm: true,
  });

  if (createError || !created.user?.id) {
    return NextResponse.json({ error: createError?.message ?? 'Unable to create user account.' }, { status: 400 });
  }

  const fullName = composeFullName(payload.firstName, payload.middleName, payload.lastName);
  const { error: profileError } = await supabase.from('profiles').insert({
    id: created.user.id,
    full_name: fullName,
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    locale: 'en',
    is_deleted: false,
    is_verified: true,
    approval_status: 'admin_approved',
  });

  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  // Send notification email
  try {
    await sendResendEmail({
      to: payload.email.trim().toLowerCase(),
      subject: 'Account Created - eSerbisyo',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
          <h2 style="color: #1a202c; margin-bottom: 16px;">Welcome to eSerbisyo!</h2>
          <p style="color: #4a5568; line-height: 1.6;">Hello ${payload.firstName},</p>
          <p style="color: #4a5568; line-height: 1.6;">Your account has been created by an administrator. You can now log in to the portal using your email address and the temporary password provided to you.</p>
          <div style="margin: 24px 0; padding: 16px; background-color: #f7fafc; border-radius: 6px;">
            <p style="margin: 0; color: #718096; font-size: 14px;">Email: <strong>${payload.email.trim().toLowerCase()}</strong></p>
            <p style="margin: 4px 0 0 0; color: #718096; font-size: 14px;">Role: <strong>${payload.role.toUpperCase()}</strong></p>
          </div>
          <p style="color: #4a5568; line-height: 1.6;">Once logged in, it is highly recommended that you change your password for security purposes.</p>
          <p style="margin-top: 24px; color: #4a5568;">Best regards,<br/>The eSerbisyo Team</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error('Failed to send account creation email:', emailError);
    // We don't fail the request if email fails, as the account is already created
  }

  return NextResponse.json({
    ok: true,
    createdUser: {
      id: created.user.id,
      fullName,
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
    },
  });
}
