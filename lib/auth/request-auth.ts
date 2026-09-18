import { NextRequest } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { fail } from '@/lib/api/contracts';
import type { PermissionRole } from './permissions';

type DbProfile = {
  id: string;
  tenant_id: string;
  full_name: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  civil_status: string | null;
  citizenship: string | null;
  birthdate: string | null;
  address: string | null;
  address_line: string | null;
  province: string | null;
  city: string | null;
  barangay: string | null;
  phone: string | null;
  id_type: string | null;
  id_number: string | null;
  id_file_name: string | null;
  id_file_path: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  email: string;
  role: string;
  is_deleted: boolean;
  is_verified: boolean;
  approval_status:
    | 'pending_staff_review'
    | 'staff_forwarded_to_admin'
    | 'staff_rejected'
    | 'admin_approved'
    | 'admin_rejected';
  staff_reviewed_by: string | null;
  staff_reviewed_at: string | null;
  staff_review_note: string | null;
  approval_reviewed_by: string | null;
  approval_reviewed_at: string | null;
  approval_review_note: string | null;
  locale: 'en' | 'fil';
};

export type AuthContext = {
  token: string;
  userId: string;
  tenantId: string;
  role: PermissionRole;
  profile: DbProfile;
};

function normalizePermissionRole(value: string): PermissionRole | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'admin' || normalized === 'staff' || normalized === 'resident') {
    return normalized;
  }
  return null;
}

function extractBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim();
  }

  return request.cookies.get('sb-access-token')?.value ?? null;
}

export async function getAuthContext(request: NextRequest): Promise<AuthContext | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const admin = getSupabaseAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user?.id) return null;

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(
      'id,tenant_id,full_name,first_name,middle_name,last_name,suffix,sex,civil_status,citizenship,birthdate,address,address_line,province,city,barangay,phone,id_type,id_number,id_file_name,id_file_path,terms_accepted_at,privacy_accepted_at,email,role,is_deleted,is_verified,approval_status,staff_reviewed_by,staff_reviewed_at,staff_review_note,approval_reviewed_by,approval_reviewed_at,approval_review_note,locale'
    )
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.is_deleted) return null;

  const normalizedRole = normalizePermissionRole(profile.role);
  if (!normalizedRole) return null;

  // Prevent resident API access before both checks pass.
  if (normalizedRole === 'resident') {
    if (!profile.is_verified) return null;
    if (profile.approval_status !== 'admin_approved') return null;
  }

  return {
    token,
    userId: authData.user.id,
    tenantId: profile.tenant_id,
    role: normalizedRole,
    profile: profile as DbProfile,
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthContext | Response> {
  const context = await getAuthContext(request);
  if (!context) {
    return fail('AUTH_UNAUTHORIZED', 'Authentication required', 401);
  }
  return context;
}
