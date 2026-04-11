import postgres, { type Options, type PostgresType } from 'postgres';

/**
 * Build a postgres-js client configured for the current environment.
 *
 * Railway exposes Postgres in two ways:
 *   - The internal hostname `*.railway.internal` (IPv6, no SSL).
 *   - The public proxy `*.proxy.rlwy.net` / `*.rlwy.net` (TLS required, with
 *     a self-signed cert that Node won't validate by default).
 *
 * We pick a sane SSL setting based on the URL so the same code works in
 * local dev, Railway internal networking, and Railway's public proxy.
 */
export function createPgClient(
  connectionString: string,
  overrides: Options<Record<string, PostgresType>> = {},
) {
  const url = new URL(connectionString);
  const host = url.hostname;
  const isRailwayInternal = host.endsWith('.railway.internal');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const sslmode = url.searchParams.get('sslmode');

  let ssl: Options<Record<string, PostgresType>>['ssl'];
  if (sslmode === 'disable' || isLocal || isRailwayInternal) {
    ssl = false;
  } else {
    // Railway's public proxy and most managed Postgres providers use a
    // self-signed chain. Require TLS but skip cert validation — we still
    // get encryption in transit.
    ssl = { rejectUnauthorized: false };
  }

  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 30,
    max_lifetime: 60 * 30,
    ssl,
    ...overrides,
  });
}
