import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/api/contracts';
import { assertCan } from '@/lib/auth/permissions';
import { requireAuth } from '@/lib/auth/request-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/api/audit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  const admin = getSupabaseAdminClient();
  let query = admin
    .from('document_requests')
    .select('id,reference_number,resident_id,type_id,selected_type_label,purpose,amount,status,admin_decision_reason,processing_decline_reason,processed_by,feedback_prompted_at,created_at,updated_at')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false });

  if (auth.role === 'resident') query = query.eq('resident_id', auth.userId);
  const status = request.nextUrl.searchParams.get('status');
  if (status) query = query.eq('status', status);

  const { data, error } = await query.limit(200);
  if (error) return fail('INTERNAL_ERROR', error.message, 500);
  return ok({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof Response) return auth;

  try {
    assertCan(auth.role, 'submit_requests');
  } catch {
    return fail('AUTH_FORBIDDEN', 'Resident access required', 403);
  }

  const body = (await request.json().catch(() => null)) as {
    documentTypeId: string;
    purpose: string;
    notes?: string;
    selectedTypeLabel?: string;
  } | null;
  if (!body?.documentTypeId || !body.purpose) {
    return fail('VALIDATION_ERROR', 'documentTypeId and purpose are required', 400);
  }

  const admin = getSupabaseAdminClient();
  const { data: type } = await admin
    .from('document_types')
    .select('id,price')
    .eq('id', body.documentTypeId)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle();
  if (!type) return fail('RESOURCE_NOT_FOUND', 'Document type not found', 404);

  const { data, error } = await admin
    .from('document_requests')
    .insert({
      tenant_id: auth.tenantId,
      resident_id: auth.userId,
      type_id: body.documentTypeId,
      selected_type_label: body.selectedTypeLabel?.trim() || null,
      purpose: body.notes ? `${body.purpose}\n\n${body.notes}` : body.purpose,
      amount: type.price,
      status: 'pending',
    })
    .select('*')
    .single();
  if (error || !data) return fail('INTERNAL_ERROR', error?.message ?? 'Unable to create request', 500);

  await writeAuditLog({
    tenantId: auth.tenantId,
    actorId: auth.userId,
    actorRole: auth.role,
    action: 'document_requests.create',
    targetId: data.id,
  });
  return ok(data, { status: 201 });
}
