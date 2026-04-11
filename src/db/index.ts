import type postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { createPgClient } from './client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Reuse a single client across hot reloads in dev.
const globalForSql = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

export const sql = globalForSql.__sql ?? createPgClient(connectionString);

if (process.env.NODE_ENV !== 'production') {
  globalForSql.__sql = sql;
}

export const db = drizzle(sql, { schema });
export { schema };
