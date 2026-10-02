begin;

alter table public.census_records
  drop constraint if exists census_records_ownership_status_check,
  drop constraint if exists census_records_residency_classification_check,
  drop constraint if exists census_records_permanent_resident_years_check,
  drop constraint if exists census_records_residency_by_ownership_check;

update public.census_records
set ownership_status = case
  when lower(trim(coalesce(ownership_status, ''))) in ('rented', 'shared') then 'rented'
  else 'owned'
end;

update public.census_records
set residency_classification = case
  when lower(trim(coalesce(residency_classification, ''))) in ('owner') then 'owner'
  when lower(trim(coalesce(residency_classification, ''))) in ('permanent_resident', 'permanent resident') then 'permanent_resident'
  when lower(trim(coalesce(residency_classification, ''))) in ('informal_settler', 'informal settler') then 'informal_settler'
  when lower(trim(coalesce(residency_classification, ''))) in ('tenant_renter', 'tenant/renter', 'tenant', 'renter') then 'tenant_renter'
  when lower(trim(coalesce(residency_classification, ''))) in ('boarder_lodger', 'boarder/lodger', 'boarder', 'lodger') then 'boarder_lodger'
  when lower(trim(coalesce(residency_classification, ''))) in ('temporary_resident', 'temporary resident') then 'temporary_resident'
  when ownership_status = 'owned' then 'owner'
  else 'tenant_renter'
end;

update public.census_records
set residency_classification = case
  when ownership_status = 'owned' then 'owner'
  else 'tenant_renter'
end
where (ownership_status = 'owned' and residency_classification not in ('owner', 'permanent_resident', 'informal_settler'))
   or (ownership_status = 'rented' and residency_classification not in ('tenant_renter', 'boarder_lodger', 'temporary_resident'));

alter table public.census_records
  add constraint census_records_ownership_status_check check (ownership_status in ('owned', 'rented')),
  add constraint census_records_residency_classification_check check (
    residency_classification in ('owner', 'permanent_resident', 'informal_settler', 'tenant_renter', 'boarder_lodger', 'temporary_resident')
  ),
  add constraint census_records_permanent_resident_years_check check (
    permanent_resident_years is null or permanent_resident_years >= 0
  ),
  add constraint census_records_residency_by_ownership_check check (
    (ownership_status = 'owned' and residency_classification in ('owner', 'permanent_resident', 'informal_settler'))
    or (ownership_status = 'rented' and residency_classification in ('tenant_renter', 'boarder_lodger', 'temporary_resident'))
  );

commit;