import { Pool } from 'pg';

export const localPgPool = new Pool({
  connectionString: process.env.LOCAL_PG_URL || 'postgres://postgres:postgres@127.0.0.1:5432/eserbisyo',
});
