// Backs up every table of the public schema (as JSON) and the files of the private storage buckets
// into backups/<timestamp>/ (ignored by git: it holds business data). Read-only against the database.
//   node scripts/db-backup.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readEnv = (file) =>
  Object.fromEntries(
    readFileSync(path.join(root, file), 'utf8')
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
  );
const rootEnv = readEnv('.env');
const webEnv = readEnv('apps/web/.env.local');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = path.join(root, 'backups', stamp);
mkdirSync(dir, { recursive: true });

const client = new pg.Client({ connectionString: rootEnv.DIRECT_URL });
await client.connect();
const summary = {};
try {
  await client.query('begin read only');
  const { rows: tables } = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1",
  );
  for (const { table_name: t } of tables) {
    const { rows } = await client.query(`select to_jsonb(x) as r from public."${t}" x`);
    writeFileSync(path.join(dir, `${t}.json`), JSON.stringify(rows.map((r) => r.r), null, 1));
    summary[t] = rows.length;
  }
  const { rows: objs } = await client.query(
    "select bucket_id, name, (metadata->>'size')::bigint as size from storage.objects order by 1, 2",
  );
  writeFileSync(path.join(dir, '_storage-objects.json'), JSON.stringify(objs, null, 1));
  summary['(archivos en storage)'] = objs.length;
  await client.query('commit');

  const bytes = objs.reduce((a, o) => a + Number(o.size ?? 0), 0);
  if (objs.length && bytes < 300 * 1024 * 1024) {
    const { createClient } = createRequire(path.join(root, 'apps/web/package.json'))('@supabase/supabase-js');
    const sb = createClient(webEnv.NEXT_PUBLIC_SUPABASE_URL, webEnv.SUPABASE_SECRET_KEY, {
      auth: { persistSession: false },
    });
    let saved = 0;
    for (const o of objs) {
      const { data, error } = await sb.storage.from(o.bucket_id).download(o.name);
      if (error || !data) {
        console.warn('no se pudo descargar', o.bucket_id, o.name);
        continue;
      }
      const dest = path.join(dir, 'storage', o.bucket_id, ...o.name.split('/'));
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await data.arrayBuffer()));
      saved++;
    }
    summary['(archivos descargados)'] = saved;
  }
} finally {
  await client.end();
}
writeFileSync(path.join(dir, '_resumen.json'), JSON.stringify({ hecho: new Date().toISOString(), filas: summary }, null, 1));
console.log(`Respaldo en ${dir}`);
for (const [k, v] of Object.entries(summary)) if (v) console.log(String(v).padStart(6), k);
