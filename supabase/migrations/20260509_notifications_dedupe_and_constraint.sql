-- Migration: remove duplicate notifications, add unique index, and safe insert function
begin;

-- Remove exact duplicates keeping the most recent per (tenant_id, user_id, event_key, coalesce(entity_id, ''))
with deduped as (
  select id,
         row_number() over (partition by tenant_id, user_id, event_key, coalesce(entity_id, '') order by created_at desc) as row_num
  from public.notifications
)
delete from public.notifications
where id in (select id from deduped where row_num > 1);

-- Create a unique index that treats NULL entity_id as empty string so we can dedupe broadcasts
create unique index if not exists idx_notifications_unique_event_entity on public.notifications (
  tenant_id,
  user_id,
  event_key,
  coalesce(entity_id, '')
);

-- Create a server-side helper to insert a notification only if not recently created
create or replace function public.insert_notification_if_not_exists(
  p_tenant_id uuid,
  p_user_id uuid,
  p_title text,
  p_message text,
  p_type notification_type,
  p_priority text,
  p_event_key text,
  p_entity_type text,
  p_entity_id text,
  p_action_href text,
  p_dedupe_window_minutes integer default 5
) returns void language plpgsql security definer as $$
begin
  insert into public.notifications (tenant_id, user_id, title, message, type, priority, event_key, entity_type, entity_id, action_href)
  select p_tenant_id, p_user_id, p_title, p_message, p_type, p_priority, p_event_key, p_entity_type, p_entity_id, p_action_href
  where not exists (
    select 1 from public.notifications n
    where n.tenant_id = p_tenant_id
      and n.user_id = p_user_id
      and n.event_key = p_event_key
      and coalesce(n.entity_id, '') = coalesce(p_entity_id, '')
      and n.created_at > (now() - (p_dedupe_window_minutes || ' minutes')::interval)
  );
exception when unique_violation then
  -- Ignore unique constraint race conditions
  null;
end;
$$;

commit;
