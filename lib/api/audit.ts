import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import type { PermissionRole } from '@/lib/auth/permissions';

export async function writeAuditLog(input: {
  tenantId: string;
  actorId: string;
  actorRole: PermissionRole;
  action: string;
  targetId?: string;
  context?: unknown;
}) {
  const admin = getSupabaseAdminClient();
  await admin.from('audit_logs').insert({
    tenant_id: input.tenantId,
    action: input.action,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    target_id: input.targetId ?? null,
    context: input.context ? JSON.stringify(input.context) : null,
  });
}

