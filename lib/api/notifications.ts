import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export type NotificationPriority = 'info' | 'warning' | 'urgent';
export type NotificationEventKey =
  | 'document.status_changed'
  | 'document.staff_reviewed'
  | 'document.approved'
  | 'document.ready_for_pickup'
  | 'document.declined'
  | 'document.cancelled'
  | 'document.completed'
  | 'medicine.status_changed'
  | 'queue.status_changed'
  | 'checkup_appointment.status_changed'
  | 'incident.status_changed'
  | 'reservation.status_changed'
  | 'reservation.submitted'
  | 'reservation.approved'
  | 'reservation.declined'
  | 'reservation.cancelled'
  | 'reservation.ready_for_pickup'
  | 'reservation.returned'
  | 'reservation.completed'
  | 'reservation.return_reminder'
  | 'announcement.published';

type NotificationEntityType =
  | 'document_request'
  | 'medicine_request'
  | 'queue_entry'
  | 'checkup_appointment'
  | 'incident_report'
  | 'reservation'
  | 'announcement';
type NotificationType = 'account' | 'request' | 'report' | 'system';

type NotifyResidentInput = {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  eventKey: NotificationEventKey;
  entityType?: NotificationEntityType;
  entityId?: string;
  actionHref?: string;
  dedupeWindowMinutes?: number;
};

const DEFAULT_DEDUPE_WINDOW_MINUTES = 5;

function dedupeThresholdIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

export async function notifyResident(input: NotifyResidentInput) {
  const admin = getSupabaseAdminClient();
  const windowMinutes = input.dedupeWindowMinutes ?? DEFAULT_DEDUPE_WINDOW_MINUTES;
  try {
    // Prefer calling a DB-side RPC that enforces deduplication atomically.
    const { error } = await admin.rpc('insert_notification_if_not_exists', {
      p_tenant_id: input.tenantId,
      p_user_id: input.userId,
      p_title: input.title,
      p_message: input.message,
      p_type: input.type,
      p_priority: input.priority,
      p_event_key: input.eventKey,
      p_entity_type: input.entityType ?? null,
      p_entity_id: input.entityId ?? null,
      p_action_href: input.actionHref ?? null,
      p_dedupe_window_minutes: windowMinutes,
    });

    if (error) {
      // Fallback to the previous client-side insert logic for environments
      // where the RPC/migration hasn't been applied yet.
      console.warn('[notifications] rpc_insert_failed_falling_back', { message: error.message });

      const createdAfter = dedupeThresholdIso(windowMinutes);
      let dedupeQuery = admin
        .from('notifications')
        .select('id')
        .eq('tenant_id', input.tenantId)
        .eq('user_id', input.userId)
        .eq('event_key', input.eventKey)
        .gt('created_at', createdAfter)
        .limit(1);

      if (input.entityId) {
        dedupeQuery = dedupeQuery.eq('entity_id', input.entityId);
      } else {
        dedupeQuery = dedupeQuery.is('entity_id', null);
      }

      const { data: existing, error: dedupeError } = await dedupeQuery.maybeSingle();
      if (dedupeError) {
        console.error('[notifications] dedupe_check_failed', {
          tenantId: input.tenantId,
          userId: input.userId,
          eventKey: input.eventKey,
          message: dedupeError.message,
        });
      }
      if (existing?.id) return;

      const { error: insertError } = await admin.from('notifications').insert({
        tenant_id: input.tenantId,
        user_id: input.userId,
        title: input.title,
        message: input.message,
        type: input.type,
        priority: input.priority,
        event_key: input.eventKey,
        entity_type: input.entityType ?? null,
        entity_id: input.entityId ?? null,
        action_href: input.actionHref ?? null,
      });

      if (insertError) {
        console.error('[notifications] insert_failed', {
          tenantId: input.tenantId,
          userId: input.userId,
          eventKey: input.eventKey,
          message: insertError.message,
        });
      }
      return;
    }

    console.info('[notifications] inserted_rpc', {
      tenantId: input.tenantId,
      userId: input.userId,
      eventKey: input.eventKey,
      priority: input.priority,
      entityId: input.entityId ?? null,
    });
  } catch (error) {
    console.error('[notifications] unexpected_error', {
      tenantId: input.tenantId,
      userId: input.userId,
      eventKey: input.eventKey,
      message: error instanceof Error ? error.message : 'Unknown notification error',
    });
  }
}

