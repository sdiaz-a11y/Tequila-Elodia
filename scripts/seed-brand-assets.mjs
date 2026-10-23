// Uploads the official brand images from assets/brand/official/ to the private "brand" bucket and registers
// them as official assets. Idempotent. Run: node scripts/seed-brand-assets.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createClient } = createRequire(path.join(root, 'apps/web/package.json'))('@supabase/supabase-js');
const env = Object.fromEntries(
  readFileSync(path.join(root, 'apps/web/.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const ASSETS = [
  {
    file: 'elodia-botella.png',
    mime: 'image/png',
    title: 'Botella ELODIA Tequila Añejo 750 ml',
    kind: 'product',
    description: 'Imagen oficial de la botella (PNG con transparencia). No modificar ni alterar proporciones.',
    tags: ['botella', 'añejo', 'oficial'],
  },
  {
    file: 'elodia-caja-presentacion.jpeg',
    mime: 'image/jpeg',
    title: 'Caja de presentación · Edición Especial Conmemorativa 2026',
    kind: 'photo',
    description: 'Fotografía de referencia de la botella en su caja, en campo de agave al atardecer.',
    tags: ['caja', 'edición especial', 'oficial'],
  },
];

for (const a of ASSETS) {
  const storagePath = `oficial/${a.file}`;
  const body = readFileSync(path.join(root, 'assets/brand/official', a.file));
  const up = await supabase.storage.from('brand').upload(storagePath, body, { contentType: a.mime, upsert: true });
  if (up.error) throw new Error(`upload ${a.file}: ${up.error.message}`);
  const { error } = await supabase.from('brand_assets').upsert(
    {
      title: a.title,
      kind: a.kind,
      description: a.description,
      storage_path: storagePath,
      mime: a.mime,
      size_bytes: body.length,
      official: true,
      tags: a.tags,
    },
    { onConflict: 'storage_path' },
  );
  if (error) throw new Error(`register ${a.file}: ${error.message}`);
  console.log('official asset ready:', a.title);
}
