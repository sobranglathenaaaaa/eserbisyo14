begin;

do $$
begin
  if to_regclass('public.digital_ids') is not null then
    execute 'drop policy if exists "tenant_access" on public.digital_ids';
    execute 'drop index if exists public.idx_digital_ids_tenant_id';
    execute 'drop index if exists public.idx_digital_ids_resident_id';
    execute 'drop table if exists public.digital_ids';
  end if;
end
$$;

commit;
