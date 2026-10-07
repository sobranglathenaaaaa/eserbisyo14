alter table public.profiles
  add column if not exists id_file_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resident-id-uploads',
  'resident-id-uploads',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "resident_id_uploads_service_role_all" on storage.objects;
create policy "resident_id_uploads_service_role_all" on storage.objects
  for all
  to service_role
  using (bucket_id = 'resident-id-uploads')
  with check (bucket_id = 'resident-id-uploads');

drop policy if exists "resident_id_uploads_authenticated_read_own" on storage.objects;
create policy "resident_id_uploads_authenticated_read_own" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'resident-id-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );