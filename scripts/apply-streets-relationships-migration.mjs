// scripts/apply-streets-relationships-migration.mjs
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

const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
  process.exit(1);
}

console.log(`📦 Project ref: ${projectRef}`);

const sql = readFileSync('supabase/migrations/20260429_barangay_streets_and_relationships.sql', 'utf8');

async function runViaMgmtApi() {
  if (!accessToken) {
    console.warn('⚠️  No SUPABASE_ACCESS_TOKEN - skipping Management API attempt');
    return false;
  }
  try {
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
  } catch (err) {
    console.warn('⚠️  Management API request error:', err.message);
    return false;
  }
}

async function runViaPostgRESTRpc() {
  try {
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
  } catch (err) {
    console.warn('⚠️  PostgREST RPC request error:', err.message);
    return false;
  }
}

async function main() {
  let ok = await runViaMgmtApi();
  if (!ok) ok = await runViaPostgRESTRpc();

  if (!ok) {
    console.log('\n⚠️  Automatic migration could not be run directly via API.');
    console.log('👉  Please run the migration SQL file in Supabase Dashboard → SQL Editor:');
    console.log('    supabase/migrations/20260429_barangay_streets_and_relationships.sql\n');
  } else {
    console.log('\n🎉 Done! barangay_streets and incident_relationships tables are now live in Supabase.');
  }
}

main().catch(console.error);
