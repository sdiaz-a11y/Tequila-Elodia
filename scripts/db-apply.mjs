// Applies supabase/migrations/*.sql in order, once each. Uses DIRECT_URL from the root .env.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(path.join(root, '.env'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const client = new pg.Client({ connectionString: env.DIRECT_URL });
await client.connect();
try {
  await client.query(
    'create table if not exists public._migrations (name text primary key, applied_at timestamptz not null default now())',
  );
  await client.query('alter table public._migrations enable row level security');
  await client.query('revoke all on public._migrations from anon, authenticated');
  const done = new Set(
    (await client.query('select name from public._migrations')).rows.map((r) => r.name),
  );
  const dir = path.join(root, 'supabase', 'migrations');
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    if (done.has(file)) continue;
    await client.query('begin');
    try {
      await client.query(readFileSync(path.join(dir, file), 'utf8'));
      await client.query('insert into public._migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log('applied', file);
    } catch (e) {
      await client.query('rollback');
      throw e;
    }
  }
  console.log('database is up to date');
} finally {
  await client.end();
}
