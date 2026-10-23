// Attacks the database directly with the public key, the way someone using the browser's dev tools would,
// and checks that the permission and approval rules hold. Creates and removes its own temporary users.
//   ADMIN_EMAIL=you@x.mx ADMIN_PW='...' node scripts/rls-check.mjs
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
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const pub = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PW) throw new Error('Set ADMIN_EMAIL and ADMIN_PW');

const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const out = [];
let failed = 0;
const t = (name, pass, detail = '') => {
  if (!pass) failed++;
  out.push(`${pass ? 'OK  ' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
};
const pw = `Prueba-${Math.random().toString(36).slice(2)}Xx9`;
const made = [];

async function asRole(role) {
  const email = `${role}-${Date.now().toString(36)}@elodia-test.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: pw,
    email_confirm: true,
    app_metadata: { role },
  });
  if (error) throw error;
  await admin.from('profiles').update({ role, name: role }).eq('id', data.user.id);
  made.push(data.user.id);
  const c = createClient(url, pub, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password: pw });
  if (s.error) throw s.error;
  return c;
}

const owner = createClient(url, pub, { auth: { persistSession: false } });
const so = await owner.auth.signInWithPassword({
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PW,
});
if (so.error) throw so.error;

try {
  // Anonymous visitors see nothing.
  const anon = createClient(url, pub, { auth: { persistSession: false } });
  for (const table of ['accounts', 'profiles', 'audit_log', 'content_items', 'brand_assets', 'products']) {
    const r = await anon.from(table).select('*').limit(1);
    t(`anonymous cannot read ${table}`, !r.data?.length, r.error?.code);
  }

  const collab = await asRole('collaborator');
  const marketing = await asRole('marketing');
  const sales = await asRole('salesperson');

  let r = await collab.from('tasks').insert({ title: 'rls-test' }).select('id');
  t('collaborator can create a task', !!r.data?.length, r.error?.code);
  const taskId = r.data?.[0]?.id;
  for (const [table, row] of [
    ['projects', { name: 'rls-test' }],
    ['products', { name: 'rls-test' }],
    ['campaigns', { name: 'rls-test' }],
    ['content_items', { title: 'rls-test' }],
    ['accounts', { name: 'rls-test' }],
  ]) {
    r = await collab.from(table).insert(row).select('id');
    t(`collaborator cannot create in ${table}`, !r.data?.length, r.error?.code);
  }
  r = await collab.from('brand_kit').update({ tone: 'hack' }).eq('id', 1).select('id');
  t('collaborator cannot edit the brand kit', !r.data?.length);
  r = await collab.from('audit_log').select('id').limit(1);
  t('collaborator cannot read the audit log', !r.data?.length);
  r = await collab.from('profiles').update({ role: 'tech_superadmin' }).neq('id', '00000000-0000-0000-0000-000000000000').select('id');
  t('collaborator cannot change anybody’s role', !r.data?.length);
  r = await collab.from('tasks').delete().eq('id', taskId).select('id');
  t('collaborator can delete a task they created', !!r.data?.length);

  r = await sales.from('projects').insert({ name: 'rls-test' }).select('id');
  t('salesperson cannot create a project', !r.data?.length, r.error?.code);
  r = await sales.from('accounts').insert({ name: 'rls-test' }).select('id');
  t('salesperson can create a company', !!r.data?.length, r.error?.code);
  const accId = r.data?.[0]?.id;
  r = await sales.from('accounts').delete().eq('id', accId).select('id');
  t('salesperson cannot delete a company', !r.data?.length);
  await admin.from('accounts').delete().eq('name', 'rls-test');

  r = await marketing.from('content_items').insert({ title: 'rls-approved', status: 'approved' }).select('id');
  t('marketing cannot create content already approved', !r.data?.length, r.error?.code);
  r = await marketing.from('content_items').insert({ title: 'rls-content', status: 'draft' }).select('id');
  const cid = r.data?.[0]?.id;
  t('marketing can create a draft', !!cid, r.error?.message);
  r = await marketing.from('content_items').update({ status: 'in_review' }).eq('id', cid).select('id');
  t('marketing can send content to review', !!r.data?.length, r.error?.message);
  r = await marketing.from('content_items').update({ status: 'approved', legal_checked: true }).eq('id', cid).select('id');
  t('marketing cannot approve (even forging legal_checked)', !r.data?.length, r.error?.code);
  r = await marketing.from('content_items').update({ legal_checked: true }).eq('id', cid).select('legal_checked');
  t('forging legal_checked without a status change does not stick', r.data?.[0]?.legal_checked === false, String(r.data?.[0]?.legal_checked));
  r = await marketing
    .from('brand_assets')
    .insert({ title: 'x', storage_path: 'uploads/rls-x', mime: 'image/png', size_bytes: 10, official: true })
    .select('id');
  t('marketing cannot register an official asset', !r.data?.length, r.error?.code);

  r = await owner.from('content_items').update({ status: 'approved' }).eq('id', cid).select('id');
  t('approval without the legal confirmation is refused', !r.data?.length, r.error?.message);
  r = await owner.from('content_items').update({ status: 'rejected' }).eq('id', cid).select('id');
  t('rejection without a reason is refused', !r.data?.length, r.error?.message);
  r = await owner.from('content_items').update({ status: 'approved', legal_checked: true }).eq('id', cid).select('status,reviewed_by');
  t('approval with the legal confirmation works and records the reviewer', r.data?.[0]?.status === 'approved' && !!r.data?.[0]?.reviewed_by, r.error?.message);
  r = await marketing.from('content_items').update({ review_comment: 'forjado', reviewed_by: null }).eq('id', cid).select('review_comment,reviewed_by');
  t('an editor cannot rewrite the review marks of approved content', r.data?.[0]?.review_comment !== 'forjado' && !!r.data?.[0]?.reviewed_by);
  r = await marketing.from('content_items').update({ copy: 'texto cambiado' }).eq('id', cid).select('status,legal_checked');
  t('editing approved content sends it back to review and clears the legal check', r.data?.[0]?.status === 'in_review' && r.data?.[0]?.legal_checked === false, JSON.stringify(r.data?.[0]));
  r = await marketing.from('content_items').update({ status: 'published' }).eq('id', cid).select('id');
  t('content in review cannot be marked as published', !r.data?.length, r.error?.code);

  // Finance: money is visible only to those who administer it.
  const finance = await asRole('finance');
  r = await finance.from('transactions').insert({ kind: 'expense', category: 'rls-test', amount: 100 }).select('id');
  t('finance can record a transaction', !!r.data?.length, r.error?.code);
  r = await finance.from('transactions').insert({ kind: 'expense', category: 'rls-test', amount: -5 }).select('id');
  t('a non-positive amount is refused by the database', !r.data?.length, r.error?.code);
  for (const [name, client] of [['collaborator', collab], ['salesperson', sales], ['marketing', marketing]]) {
    r = await client.from('transactions').select('id').limit(1);
    t(`${name} cannot read transactions`, !r.data?.length, r.error?.code);
    r = await client.from('transactions').insert({ kind: 'income', category: 'rls-test', amount: 1 }).select('id');
    t(`${name} cannot create transactions`, !r.data?.length, r.error?.code);
  }

  // Compliance documents: a person approves, never the editor.
  const ops = await asRole('operations');
  r = await ops.from('compliance_documents').insert({ title: 'rls-doc', status: 'approved' }).select('id');
  t('operations cannot create an already approved document', !r.data?.length, r.error?.code);
  r = await ops.from('compliance_documents').insert({ title: 'rls-doc', status: 'draft' }).select('id');
  const did = r.data?.[0]?.id;
  t('operations can register a document', !!did, r.error?.message);
  r = await ops.from('compliance_documents').update({ status: 'in_review' }).eq('id', did).select('id');
  t('operations can send it to review', !!r.data?.length);
  r = await ops.from('compliance_documents').update({ status: 'approved' }).eq('id', did).select('id');
  t('operations cannot approve their own document', !r.data?.length, r.error?.code);
  r = await marketing.from('compliance_documents').insert({ title: 'rls-doc' }).select('id');
  t('marketing cannot register compliance documents', !r.data?.length, r.error?.code);
  r = await owner.from('compliance_documents').update({ status: 'approved' }).eq('id', did).select('status,reviewed_by');
  t('management approval records the reviewer', r.data?.[0]?.status === 'approved' && !!r.data?.[0]?.reviewed_by, r.error?.message);
  r = await ops.from('compliance_documents').update({ expires_on: '2099-01-01' }).eq('id', did).select('status');
  t('changing an approved document sends it back to review', r.data?.[0]?.status === 'in_review', r.data?.[0]?.status);
} finally {
  await admin.from('transactions').delete().eq('category', 'rls-test');
  await admin.from('compliance_documents').delete().like('title', 'rls-%');
  await admin.from('content_items').delete().like('title', 'rls-%');
  await admin.from('tasks').delete().eq('title', 'rls-test');
  for (const id of made) await admin.auth.admin.deleteUser(id);
  console.log(out.join('\n'));
  console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
  process.exitCode = failed ? 1 : 0;
}
