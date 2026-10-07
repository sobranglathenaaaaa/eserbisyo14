alter table public.reservations
  add column if not exists time_slot text;

alter table public.ocr_jobs
  add column if not exists status text not null default 'processing',
  add column if not exists mime_type text,
  add column if not exists file_size_bytes integer,
  add column if not exists file_path text,
  add column if not exists model_name text,
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ocr_jobs_status_check'
  ) then
    alter table public.ocr_jobs
      add constraint ocr_jobs_status_check
      check (status in ('processing', 'completed', 'failed'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ocr-uploads',
  'ocr-uploads',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ocr_uploads_service_role_all" on storage.objects;
create policy "ocr_uploads_service_role_all" on storage.objects
  for all
  to service_role
  using (bucket_id = 'ocr-uploads')
  with check (bucket_id = 'ocr-uploads');

drop policy if exists "ocr_uploads_authenticated_read_own" on storage.objects;
create policy "ocr_uploads_authenticated_read_own" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'ocr-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
