import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/request-auth';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

type OwnershipStatus = 'owned' | 'rented';
type ResidencyClassification =
  | 'owner'
  | 'permanent_resident'
  | 'informal_settler'
  | 'tenant_renter'
  | 'boarder_lodger'
  | 'temporary_resident';

const RESIDENCY_BY_OWNERSHIP: Record<OwnershipStatus, ResidencyClassification[]> = {
  owned: ['owner', 'permanent_resident', 'informal_settler'],
  rented: ['tenant_renter', 'boarder_lodger', 'temporary_resident'],
};

const ALLOWED_RESIDENCY_CLASSIFICATIONS = new Set<ResidencyClassification>([
  'owner',
  'permanent_resident',
  'informal_settler',
  'tenant_renter',
  'boarder_lodger',
  'temporary_resident',
]);

function isOwnershipStatus(value: unknown): value is OwnershipStatus {
  return value === 'owned' || value === 'rented';
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('census_records')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('updated_at', { ascending: false });
  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);

  const { data, error } = await query.limit(200);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;
  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as
    | {
      householdSize: number;
      minorsCount: number;
      ownershipStatus: OwnershipStatus;
      residencyClassification: ResidencyClassification;
      yearsOfResidenceYears?: number | null;
      yearsOfResidenceMonths?: number | null;
    }
    | null;
  if (!body || typeof body.householdSize !== 'number' || typeof body.minorsCount !== 'number' || !isOwnershipStatus(body.ownershipStatus)) {
    return fail('VALIDATION_ERROR', 'Invalid census payload', 400);
  }
  const residencyClassification = body.residencyClassification;
  if (typeof residencyClassification !== 'string' || !ALLOWED_RESIDENCY_CLASSIFICATIONS.has(residencyClassification)) {
    return fail('VALIDATION_ERROR', 'Invalid residency classification', 400);
  }
  if (!RESIDENCY_BY_OWNERSHIP[body.ownershipStatus].includes(residencyClassification)) {
    return fail('VALIDATION_ERROR', 'Residency classification does not match ownership status', 400);
  }
  const yearsOfResidenceYears =
    body.yearsOfResidenceYears === null || typeof body.yearsOfResidenceYears === 'undefined'
      ? undefined
      : Number(body.yearsOfResidenceYears);
  const yearsOfResidenceMonths =
    body.yearsOfResidenceMonths === null || typeof body.yearsOfResidenceMonths === 'undefined'
      ? undefined
      : Number(body.yearsOfResidenceMonths);

  if (!Number.isInteger(yearsOfResidenceYears) || Number(yearsOfResidenceYears) < 0) {
    return fail('VALIDATION_ERROR', 'Years of residence must be a whole number (0 or greater)', 400);
  }
  if (!Number.isInteger(yearsOfResidenceMonths) || Number(yearsOfResidenceMonths) < 0 || Number(yearsOfResidenceMonths) > 11) {
    return fail('VALIDATION_ERROR', 'Months of residence must be a whole number from 0 to 11', 400);
  }
  if (Number(yearsOfResidenceYears) === 0 && Number(yearsOfResidenceMonths) === 0) {
    return fail('VALIDATION_ERROR', 'Years/months of residence cannot both be zero', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('census_records')
    .upsert({
      resident_id: auth.userId,
      tenant_id: auth.tenantId,
      household_size: body.householdSize,
      minors_count: body.minorsCount,
      ownership_status: body.ownershipStatus,
      residency_classification: residencyClassification,
      permanent_resident_years: yearsOfResidenceYears,
      years_of_residence_months: yearsOfResidenceMonths,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to update census', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'census.upsert',
    targetId: auth.userId,
  });

  return ok(data);
}
