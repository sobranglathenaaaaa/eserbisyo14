begin;

do $$
declare
  rec record;
  next_constraint_def text;
begin
  for rec in
    select
      con.conname,
      con.conrelid::regclass as table_name,
      pg_get_constraintdef(con.oid) as constraint_def
    from pg_constraint con
    where con.contype = 'f'
      and con.confrelid = 'public.profiles'::regclass
  loop
    if position('ON DELETE CASCADE' in upper(rec.constraint_def)) = 0 then
      next_constraint_def := regexp_replace(
        rec.constraint_def,
        '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
        '',
        'i'
      );

      execute format('alter table %s drop constraint %I', rec.table_name, rec.conname);
      execute format(
        'alter table %s add constraint %I %s on delete cascade',
        rec.table_name,
        rec.conname,
        next_constraint_def
      );
    end if;
  end loop;
end $$;

commit;
