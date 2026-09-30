// scripts/apply-incident-migration-v2.mjs
// Applies the migration using Supabase Management API (SQL editor endpoint)
import { readFileSync } from 'fs';

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
    } catch { /* skip */ }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Extract project ref from URL:  https://<ref>.supabase.co
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  process.exit(1);
}

console.log(`📦 Project ref: ${projectRef}`);

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
    track_type     = case when lower(kind) = 'community concern' then 'community_concern' else 'incident' end,
    desired_action = case when lower(kind) = 'blotter' then 'request_meeting' else 'none' end
  where track_type = 'incident';
`;

async function runViaMgmtApi() {
  if (!accessToken) {
    console.warn('⚠️  No SUPABASE_ACCESS_TOKEN - skipping Management API attempt');
    return false;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log('✅ Applied via Management API.');
    return true;
  }
  console.warn(`⚠️  Management API failed (${res.status}): ${text}`);
  return false;
}

async function runViaPostgRESTRpc() {
  // Supabase exposes pg_catalog.pg_query() on some plans via /rest/v1/rpc
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log('✅ Applied via PostgREST RPC.');
    return true;
  }
  console.warn(`⚠️  PostgREST RPC failed (${res.status}): ${text}`);
  return false;
}

async function main() {
  let ok = await runViaMgmtApi();
  if (!ok) ok = await runViaPostgRESTRpc();

  if (!ok) {
    console.log('\n⚠️  Automatic migration could not be applied.');
    console.log('👉  Please run the following SQL manually in Supabase Dashboard → SQL Editor:\n');
    console.log(sql);
    process.exit(1);
  }
  console.log('\n🎉 Done! incident_reports now has all required columns.');
  console.log('   You can delete: app/api/v1/run-incident-migration/route.ts');
  console.log('   You can delete: scripts/apply-incident-migration.mjs');
  console.log('   You can delete: scripts/apply-incident-migration-v2.mjs');
}

main().catch(console.error);
