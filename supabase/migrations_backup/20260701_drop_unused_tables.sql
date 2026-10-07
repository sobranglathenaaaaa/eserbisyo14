-- 20260701_drop_unused_tables.sql
-- Migration: Drop unused tables that are no longer needed in the application.
-- Tables: medicine, queue_entries, digital_ids, medicine_requests
-- This migration uses IF EXISTS and CASCADE to safely remove tables and dependent objects.

create or replace function public.drop_unused_tables() returns void language plpgsql as $$
begin
  -- Drop medicine_requests (if still present)
  execute 'drop table if exists public.medicine_requests cascade';
  -- Drop medicine table
  execute 'drop table if exists public.medicine cascade';
  -- Drop queue_entries table
  execute 'drop table if exists public.queue_entries cascade';
  -- Drop digital_ids table (may be singular or plural based on naming)
  execute 'drop table if exists public.digital_ids cascade';
  execute 'drop table if exists public.digital_id cascade';
end;
$$;

-- Call the function to perform the drops immediately within this migration
select public.drop_unused_tables();

-- Clean up the helper function
drop function if exists public.drop_unused_tables();
