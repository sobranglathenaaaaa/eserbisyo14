// scripts/apply-incident-migration.mjs
// Run: node scripts/apply-incident-migration.mjs
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env / .env.local manually
function loadEnv() {
  const files = ['.env.local', '.env'];
  for (const file of files) {
    try {
      const content = readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    } catch { /* file doesn't exist, skip */ }
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env/.env.local');
  process.exit(1);
}

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const statements = [
  `alter table public.incident_reports add column if not exists track_type text not null default 'incident'`,
  `alter table public.incident_reports add column if not exists desired_action text not null default 'none'`,
  `alter table public.incident_reports add column if not exists relationship_to_respondent text`,
  `alter table public.incident_reports add column if not exists street_name text`,
  `alter table public.incident_reports add column if not exists specific_location text`,
  `alter table public.incident_reports add column if not exists parties jsonb not null default '[]'::jsonb`,
  `alter table public.incident_reports add column if not exists action_log jsonb`,
  `alter table public.incident_reports add column if not exists proceedings jsonb not null default '[]'::jsonb`,
  `alter table public.incident_reports add column if not exists cfa jsonb`,
  `alter table public.incident_reports add column if not exists pnp_referral jsonb`,
];

const backfill = `
  update public.incident_reports
  set
    track_type     = case when lower(kind) = 'community concern' then 'community_concern' else 'incident' end,
    desired_action = case when lower(kind) = 'blotter' then 'request_meeting' else 'none' end
  where track_type = 'incident'
`;

async function run() {
  let allOk = true;
  for (const sql of statements) {
    const { error } = await admin.rpc('exec_sql', { query: sql });
    if (error) {
      // Try REST fallback
      const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({ query: sql }),
      });
      if (!res.ok) {
        console.error(`❌ Failed: ${sql.slice(0, 80)}...`);
        console.error(`   Error: ${error?.message}`);
        allOk = false;
        continue;
      }
    }
    console.log(`✓  ${sql.slice(0, 80)}`);
  }

  // Backfill
  const { error: bfErr } = await admin.rpc('exec_sql', { query: backfill });
  if (bfErr) {
    console.warn(`⚠️  Backfill skipped (may be OK if table is empty): ${bfErr.message}`);
  } else {
    console.log('✓  Backfill: track_type / desired_action on existing rows');
  }

  if (allOk) {
    console.log('\n🎉 Migration applied successfully! incident_reports now has all required columns.');
    console.log('   You can now delete app/api/v1/run-incident-migration/route.ts');
  } else {
    console.log('\n⚠️  Some statements failed — exec_sql RPC may not be available.');
    console.log('   Please run supabase/migrations/20261001_add_incident_reports_workflow_columns.sql');
    console.log('   in Supabase Dashboard → SQL Editor.');
  }
}

run().catch(console.error);
