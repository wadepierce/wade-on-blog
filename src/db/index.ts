import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Reuse a single client across hot reloads in dev.
const globalForSql = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

export const sql =
  globalForSql.__sql ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForSql.__sql = sql;
}

export const db = drizzle(sql, { schema });
export { schema };
