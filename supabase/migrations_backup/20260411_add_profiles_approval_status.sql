do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approval_status'
  ) then
    alter table public.profiles
      add column approval_status text not null default 'approved';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approval_reviewed_by'
  ) then
    alter table public.profiles
      add column approval_reviewed_by uuid references public.profiles (id) on delete set null;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approval_reviewed_at'
  ) then
    alter table public.profiles
      add column approval_reviewed_at timestamptz;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'approval_review_note'
  ) then
    alter table public.profiles
      add column approval_review_note text;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_approval_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;

  update public.profiles
  set approval_status = 'approved'
  where approval_status is null;
end
$$;

create index if not exists idx_profiles_approval_status on public.profiles (approval_status);
