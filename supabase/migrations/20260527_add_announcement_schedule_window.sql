alter table public.announcements
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

update public.announcements
set start_at = coalesce(start_at, created_at)
where start_at is null;

alter table public.announcements
  alter column start_at set not null,
  alter column start_at set default now();

alter table public.announcements
  drop constraint if exists announcements_schedule_window_check;

alter table public.announcements
  add constraint announcements_schedule_window_check
  check (end_at is null or end_at > start_at);

create index if not exists idx_announcements_schedule_window
  on public.announcements (tenant_id, start_at, end_at);
