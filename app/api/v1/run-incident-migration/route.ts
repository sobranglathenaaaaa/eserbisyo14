import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/**
 * One-shot migration endpoint – adds missing workflow columns to incident_reports.
 * Hit POST /api/v1/run-incident-migration once, then delete this file.
 */
export async function POST() {
  const admin = getSupabaseAdminClient();

  const sql = `
    alter table public.incident_reports
      add column if not exists track_type                 text not null default 'incident',
      add column if not exists desired_action             text not null default 'none',
      add column if not exists relationship_to_respondent text,
      add column if not exists street_name                text,
      add column if not exists specific_location          text,
      add column if not exists parties                    jsonb not null default '[]'::jsonb,
      add column if not exists action_log                 jsonb,
      add column if not exists proceedings                jsonb not null default '[]'::jsonb,
      add column if not exists cfa                        jsonb,
      add column if not exists pnp_referral               jsonb;

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
      where track_type = 'incident';
  `;

  // Try via rpc exec_sql
  const { error: rpcError } = await admin.rpc('exec_sql', { query: sql });

  if (!rpcError) {
    return NextResponse.json({ success: true, message: 'incident_reports migration applied via RPC.' });
  }

  // Fall back: raw REST SQL endpoint
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { success: false, rpcError: rpcError.message, error: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars' },
      { status: 500 }
    );
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '(no body)');
    return NextResponse.json(
      {
        success: false,
        note: 'RPC exec_sql is not available. Please run the migration manually in Supabase Dashboard → SQL Editor using the file: supabase/migrations/20261001_add_incident_reports_workflow_columns.sql',
        rpcError: rpcError.message,
        restError: text,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: 'incident_reports migration applied via REST SQL.' });
}
