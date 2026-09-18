begin;

do $$
declare
  rec record;
begin
  for rec in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.reservations'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%resource%'
  loop
    execute format('alter table public.reservations drop constraint %I', rec.conname);
  end loop;
end $$;

alter table public.reservations
add constraint reservations_resource_check
check (resource in ('barangay_hall', 'covered_court', 'equipment', 'service_vehicle'));

commit;
