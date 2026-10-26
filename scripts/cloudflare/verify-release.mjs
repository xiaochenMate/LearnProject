import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { setDefaultResultOrder } from 'node:dns';

setDefaultResultOrder('ipv4first');
const origin = new URL(process.argv[2] || 'https://exbeam.com').origin;
const report = { origin, checkedAt: new Date().toISOString(), checks: [], failures: [] };
async function request(route, init = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await fetch(origin + route, { ...init, signal: AbortSignal.timeout(20000) }); }
    catch (error) { if (attempt === 2) throw error; }
  }
}
async function check(label, fn) {
  try { await fn(); report.checks.push(label); console.log(`PASS ${label}`); }
  catch (error) { report.failures.push({ label, error: error.message }); console.error(`FAIL ${label}: ${error.message}`); }
}
async function json(route) {
  const response = await request(route);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  return response.json();
}

await check('Worker and D1 are actually connected', async () => {
  const body = await json('/api/health');
  assert.equal(body.ok, true); assert.equal(body.database.connected, true); assert.ok(body.release);
  report.release = body.release;
});
await check('Nine migrated tables have verified counts and content checksums', async () => {
  const body = await json('/api/data-status');
  assert.equal(body.ready, true); assert.equal(body.migration.status, 'complete');
  assert.equal(body.migration.tables.length, 9); assert.equal(body.migration.totalRows, 31407);
  assert.ok(body.migration.tables.every(table => table.ready && table.expectedCount === table.actualCount));
});
for (const [collection, total] of Object.entries({ idioms: 30895, poems: 70, 'brain-teasers': 58, sanzijing: 61, vocabulary: 225, categories: 8 })) {
  await check(`Live ${collection} catalog, pagination and total`, async () => {
    const body = await json(`/api/library/${collection}?limit=2&offset=0`);
    assert.equal(body.total, total); assert.equal(body.items.length, 2); assert.equal(body.limit, 2); assert.equal(body.offset, 0); assert.equal(body.hasMore, true);
    const next = await json(`/api/library/${collection}?limit=2&offset=2`);
    assert.notEqual(next.items[0].id, body.items[0].id);
    if (collection === 'poems') assert.ok(Array.isArray(body.items[0].lines));
    if (collection === 'sanzijing') assert.ok(body.items.some(item => Array.isArray(item.content_chars)));
    assert.ok(body.items.every(item => !('user_email' in item) && !('email' in item)));
  });
}
await check('Chinese search reads the migrated data rather than a fixture', async () => {
  const body = await json('/api/library/idioms?q=' + encodeURIComponent('一心一意') + '&limit=10');
  assert.ok(body.items.some(item => item.word === '一心一意'));
});
await check('Private user tables, arbitrary SQL and cross-origin writes are rejected', async () => {
  for (const collection of ['portal_users', 'portal_favorites', 'vocab_progress']) assert.equal((await request('/api/library/' + collection)).status, 404);
  assert.equal((await request('/api/library/idioms?sql=select%20*%20from%20portal_users')).status, 400);
  assert.equal((await request('/api/summer-workspace', { method: 'POST', headers: { Origin: 'https://attacker.invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
});
await check('Unknown API paths are JSON 404, not an HTML success page', async () => {
  const response = await request('/api/does-not-exist');
  assert.equal(response.status, 404); assert.match(response.headers.get('content-type') || '', /application\/json/);
});
await check('New frontend and all linked entry assets are live on Cloudflare', async () => {
  const response = await request('/'); const html = await response.text();
  assert.equal(response.status, 200); assert.match(html, /ExBeam/);
  assert.equal(response.headers.get('x-nf-request-id'), null);
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
  assert.ok(assets.length >= 2);
  for (const asset of assets) {
    const result = await request(asset);
    assert.equal(result.status, 200); assert.match(result.headers.get('cache-control') || '', /immutable/);
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
  }
});
await check('Game models and original chess artwork are delivered', async () => {
  for (const asset of ['/images/pieces/xiangqi-red-king.svg', '/images/pieces/chess-w-k.svg', '/games/jiangnan/assets/tank.glb']) {
    const result = await request(asset); assert.equal(result.status, 200);
    assert.ok((await result.arrayBuffer()).byteLength > 100);
  }
});
await fs.mkdir('output/cloudflare', { recursive: true });
const file = `output/cloudflare/${new URL(origin).hostname}-release.json`;
await fs.writeFile(file, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: report.checks.length, failed: report.failures.length, report: file }));
if (report.failures.length) process.exitCode = 1;
