begin;

alter table public.notifications
  add column if not exists priority text not null default 'info' check (priority in ('info', 'warning', 'urgent')),
  add column if not exists event_key text not null default 'legacy.unknown',
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists action_href text;

create index if not exists idx_notifications_user_read_created
  on public.notifications (user_id, read, created_at desc);

create index if not exists idx_notifications_event_entity_created
  on public.notifications (user_id, event_key, entity_id, created_at desc);

commit;

