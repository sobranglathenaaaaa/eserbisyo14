'use client';

import { PGlite } from '@electric-sql/pglite';

let pgInstance: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

const DB_NAME = 'idb://eserbisyo_pglite_v1';

/**
 * Initializes and returns the in-browser PostgreSQL (PGlite) instance.
 * Uses IndexedDB as the persistent storage engine.
 */
export async function getBrowserPg(): Promise<PGlite> {
  if (typeof window === 'undefined') {
    throw new Error('PGlite in-browser database is only available on the client.');
  }

  if (pgInstance) {
    return pgInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const pg = new PGlite(DB_NAME);
      await pg.waitReady;

      // Initialize base offline tables
      await pg.exec(`
        CREATE TABLE IF NOT EXISTS offline_document_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          document_type TEXT,
          purpose TEXT,
          status TEXT DEFAULT 'pending_offline',
          payload JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          synced BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS offline_incidents (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          title TEXT,
          category TEXT,
          description TEXT,
          status TEXT DEFAULT 'pending_offline',
          payload JSONB,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          synced BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS cached_announcements (
          id TEXT PRIMARY KEY,
          title TEXT,
          content TEXT,
          category TEXT,
          published_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS cached_user_profile (
          id TEXT PRIMARY KEY,
          email TEXT,
          full_name TEXT,
          role TEXT,
          data JSONB,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );
      `);

      pgInstance = pg;
      return pg;
    } catch (err) {
      console.error('Failed to initialize in-browser PGlite database:', err);
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Run a parameterized SQL query on the local in-browser PostgreSQL database.
 */
export async function queryBrowserPg<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const pg = await getBrowserPg();
  const res = await pg.query<T>(sql, params);
  return res.rows;
}

/**
 * Executes raw multi-statement SQL on the in-browser PostgreSQL database.
 */
export async function execBrowserPg(sql: string): Promise<void> {
  const pg = await getBrowserPg();
  await pg.exec(sql);
}

/**
 * Insert or queue an offline document request directly into browser PostgreSQL.
 */
export async function insertOfflineDocumentRequest(request: {
  id: string;
  userId?: string;
  documentType: string;
  purpose: string;
  payload: any;
}) {
  const pg = await getBrowserPg();
  await pg.query(
    `INSERT INTO offline_document_requests (id, user_id, document_type, purpose, payload, status, synced)
     VALUES ($1, $2, $3, $4, $5, 'pending_offline', FALSE)
     ON CONFLICT (id) DO UPDATE SET
       payload = EXCLUDED.payload,
       purpose = EXCLUDED.purpose;`,
    [request.id, request.userId || null, request.documentType, request.purpose, JSON.stringify(request.payload)]
  );
}

/**
 * Insert or queue an offline incident report directly into browser PostgreSQL.
 */
export async function insertOfflineIncident(incident: {
  id: string;
  userId?: string;
  title: string;
  category: string;
  description: string;
  payload: any;
}) {
  const pg = await getBrowserPg();
  await pg.query(
    `INSERT INTO offline_incidents (id, user_id, title, category, description, payload, status, synced)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending_offline', FALSE)
     ON CONFLICT (id) DO UPDATE SET
       description = EXCLUDED.description,
       payload = EXCLUDED.payload;`,
    [
      incident.id,
      incident.userId || null,
      incident.title,
      incident.category,
      incident.description,
      JSON.stringify(incident.payload),
    ]
  );
}

/**
 * Syncs unsynced records from the browser PostgreSQL database to the remote Supabase API when online.
 */
export async function syncBrowserPgToSupabase(): Promise<{ syncedDocs: number; syncedIncidents: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { syncedDocs: 0, syncedIncidents: 0 };
  }

  const pg = await getBrowserPg();
  let syncedDocs = 0;
  let syncedIncidents = 0;

  // 1. Sync pending document requests
  const unsyncedDocs = await pg.query<{ id: string; payload: any }>(
    `SELECT id, payload FROM offline_document_requests WHERE synced = FALSE;`
  );

  for (const row of unsyncedDocs.rows) {
    try {
      const response = await fetch('/api/v1/document-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
      });

      if (response.ok) {
        await pg.query(`UPDATE offline_document_requests SET synced = TRUE, status = 'synced' WHERE id = $1;`, [row.id]);
        syncedDocs++;
      }
    } catch (e) {
      console.warn('Failed to sync offline doc request to Supabase:', e);
    }
  }

  // 2. Sync pending incidents
  const unsyncedIncidents = await pg.query<{ id: string; payload: any }>(
    `SELECT id, payload FROM offline_incidents WHERE synced = FALSE;`
  );

  for (const row of unsyncedIncidents.rows) {
    try {
      const response = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof row.payload === 'string' ? row.payload : JSON.stringify(row.payload),
      });

      if (response.ok) {
        await pg.query(`UPDATE offline_incidents SET synced = TRUE, status = 'synced' WHERE id = $1;`, [row.id]);
        syncedIncidents++;
      }
    } catch (e) {
      console.warn('Failed to sync offline incident to Supabase:', e);
    }
  }

  return { syncedDocs, syncedIncidents };
}
