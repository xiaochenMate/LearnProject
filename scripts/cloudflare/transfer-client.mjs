import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { setDefaultResultOrder } from 'node:dns';

const { unstable_splitSqlQuery: splitSql } = createRequire(import.meta.url)('wrangler');
setDefaultResultOrder('ipv4first');

const root = path.resolve('.migration.local');
const credentialsPath = path.join(root, 'transfer.json');
const command = process.argv[2];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hashRows = rows => createHash('sha256').update(rows.map(row => JSON.stringify(canonical(row))).join('\n') + (rows.length ? '\n' : '')).digest('hex');
await fs.mkdir(root, { recursive: true, mode: 0o700 });

if (command === 'init') {
  let credentials;
  try { credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8')); }
  catch { credentials = { origin: 'https://exbeam-transfer-20261026.xiaochenmate.workers.dev', token: randomBytes(32).toString('hex') }; await fs.writeFile(credentialsPath, JSON.stringify(credentials), { mode: 0o600, flag: 'wx' }); }
  const output = execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', 'TRANSFER_TOKEN', '--config', 'wrangler.transfer.jsonc', '--env-file', '/dev/null'], { encoding: 'utf8', input: credentials.token, maxBuffer: 1_000_000 });
  console.log(output.replaceAll(credentials.token, '[REDACTED]'));
  process.exit(0);
}

const credentials = JSON.parse(await fs.readFile(credentialsPath, 'utf8'));
const { directory } = JSON.parse(await fs.readFile(path.join(root, 'latest-export.json'), 'utf8'));
const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json'), 'utf8'));
const schema = JSON.parse(await fs.readFile(path.join(directory, 'schema.json'), 'utf8'));
const request = async (route, body) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(credentials.origin + route, { method: 'POST', headers: { Authorization: `Bearer ${credentials.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Transfer ${route}: HTTP ${response.status}`);
      return await response.json();
    } catch (error) { if (attempt === 3) throw error; await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1))); }
  }
};
const readRows = async table => (await fs.readFile(path.join(directory, table + '.jsonl'), 'utf8')).split('\n').filter(Boolean).map(row => JSON.parse(row));

if (command === 'schema') {
  const file = process.argv[3];
  if (!file) throw new Error('Pass the reviewed SQLite schema file.');
  const statements = splitSql((await fs.readFile(file, 'utf8')).replace(/^\s*--[^\n]*$/gm, '')).filter(sql => !/^\s*PRAGMA\s+foreign_keys\s*=\s*ON/i.test(sql));
  console.log(JSON.stringify(await request('/execute', { statements: statements.map(sql => ({ sql })) })));
} else if (command === 'import') {
  for (const table of manifest.tables) {
    const rows = await readRows(table.table);
    const columns = schema.columns.filter(column => column.table_name === table.table).map(column => column.column_name);
    const checkpoint = path.join(directory, `${table.table}.imported.json`);
    let offset = 0;
    try { offset = JSON.parse(await fs.readFile(checkpoint, 'utf8')).offset || 0; } catch {}
    for (; offset < rows.length; offset += 100) {
      const batch = rows.slice(offset, offset + 100).map(row => columns.map(column => row[column] !== null && typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column]));
      const result = await request('/rows', { table: table.table, columns, rows: batch });
      if (result.rows !== batch.length) throw new Error(`Incomplete batch for ${table.table}`);
      await fs.writeFile(checkpoint, JSON.stringify({ offset: Math.min(offset + 100, rows.length), sourceSha256: table.sha256 }), { mode: 0o600 });
      if (offset % 2000 === 0 || offset + 100 >= rows.length) console.log(`${table.table}: ${Math.min(offset + 100, rows.length)}/${rows.length}`);
    }
  }
  console.log(JSON.stringify(await request('/check', {})));
} else if (command === 'verify') {
  const report = { checkedAt: new Date().toISOString(), sourceRows: manifest.totalRows, tables: [], integrity: await request('/check', {}) };
  for (const table of manifest.tables) {
    const columns = schema.columns.filter(column => column.table_name === table.table);
    const jsonColumns = new Set(columns.filter(column => ['ARRAY', 'json', 'jsonb'].includes(column.data_type)).map(column => column.column_name));
    const rows = [];
    for (let offset = 0;; offset += 1000) {
      const result = await request('/export', { table: table.table, offset, limit: 1000 });
      for (const source of result.rows) rows.push(Object.fromEntries(Object.entries(source).map(([key, value]) => [key, jsonColumns.has(key) && typeof value === 'string' ? JSON.parse(value) : value])));
      if (result.rows.length < 1000) break;
    }
    const expected = hashRows(await readRows(table.table));
    const actual = hashRows(rows);
    const passed = expected === actual && rows.length === table.rows;
    report.tables.push({ table: table.table, expectedRows: table.rows, actualRows: rows.length, sourceCanonicalSha256: expected, targetCanonicalSha256: actual, passed });
    console.log(`${table.table}: ${rows.length} rows; full-content checksum ${passed ? 'MATCH' : 'MISMATCH'}`);
  }
  report.passed = report.tables.every(table => table.passed) && report.integrity.foreignKeys.length === 0 && report.integrity.integrity.every(item => Object.values(item).includes('ok'));
  await fs.writeFile(path.join(directory, 'verification.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ passed: report.passed, tables: report.tables.length, rows: report.sourceRows }));
  if (!report.passed) process.exitCode = 1;
} else if (command === 'execute') {
  const payload = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
  console.log(JSON.stringify(await request('/execute', payload)));
} else if (command === 'cleanup-qa') {
  const records = (await fs.readdir(root)).filter(file => /^family-.+\.json$/.test(file));
  const codes = [];
  for (const file of records) {
    const report = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
    if (report.workspaceCode) codes.push(report.workspaceCode);
  }
  console.log(JSON.stringify(await request('/cleanup-qa', { codes })));
} else if (command === 'check') console.log(JSON.stringify(await request('/check', {})));
else throw new Error('Use init, schema, import, verify, execute, cleanup-qa or check.');
