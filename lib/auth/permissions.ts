export type PermissionRole = 'admin' | 'staff' | 'resident';

export type PermissionAction =
  | 'manage_users'
  | 'review_document_requests'
  | 'process_document_requests'
  | 'manage_announcements'
  | 'manage_medicines'
  | 'update_queue'
  | 'read_dashboard'
  | 'submit_requests'
  | 'read_own_data';

const roleCapabilities: Record<PermissionRole, Set<PermissionAction>> = {
  admin: new Set([
    'manage_users',
    'review_document_requests',
    'process_document_requests',
    'manage_announcements',
    'manage_medicines',
    'update_queue',
    'read_dashboard',
    'submit_requests',
    'read_own_data',
  ]),
  staff: new Set([
    'process_document_requests',
    'manage_announcements',
    'manage_medicines',
    'update_queue',
    'read_dashboard',
    'read_own_data',
  ]),
  resident: new Set(['submit_requests', 'read_own_data']),
};

export function assertRole(role: PermissionRole, allowed: PermissionRole[]): void {
  if (!allowed.includes(role)) {
    throw new Error('AUTH_FORBIDDEN');
  }
}

export function can(role: PermissionRole, action: PermissionAction): boolean {
  return roleCapabilities[role]?.has(action) ?? false;
}

export function assertCan(role: PermissionRole, action: PermissionAction): void {
  if (!can(role, action)) {
    throw new Error('AUTH_FORBIDDEN');
  }
}

export function canAccessUser(actorRole: PermissionRole, actorUserId: string, targetUserId: string): boolean {
  if (actorRole === 'admin') return true;
  return actorUserId === targetUserId;
}

export function requireTenant(actorTenantId: string, tenantId: string): void {
  if (actorTenantId !== tenantId) {
    throw new Error('AUTH_FORBIDDEN');
  }
}
