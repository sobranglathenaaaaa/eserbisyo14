do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'staff_reviewed_by'
  ) then
    alter table public.profiles
      add column staff_reviewed_by uuid references public.profiles (id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'staff_reviewed_at'
  ) then
    alter table public.profiles
      add column staff_reviewed_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'staff_review_note'
  ) then
    alter table public.profiles
      add column staff_review_note text;
  end if;

  alter table public.profiles
    drop constraint if exists profiles_approval_status_check;

  update public.profiles
  set approval_status = case approval_status
    when 'approved' then 'admin_approved'
    when 'rejected' then 'admin_rejected'
    when 'pending' then 'pending_staff_review'
    else coalesce(approval_status, 'admin_approved')
  end;

  alter table public.profiles
    alter column approval_status set default 'admin_approved';

  alter table public.profiles
    add constraint profiles_approval_status_check
    check (approval_status in ('pending_staff_review', 'staff_forwarded_to_admin', 'staff_rejected', 'admin_approved', 'admin_rejected'));
end
$$;

create index if not exists idx_profiles_staff_reviewed_by on public.profiles (staff_reviewed_by);
create index if not exists idx_profiles_approval_status_stage on public.profiles (approval_status);
