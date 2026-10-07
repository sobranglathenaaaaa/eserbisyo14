-- Migration: add missing workflow columns to incident_reports
-- Columns required by the POST /api/v1/incidents route that were not yet
-- added via a prior migration.

alter table public.incident_reports
  add column if not exists track_type           text not null default 'incident',
  add column if not exists desired_action       text not null default 'none',
  add column if not exists relationship_to_respondent text,
  add column if not exists street_name         text,
  add column if not exists specific_location   text,
  add column if not exists parties             jsonb not null default '[]'::jsonb,
  add column if not exists action_log          jsonb,
  add column if not exists proceedings         jsonb not null default '[]'::jsonb,
  add column if not exists cfa                 jsonb,
  add column if not exists pnp_referral        jsonb;

-- Back-fill existing rows: incidents and blotters that predate the column
-- get sensible defaults based on `kind`.
update public.incident_reports
  set
    track_type     = case
                       when lower(kind) = 'community concern' then 'community_concern'
                       else 'incident'
                     end,
    desired_action = case
                       when lower(kind) = 'blotter' then 'request_meeting'
                       else 'none'
                     end
  where track_type = 'incident';   -- only update rows that still have the default
