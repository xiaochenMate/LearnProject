import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const tables = ['brain_teasers', 'idioms', 'poems', 'portal_favorites', 'portal_users', 'sanzijing_verses', 'vocab_categories', 'vocab_words', 'vocab_progress'];
if (process.stdin.isTTY) process.stdin.setRawMode(true);
const input = await new Promise((resolve, reject) => {
  process.stdin.once('data', bytes => { process.stdin.pause(); try { resolve(JSON.parse(bytes.toString())); } catch (error) { reject(error); } });
});
if (typeof input.databaseUrl !== 'string' || !input.databaseUrl.startsWith('postgres')) throw new Error('A server-side source connection is required on stdin.');
const url = new URL(input.databaseUrl);
if (!url.hostname.startsWith('ep-steep-silence-aeqfo43r')) throw new Error('Refusing an unexpected source database.');
const sql = neon(input.databaseUrl);
const queries = [
  sql("SELECT now()::text AS exported_at, current_database() AS database, txid_current_snapshot()::text AS snapshot"),
  sql("SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default,ordinal_position FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"),
  sql("SELECT c.relname AS table_name,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname"),
  sql("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname"),
  ...tables.map(table => sql(`SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id),'[]'::jsonb) AS rows FROM public."${table}" t`)),
];
console.log('Reading one consistent, read-only Neon snapshot. No source writes.');
const results = await sql.transaction(queries, { isolationLevel: 'RepeatableRead', readOnly: true, fetchOptions: { signal: AbortSignal.timeout(240000) } });
if (process.argv.includes('--verify-source')) {
  const latest = JSON.parse(await fs.readFile('.migration.local/latest-export.json', 'utf8'));
  const expected = JSON.parse(await fs.readFile(path.join(latest.directory, 'manifest.json'), 'utf8'));
  const checks = tables.map((table, index) => {
    const rows = results[index + 4][0].rows;
    const body = rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
    const hash = createHash('sha256').update(body).digest('hex');
    const before = expected.tables.find(item => item.table === table);
    return { table, rows: rows.length, unchanged: before?.rows === rows.length && before?.sha256 === hash };
  });
  const report = { checkedAt: results[0][0].exported_at, unchanged: checks.every(check => check.unchanged), tables: checks };
  await fs.writeFile(path.join(latest.directory, 'source-before-cutover.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
  if (!report.unchanged) process.exitCode = 1;
  process.exit();
}
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const directory = path.resolve('.migration.local', stamp);
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const writePrivate = (name, data) => fs.writeFile(path.join(directory, name), data, { mode: 0o600, flag: 'wx' });
await writePrivate('schema.json', JSON.stringify({ source: results[0][0], columns: results[1], constraints: results[2], indexes: results[3] }, null, 2));
const manifest = { source: { project: 'calm-heart-97492012', branch: 'br-plain-resonance-aeveb466', ...results[0][0] }, tables: [], totalRows: 0 };
for (const [index, table] of tables.entries()) {
  const rows = results[index + 4][0].rows;
  if (!Array.isArray(rows)) throw new Error(`Invalid export for ${table}`);
  const body = rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
  const sha256 = createHash('sha256').update(body).digest('hex');
  await writePrivate(`${table}.jsonl`, body);
  manifest.tables.push({ table, rows: rows.length, bytes: Buffer.byteLength(body), sha256 });
  manifest.totalRows += rows.length;
  console.log(`${table}: ${rows.length} rows, SHA-256 ${sha256}`);
}
await writePrivate('manifest.json', JSON.stringify(manifest, null, 2));
await fs.writeFile(path.resolve('.migration.local', 'latest-export.json'), JSON.stringify({ directory }), { mode: 0o600 });
console.log(JSON.stringify({ directory, totalRows: manifest.totalRows, credentialSaved: false }));
