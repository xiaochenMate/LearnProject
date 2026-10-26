import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { root, schema, origin, code, mutation } from './helpers-worker.mjs';

let runtime;
try {
  const { Miniflare, convertV4MiniflareOptions } = await import('miniflare');
  const { unstable_splitSqlQuery } = await import('wrangler');
  runtime = { Miniflare, splitSQL: unstable_splitSqlQuery, convertOptions: convertV4MiniflareOptions || (options => options) };
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}

async function runtimeHarness(t, { legacy = false } = {}) {
  const bundled = await build({
    entryPoints: [`${root}cloudflare/worker.ts`], bundle: true, write: false,
    format: 'esm', platform: 'browser', target: 'es2022', logLevel: 'silent',
  });
  const outbound = [];
  let legacyState;
  const mf = new runtime.Miniflare(runtime.convertOptions({
    workers: [{
    name: 'production',
    modules: true, script: bundled.outputFiles[0].text, compatibilityDate: '2026-08-04',
    d1Databases: { DB: 'worker-runtime-test' },
    bindings: { EXBEAM_RELEASE: 'runtime-test', LEGACY_BLOBS_VERIFIED_EMPTY: '2026-10-26', ...(legacy ? { LEGACY_SUMMER_ORIGIN: 'https://legacy.example' } : {}) },
    serviceBindings: { ASSETS: async () => new Response('<html>asset</html>', { headers: { 'Content-Type': 'text/html' } }) },
    outboundService: async request => {
      outbound.push({ url: request.url, method: request.method, headers: Object.fromEntries(request.headers) });
      if (new URL(request.url).searchParams.get('code') === 'ZZZZZZZZ') return Response.json({ code: 'ZZZZZZZZ', state: legacyState });
      return new Response(null, { status: 404 });
    },
    }],
  }));
  t.after(() => mf.dispose());
  const db = await mf.getD1Database('DB');
  const statements = runtime.splitSQL(schema);
  // Wrangler's parser preserves the BEGIN...END trigger as one statement.
  await db.batch(statements.map(sql => db.prepare(sql)));
  const send = async (path, init) => {
    const response = await mf.dispatchFetch(`${origin}${path}`, init);
    const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text();
    return { response, status: response.status, body };
  };
  const post = body => send('/api/summer-workspace', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const create = () => post({ action: 'create', code, pin: '1234' });
  const mutate = item => post({ action: 'mutate', code, mutation: item, role: 'child' });
  return { mf, db, send, post, create, mutate, outbound, setLegacyState: state => { legacyState = state; } };
}

test('real workerd/D1: health, schema, pagination, PBKDF2, PIN checks, CAS, durable receipts and limits', { skip: !runtime && 'Install Wrangler/Miniflare to run Workers integration tests' }, async t => {
  const h = await runtimeHarness(t);
  assert.equal((await h.send('/api/health')).body.database.connected, true);
  assert.equal((await h.send('/api/data-status')).body.ready, false);
  assert.equal((await h.send('/api/data-status')).body.summerWorkspace.legacyMigration, 'verified-empty');
  assert.equal((await h.send('/api/not-found')).status, 404);
  assert.equal((await h.send('/page')).status, 200);
  await h.db.batch([
    h.db.prepare('INSERT INTO poems(id, title, author, dynasty, lines) VALUES(?, ?, ?, ?, ?)').bind(17, 'moon', 'Li', 'Tang', '["one","two"]'),
    h.db.prepare('INSERT INTO idioms(id, word) VALUES(?, ?)').bind(12, '100%_literal'),
  ]);
  const page = (await h.send('/api/library/poems?limit=1000')).body;
  assert.deepEqual(page.items[0].lines, ['one', 'two']);
  assert.equal(page.items[0].id, 17);
  assert.equal(page.limit, 100);
  assert.equal(page.total, 1);
  assert.equal((await h.send('/api/library/idioms?q=100%25_')).body.total, 1);
  assert.equal((await h.send('/api/library/idioms?q=%27%20OR%201%3D1')).body.total, 0);
  assert.equal((await h.create()).status, 201);
  assert.equal((await h.create()).status, 409);
  const pinHash = await h.db.prepare('SELECT pin_hash FROM summer_workspaces WHERE code = ?').bind(code).first('pin_hash');
  assert.match(pinHash, /^pbkdf2-sha256\$100000\$/);
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
  assert.equal((await h.post({ action: 'verify', code, pin: '' })).status, 403);
  assert.equal((await h.post({ action: 'mutate', code, role: 'child', mutation: mutation('config', { type: 'save-config', childName: 'not-allowed' }) })).status, 403);
  const operations = Array.from({ length: 8 }, (_, index) => mutation(`runtime-${index}`));
  const writes = await Promise.all(operations.map(h.mutate));
  for (let index = 0; index < writes.length; index++) {
    if (writes[index].status === 409) assert.equal((await h.mutate(operations[index])).status, 200);
    else assert.equal(writes[index].status, 200, JSON.stringify(writes[index].body));
  }
  const repeated = await Promise.all(Array.from({ length: 4 }, () => h.mutate(mutation('repeated'))));
  assert.ok(repeated.every(result => result.status === 200), JSON.stringify(repeated));
  const state = (await h.send(`/api/summer-workspace?code=${code}`)).body.state;
  assert.equal(state.version, 9);
  assert.equal(state.days['2026-07-01'].focusMinutes, 9);
  assert.equal(await h.db.prepare('SELECT COUNT(*) AS count FROM summer_mutations').first('count'), 9);
  assert.equal((await h.mutate(mutation('repeated', { minutes: 2 }))).body.code, 'MUTATION_ID_CONFLICT');
  const oldHash = createHash('sha256').update('exbeam-summer:1234').digest('hex');
  await h.db.prepare('UPDATE summer_workspaces SET pin_hash = ? WHERE code = ?').bind(oldHash, code).run();
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
  assert.match(await h.db.prepare('SELECT pin_hash FROM summer_workspaces').first('pin_hash'), /^pbkdf2-sha256\$100000\$/);
  for (let index = 0; index < 4; index++) assert.equal((await h.post({ action: 'verify', code, pin: '0000' })).status, 403);
  const limited = await h.post({ action: 'verify', code, pin: '0000' });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
  assert.equal(h.outbound.length, 0);
});

test('real workerd/D1: optional legacy origin stays read-only and cannot be claimed with a new PIN', { skip: !runtime && 'Install Wrangler/Miniflare to run Workers integration tests' }, async t => {
  const h = await runtimeHarness(t, { legacy: true });
  const created = await h.create();
  assert.equal(created.status, 201, JSON.stringify({ body: created.body, outbound: h.outbound }));
  h.setLegacyState(created.body.state);
  const result = await h.send('/api/summer-workspace?code=ZZZZZZZZ');
  assert.equal(result.status, 200);
  assert.equal(result.body.readOnly, true);
  assert.equal((await h.post({ action: 'create', code: 'ZZZZZZZZ', pin: '9876' })).status, 409);
  assert.equal((await h.post({ action: 'verify', code: 'ZZZZZZZZ', pin: '9876' })).body.code, 'LEGACY_PARENT_MIGRATION_REQUIRED');
  assert.equal(await h.db.prepare("SELECT COUNT(*) AS count FROM summer_workspaces WHERE code = 'ZZZZZZZZ'").first('count'), 0);
  assert.ok(h.outbound.every(call => call.method === 'GET'));
});

test('real workerd: www canonical redirect is secure and does not affect preview', { skip: !runtime && 'Install Wrangler/Miniflare to run Workers integration tests' }, async t => {
  const h = await runtimeHarness(t);
  for (const method of ['GET', 'HEAD']) {
    const response = await h.mf.dispatchFetch('https://www.exbeam.com/api/health?q=a%2Bb&x=1&x=2', { method, redirect: 'manual' });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), 'https://exbeam.com/api/health?q=a%2Bb&x=1&x=2');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await response.text(), '');
  }
  const preview = await h.mf.dispatchFetch('https://preview.exbeam.com/api/health');
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get('location'), null);
  assert.equal((await preview.json()).database.connected, true);
});
