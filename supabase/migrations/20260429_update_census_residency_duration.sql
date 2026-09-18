begin;

alter table public.census_records
  add column if not exists years_of_residence_months integer;

alter table public.census_records
  drop constraint if exists census_records_residency_classification_check,
  drop constraint if exists census_records_permanent_resident_years_check,
  drop constraint if exists census_records_residency_by_ownership_check,
  drop constraint if exists census_records_residence_length_check;

update public.census_records
set residency_classification = case
  when residency_classification = 'temporary_resident' then 'temporary_resident'
  else 'permanent_resident'
end;

update public.census_records
set permanent_resident_years = 0
where permanent_resident_years is null or permanent_resident_years < 0;

update public.census_records
set years_of_residence_months = 0
where years_of_residence_months is null
   or years_of_residence_months < 0
   or years_of_residence_months > 11;

update public.census_records
set years_of_residence_months = 1
where coalesce(permanent_resident_years, 0) = 0
  and coalesce(years_of_residence_months, 0) = 0;

alter table public.census_records
  add constraint census_records_residency_classification_check check (
    residency_classification in ('permanent_resident', 'temporary_resident')
  ),
  add constraint census_records_permanent_resident_years_check check (
    permanent_resident_years is null or permanent_resident_years >= 0
  ),
  add constraint census_records_years_of_residence_months_check check (
    years_of_residence_months is null or (years_of_residence_months >= 0 and years_of_residence_months <= 11)
  ),
  add constraint census_records_residence_length_check check (
    coalesce(permanent_resident_years, 0) + coalesce(years_of_residence_months, 0) > 0
  );

commit;
