-- Incident report kinds mirror tenant-managed incident categories, so they
-- must not be limited to a fixed set of values.
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select constraint_row.conname
    from pg_constraint as constraint_row
    join pg_attribute as column_row
      on column_row.attrelid = constraint_row.conrelid
     and column_row.attnum = any (constraint_row.conkey)
    where constraint_row.conrelid = 'public.incident_reports'::regclass
      and constraint_row.contype = 'c'
      and column_row.attname = 'kind'
  loop
    execute format(
      'alter table public.incident_reports drop constraint %I',
      constraint_name
    );
  end loop;
end;
$$;
