import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// The migrations folder needs to be resolvable in three environments:
//   1. `npm run dev` / `tsx src/db/migrate.ts` — source tree, next to this file
//   2. `node dist/server/entry.mjs` on Railway — Astro bundles this module into
//      dist/server, so `import.meta.url` no longer lives next to src/db/migrations.
//      We copy the folder into several dist locations during the build (see
//      nixpacks.toml) and try every plausible path at runtime.
// A folder only counts if it actually contains meta/_journal.json, which is
// what drizzle's migrator reads first.
function resolveMigrationsFolder(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cwd = process.cwd();
  const candidates = [
    path.resolve(here, 'migrations'),
    path.resolve(here, 'db/migrations'),
    path.resolve(cwd, 'dist/server/migrations'),
    path.resolve(cwd, 'dist/server/db/migrations'),
    path.resolve(cwd, 'src/db/migrations'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'meta', '_journal.json'))) {
      console.log(`[migrate] using migrations folder: ${candidate}`);
      return candidate;
    }
  }
  throw new Error(
    `migrations folder not found; tried:\n  ${candidates.join('\n  ')}`,
  );
}

export async function runMigrations() {
  const migrationsFolder = resolveMigrationsFolder();
  const client = postgres(connectionString!, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder });
  } finally {
    await client.end({ timeout: 5 });
  }
}

// Allow running from CLI: `tsx src/db/migrate.ts`
const isCli =
  import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url.endsWith(process.argv[1] ?? '');
if (isCli) {
  runMigrations()
    .then(() => {
      console.log('Migrations applied.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
