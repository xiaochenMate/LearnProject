import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { code, origin, mutation, harness, loadWorker, seedLibrary } from './helpers-worker.mjs';

test('health performs SELECT 1, reports release, and fails closed without exposing database errors', async t => {
  const h = harness(t, { initialize: false });
  const health = await h.send('/api/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { ok: true, release: 'test-release', database: { connected: true } });
  assert.match(h.db.log[0].sql, /SELECT 1/);
  assert.equal((await h.send('/api/data-status')).status, 503);
  h.db.before = () => { throw new Error('postgresql://private:canary@source.invalid/secret'); };
  const failed = await h.send('/api/health');
  assert.equal(failed.status, 503);
  assert.equal(failed.body.ok, false);
  assert.doesNotMatch(JSON.stringify(failed.body), /canary|postgresql|source.invalid/);
});

test('manifest is pending by default, re-counted, and cannot claim missing or changed imports ready', async t => {
  const h = harness(t);
  seedLibrary(h.db);
  let { body } = await h.send('/api/data-status');
  assert.equal(body.ready, false);
  assert.equal(body.migration.tables.length, 9);
  assert.equal(body.migration.tables.reduce((sum, table) => sum + table.expectedCount, 0), 31407);
  assert.equal(body.summerWorkspace.legacyMigration, 'not-verified');
  assert.equal(body.summerWorkspace.legacyReadEnabled, false);
  assert.doesNotMatch(JSON.stringify(body), /private@example/);
  for (const table of body.migration.tables) {
    const actual = h.db.sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table.table}`).get().count;
    h.db.sqlite.prepare("UPDATE migration_manifest SET expected_count = ?, imported_count = ?, status = 'complete', verified_at = '2026-10-26T00:00:00Z' WHERE table_name = ?")
      .run(actual, actual, table.table);
  }
  body = (await h.send('/api/data-status')).body;
  assert.equal(body.ready, true);
  assert.equal(body.migration.status, 'complete');
  h.db.sqlite.exec("UPDATE migration_manifest SET imported_count = imported_count + 1 WHERE table_name = 'poems'");
  assert.equal((await h.send('/api/data-status')).body.ready, false);
  h.db.sqlite.exec("UPDATE migration_manifest SET imported_count = expected_count, source_sha256 = 'bad', imported_sha256 = 'different' WHERE table_name = 'poems'");
  assert.equal((await h.send('/api/data-status')).body.ready, false);
  h.db.sqlite.exec("DELETE FROM migration_manifest WHERE table_name = 'poems'");
  const missing = (await h.send('/api/data-status')).body.migration.tables.find(table => table.table === 'poems');
  assert.equal(missing.status, 'missing');
  assert.equal(missing.ready, false);
});

test('legacy empty-store evidence is opt-in and requires an actual date', async t => {
  const h = harness(t);
  for (const [marker, expected] of [[undefined, 'not-verified'], ['true', 'not-verified'], ['2026-02-30', 'not-verified'], ['2026-10-26', 'verified-empty']]) {
    h.env.LEGACY_BLOBS_VERIFIED_EMPTY = marker;
    const result = (await h.send('/api/data-status')).body.summerWorkspace;
    assert.equal(result.legacyMigration, expected);
    assert.equal(result.legacyVerifiedEmptyAt, expected === 'verified-empty' ? marker : null);
  }
});

test('all six public libraries return objects, native JSON fields, and stable ID pagination', async t => {
  const h = harness(t);
  seedLibrary(h.db);
  const page = await h.send('/api/library/idioms?limit=1&offset=1');
  assert.deepEqual(page.body, {
    items: [{ id: 9, word: 'second', pinyin: 'er', abbreviation: null, derivation: null, explanation: 'river', example: null }],
    limit: 1, offset: 1, total: 3, hasMore: true,
  });
  for (const name of ['poems', 'brain-teasers', 'sanzijing', 'vocabulary', 'categories']) {
    const result = await h.send(`/api/library/${name}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.total, 1);
    assert.equal(typeof result.body.items[0], 'object');
    assert.equal(result.body.hasMore, false);
    assert.doesNotMatch(JSON.stringify(result.body), /private@example/);
  }
  const poem = (await h.send('/api/library/poems')).body.items[0];
  assert.deepEqual(poem.lines, ['line one', 'line two']);
  assert.equal(poem.created_at, '2020-01-01T01:02:03.456Z');
  assert.deepEqual((await h.send('/api/library/brain-teasers')).body.items[0].hints, ['hint']);
  const verse = (await h.send('/api/library/sanzijing')).body.items[0];
  assert.deepEqual(verse.content_chars, ['char']);
  assert.deepEqual(verse.content_pinyin, ['pin']);
  assert.deepEqual(verse.char_analysis, { char: { meaning: 'good' } });
  assert.deepEqual(verse.tags, ['tag']);
  assert.deepEqual(verse.key_vocabulary, ['word']);
});

test('bound search treats SQL, percent, underscore and backslash literally; pagination is capped at 100', async t => {
  const h = harness(t);
  seedLibrary(h.db);
  for (const [q, total] of [['river', 1], ['100%_', 1], ["' OR 1=1 --", 0], ['\\', 0], ['   ', 3]]) {
    const result = await h.send(`/api/library/idioms?q=${encodeURIComponent(q)}`);
    assert.equal(result.status, 200);
    assert.equal(result.body.total, total);
    if (q.includes('1=1')) assert.ok(!h.db.log.at(-1).sql.includes(q));
  }
  for (let id = 100; id < 205; id++) h.db.sqlite.prepare('INSERT INTO idioms(id, word) VALUES(?, ?)').run(id, `word-${id}`);
  const capped = (await h.send('/api/library/idioms?limit=999')).body;
  assert.equal(capped.limit, 100);
  assert.equal(capped.items.length, 100);
  assert.equal(capped.hasMore, true);
  assert.equal((await h.send('/api/library/idioms?offset=1000')).body.items.length, 0);
  for (const params of ['limit=-1', 'limit=0', 'offset=1.5', 'limit=1&limit=2', 'sql=SELECT+1', 'table=portal_users', `q=${'a'.repeat(201)}`, 'offset=1000001']) {
    assert.equal((await h.send(`/api/library/idioms?${params}`)).status, 400, params);
  }
});

test('private tables, raw SQL and migration APIs are unavailable, never falling through to SPA', async t => {
  const h = harness(t);
  for (const path of ['/api', '/api/missing', '/api/query', '/api/import', '/api/library/portal_users', '/api/library/portal_favorites', '/api/library/vocab_progress', '/api/library/__proto__']) {
    const result = await h.send(path);
    assert.equal(result.status, 404, path);
    assert.equal(result.body.code, 'NOT_FOUND');
    assert.equal(result.response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(h.assetCalls.length, 0);
  const asset = await h.send('/module/page');
  assert.equal(asset.status, 200);
  assert.equal(h.assetCalls.length, 1);
  assert.equal(asset.response.headers.get('etag'), 'asset-v1');
  assert.equal(asset.response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(asset.response.headers.get('strict-transport-security'), 'max-age=31536000');
});

test('www GET and HEAD canonical redirects preserve path/query and still receive secure headers', async t => {
  const h = harness(t);
  for (const method of ['GET', 'HEAD']) {
    for (const path of ['/library/%E8%AF%97?module=poems&q=a%2Bb&x=1&x=2', '/api/health?check=1']) {
      const response = await h.worker.fetch(new Request(`https://www.exbeam.com${path}`, { method }), h.env);
      assert.equal(response.status, 308);
      assert.equal(response.headers.get('location'), `https://exbeam.com${path}`);
      assert.equal(await response.text(), '');
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('strict-transport-security'), 'max-age=31536000');
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      if (path.startsWith('/api/')) assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  }
  assert.equal(h.db.log.length, 0);
  assert.equal(h.assetCalls.length, 0);
});

test('preview and other hosts are not redirected; www writes retain same-origin protection', async t => {
  const h = harness(t);
  for (const host of ['preview.exbeam.com', 'exbeam.com', 'www.exbeam.com.evil.example']) {
    const response = await h.worker.fetch(new Request(`https://${host}/library?q=1`), h.env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  for (const originHeader of ['https://www.exbeam.com', 'https://evil.example']) {
    const response = await h.worker.fetch(new Request('https://www.exbeam.com/api/summer-workspace', {
      method: 'POST', headers: { Origin: originHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', code }),
    }), h.env);
    assert.equal(response.status, originHeader === 'https://www.exbeam.com' ? 404 : 403);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('API writes require exact Origin and JSON; API responses have no CORS or cache grants', async t => {
  const h = harness(t);
  for (const headers of [{}, { Origin: 'https://evil.example' }, { Origin: 'null' }, { Origin: origin, 'Sec-Fetch-Site': 'same-site' }]) {
    const result = await h.send('/api/summer-workspace', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ action: 'create', code, pin: '1234' }),
    });
    assert.equal(result.status, 403);
  }
  assert.equal((await h.send('/api/health', { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await h.send('/api/health', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await h.send('/api/summer-workspace', { method: 'POST', headers: { Origin: origin }, body: '{}' })).status, 415);
  const health = await h.send('/api/health');
  assert.equal(health.response.headers.get('access-control-allow-origin'), null);
  assert.equal(health.response.headers.get('cache-control'), 'no-store');
  assert.match(health.response.headers.get('content-security-policy'), /default-src 'none'/);
  for (const [path, method] of [['/api/health', 'POST'], ['/api/library/poems', 'PUT'], ['/api/summer-workspace', 'OPTIONS']]) {
    const result = await h.send(path, { method, headers: { Origin: origin } });
    assert.equal(result.status, 405);
    assert.ok(result.response.headers.get('allow'));
  }
});

test('invalid JSON, shape, code and oversized streamed JSON get explicit errors', async t => {
  const h = harness(t);
  for (const body of ['{', 'null', '[]']) {
    const result = await h.send('/api/summer-workspace', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
    assert.equal(result.status, 400);
  }
  for (const bad of ['', '00000000', 'ABCDEFGI', '../query']) assert.equal((await h.create({ code: bad })).status, 400);
  for (const bad of ['', 1234, 'abcd', '123', '123456789']) assert.equal((await h.create({ pin: bad })).status, 400);
  const oversized = await h.send('/api/summer-workspace', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: ' '.repeat(1_048_577),
  });
  assert.equal(oversized.status, 413);
  assert.equal((await h.post({ code, action: 'delete' })).status, 400);
});

test('create/read/verify compatibility with salted PBKDF2, no secrets in responses, and unique codes', async t => {
  const h = harness(t);
  const created = await h.create({ code: ' abcdefgh ' });
  assert.equal(created.status, 201);
  assert.equal(created.body.code, code);
  assert.equal(created.body.state.version, 0);
  assert.doesNotMatch(JSON.stringify(created.body), /pin_hash|pinHash|pbkdf2|1234/);
  assert.equal((await h.send(`/api/summer-workspace?code=${code}`)).body.state.version, 0);
  const hash = h.db.sqlite.prepare('SELECT pin_hash FROM summer_workspaces WHERE code = ?').get(code).pin_hash;
  assert.match(hash, /^pbkdf2-sha256\$100000\$[a-f0-9]{32}\$[a-f0-9]{64}$/);
  assert.equal((await h.create()).status, 409);
  assert.equal((await h.create({ code: 'JKLMNPQR' })).status, 201);
  assert.notEqual(hash, h.db.sqlite.prepare("SELECT pin_hash FROM summer_workspaces WHERE code = 'JKLMNPQR'").get().pin_hash);
  assert.deepEqual((await h.post({ action: 'verify', code, pin: '1234' })).body, { valid: true });
  assert.equal((await h.post({ action: 'verify', code, pin: '9999' })).status, 403);
  assert.equal((await h.post({ action: 'verify', code, pin: '' })).body.valid, false);
  assert.equal((await h.send('/api/summer-workspace?code=STUVWXYZ')).status, 404);
});

test('simultaneous create never replaces another PIN or family state', async t => {
  const h = harness(t);
  const results = await Promise.all([h.create({ pin: '1234' }), h.create({ pin: '5678' })]);
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  const winningPin = results[0].status === 201 ? '1234' : '5678';
  assert.equal((await h.post({ action: 'verify', code, pin: winningPin })).status, 200);
});

test('all six mutations use the original rules and enforce parent PIN for configuration', async t => {
  const h = harness(t);
  assert.equal((await h.create({ state: { ...h.defaultState(), sun: 500 } })).status, 201);
  assert.equal((await h.mutate(mutation('task', { type: 'complete-task', taskId: 'chinese-pinyin', score: { total: 10, correct: 10 } }))).body.state.sun, 520);
  assert.equal((await h.mutate(mutation('plant', { type: 'plant', plantId: 'sun-bloom', row: 0, column: 0 }))).body.state.sun, 490);
  assert.equal((await h.mutate(mutation('reward', { type: 'redeem', rewardId: 'skip-card' }))).body.state.sun, 290);
  assert.equal((await h.mutate(mutation('mood', { type: 'save-check-in', mood: 'good', note: 'hello' }))).body.state.days['2026-07-01'].mood, 'good');
  assert.equal((await h.mutate(mutation('focus'))).body.state.days['2026-07-01'].focusMinutes, 1);
  const config = mutation('config', { type: 'save-config', childName: 'new-name' });
  assert.equal((await h.mutate(config)).status, 403);
  assert.equal((await h.mutate(config, { role: 'parent', pin: '9999' })).status, 403);
  assert.equal((await h.mutate(config, { role: 'parent', pin: '' })).status, 403);
  const saved = await h.mutate(config, { role: 'parent', pin: '1234' });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.state.childName, 'new-name');
  assert.equal(saved.body.state.version, 6);
  // Parent-role non-config writes also require a valid PIN.
  assert.equal((await h.mutate(mutation('parent-focus'), { role: 'parent' })).status, 403);
  assert.equal((await h.mutate(config, { role: 'parent', pin: '9999' })).status, 403);
});

test('malformed mutations cannot poison state or turn child writes into configuration writes', async t => {
  const h = harness(t);
  await h.create();
  const invalid = [
    null, {}, mutation('__proto__'), mutation('date', { date: '__proto__' }), mutation('calendar', { date: '2026-02-30' }),
    mutation('type', { type: 'sql' }), mutation('negative', { minutes: -10 }), mutation('string', { minutes: '10' }),
    mutation('plant', { type: 'plant', plantId: 'sun-bloom', row: 1.5, column: 0 }),
    mutation('score', { type: 'complete-task', taskId: 'chinese-pinyin', score: { correct: 11, total: 10 } }),
    mutation('tasks', { type: 'save-config', tasks: [{ title: 5 }] }),
    mutation('range', { type: 'save-config', vacationStart: '2026-08-01', vacationEnd: '2026-07-01' }),
  ];
  for (const item of invalid) {
    const result = await h.mutate(item, { role: 'parent', pin: '1234' });
    assert.equal(result.status, 400, JSON.stringify(item));
  }
  const child = await h.mutate(mutation('extra', { childName: 'attacker', tasks: [] }));
  assert.equal(child.status, 200);
  assert.notEqual(child.body.state.childName, 'attacker');
  assert.ok(child.body.state.tasks.length > 0);
  assert.equal((await h.mutate(mutation('role'), { role: 'admin' })).status, 400);
  assert.equal((await h.mutate(mutation('missing', { type: 'complete-task', taskId: 'nonexistent' }))).status, 409);
});

test('CAS retries merge concurrent writes without lost updates; exhausted callers can retry the same ID', async t => {
  const h = harness(t);
  await h.create();
  const actions = Array.from({ length: 24 }, (_, index) => mutation(`parallel-${index}`));
  const results = await Promise.all(actions.map(action => h.mutate(action)));
  for (let index = 0; index < results.length; index++) {
    const result = results[index];
    if (result.status === 409) {
      assert.equal(result.body.code, 'WORKSPACE_BUSY');
      assert.equal((await h.mutate(actions[index])).status, 200);
    } else assert.equal(result.status, 200);
  }
  const state = (await h.send(`/api/summer-workspace?code=${code}`)).body.state;
  assert.equal(state.version, 24);
  assert.equal(state.days['2026-07-01'].focusMinutes, 24);
  assert.equal(h.db.sqlite.prepare('SELECT COUNT(*) AS count FROM summer_mutations').get().count, 24);
});

test('simultaneous duplicates, canonical key order and persistent receipts after the 150-ID window', async t => {
  const h = harness(t);
  await h.create();
  const action = mutation('one');
  const same = await Promise.all(Array.from({ length: 8 }, () => h.mutate(action)));
  assert.ok(same.every(result => result.status === 200));
  assert.equal((await h.mutate({ minutes: 1, type: 'log-focus', date: action.date, id: 'one' })).body.state.version, 1);
  for (let index = 0; index < 151; index++) assert.equal((await h.mutate(mutation(`later-${index}`))).status, 200);
  const before = (await h.send(`/api/summer-workspace?code=${code}`)).body.state;
  assert.ok(!before.appliedActionIds.includes('one'));
  const replay = await h.mutate(action);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.duplicate, true);
  assert.equal(replay.body.state.version, 152);
  assert.equal(replay.body.state.days[action.date].focusMinutes, 152);
  assert.equal((await h.mutate(mutation('one', { minutes: 2 }))).body.code, 'MUTATION_ID_CONFLICT');
});

test('CAS prevents overspending and receipt trigger failures roll back the state change', async t => {
  const h = harness(t);
  await h.create({ state: { ...h.defaultState(), sun: 50 } });
  const results = await Promise.all([0, 1].map(column => h.mutate(mutation(`buy-${column}`, {
    type: 'plant', plantId: 'sun-bloom', row: 0, column,
  }))));
  assert.deepEqual(results.map(result => result.status).sort(), [200, 409]);
  const state = (await h.send(`/api/summer-workspace?code=${code}`)).body.state;
  assert.equal(state.sun, 20);
  assert.equal(state.garden.length, 1);
  assert.throws(() => h.db.sqlite.prepare('UPDATE summer_workspaces SET version = version + 1, last_mutation_id = ?, last_mutation_hash = NULL WHERE code = ?').run('broken-receipt', code), /NOT NULL/);
  assert.equal(h.db.sqlite.prepare('SELECT version FROM summer_workspaces').get().version, 1);
});

test('legacy SHA256 PIN is accepted only when correct and upgrades without overwriting state', async t => {
  const h = harness(t);
  await h.create();
  await h.mutate(mutation('before-upgrade'));
  const legacyHash = createHash('sha256').update('exbeam-summer:1234').digest('hex');
  h.db.sqlite.prepare('UPDATE summer_workspaces SET pin_hash = ? WHERE code = ?').run(legacyHash, code);
  assert.equal((await h.post({ action: 'verify', code, pin: '0000' })).status, 403);
  assert.equal(h.db.sqlite.prepare('SELECT pin_hash FROM summer_workspaces').get().pin_hash, legacyHash);
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
  const row = h.db.sqlite.prepare('SELECT * FROM summer_workspaces').get();
  assert.match(row.pin_hash, /^pbkdf2-sha256\$100000\$/);
  assert.equal(row.version, 1);
  assert.equal(JSON.parse(row.state_json).days['2026-07-01'].focusMinutes, 1);
});

test('wrong PIN budgets persist across worker isolates; correct attempts refund and windows expire', async t => {
  const h = harness(t);
  await h.create();
  for (let index = 0; index < 8; index++) assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
  const other = loadWorker().worker;
  for (let index = 0; index < 5; index++) {
    const request = new Request(`${origin}/api/summer-workspace`, {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', code, pin: '0000' }),
    });
    assert.equal((await (index % 2 ? other : h.worker).fetch(request, h.env)).status, 403);
  }
  const limited = await h.post({ action: 'verify', code, pin: '1234' });
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.response.headers.get('retry-after')) > 0);
  assert.equal(limited.body.code, 'PIN_RATE_LIMITED');
  h.db.sqlite.exec('UPDATE summer_pin_attempts SET window_start = 0');
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
});

test('IP budget limits guesses spread across family codes, including when both budgets are exhausted', async t => {
  const h = harness(t);
  for (const family of ['ABCDEFGH', 'ABCDEFGJ', 'ABCDEFGK', 'ABCDEFGL', 'ABCDEFGM', 'ABCDEFGN', 'ABCDEFGP']) {
    await h.create({ code: family });
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await h.post({ action: 'verify', code: family, pin: '0000' });
      assert.equal(result.status, family === 'ABCDEFGP' ? 429 : 403);
    }
  }
  assert.equal((await h.post({ action: 'verify', code, pin: '0000' })).status, 429);
});

test('corrupt stored states or over-cap KDFs fail explicitly without replacing family data', async t => {
  const h = harness(t);
  await h.create();
  h.db.sqlite.exec("UPDATE summer_workspaces SET pin_hash = 'pbkdf2-sha256$100001$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'");
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).body.code, 'PIN_STORAGE_INVALID');
  h.db.sqlite.exec('UPDATE summer_workspaces SET version = 5');
  assert.equal((await h.send(`/api/summer-workspace?code=${code}`)).body.code, 'WORKSPACE_STORAGE_INVALID');
  assert.equal((await h.create()).status, 409);
});

test('legacy fallback is disabled by default and never performs an outbound write or PIN claim', async t => {
  const calls = [];
  let legacyState;
  const h = harness(t, { fetch: async (url, init) => {
    calls.push({ url: String(url), init });
    return Response.json({ code, state: legacyState });
  } });
  legacyState = h.defaultState();
  assert.equal((await h.send(`/api/summer-workspace?code=${code}`)).status, 404);
  assert.equal(calls.length, 0);
  h.env.LEGACY_SUMMER_ORIGIN = 'https://legacy.example';
  const read = await h.send(`/api/summer-workspace?code=${code}`, { headers: { Cookie: 'never-forward=secret' } });
  assert.equal(read.status, 200);
  assert.equal(read.body.readOnly, true);
  assert.equal(read.body.migrationRequired, true);
  assert.equal((await h.create()).body.code, 'LEGACY_PARENT_MIGRATION_REQUIRED');
  assert.equal((await h.create({ pin: '' })).status, 400);
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).body.code, 'LEGACY_PARENT_MIGRATION_REQUIRED');
  assert.equal((await h.mutate(mutation('legacy'), { role: 'parent', pin: '1234' })).status, 409);
  assert.equal(h.db.sqlite.prepare('SELECT COUNT(*) AS count FROM summer_workspaces').get().count, 0);
  for (const call of calls) {
    assert.equal(call.init.method, 'GET');
    assert.equal(call.init.credentials, 'omit');
    assert.equal(call.init.redirect, 'manual');
    assert.deepEqual(Object.keys(call.init.headers), ['Accept']);
    assert.doesNotMatch(call.url, /1234|secret/);
  }
});

test('legacy errors fail closed; only definitive upstream 404 allows a new code', async t => {
  let response = () => new Response('unavailable', { status: 500 });
  const h = harness(t, { fetch: () => response(), env: { LEGACY_SUMMER_ORIGIN: 'https://legacy.example' } });
  for (const make of [
    () => new Response('unavailable', { status: 500 }),
    () => new Response('<html>SPA fallback</html>'),
    () => new Response(null, { status: 302, headers: { Location: 'https://unexpected.example' } }),
    () => Response.json({ code, state: {} }),
    () => { throw new Error('private upstream detail'); },
  ]) {
    response = make;
    const result = await h.create();
    assert.equal(result.status, 502);
    assert.equal(result.body.code, 'LEGACY_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(result.body), /private upstream/);
  }
  for (const unsafe of [origin, 'http://legacy.example', 'https://user:pass@legacy.example', 'https://legacy.example/path']) {
    h.env.LEGACY_SUMMER_ORIGIN = unsafe;
    assert.equal((await h.create()).body.code, 'LEGACY_CONFIGURATION_INVALID');
  }
  h.env.LEGACY_SUMMER_ORIGIN = 'https://legacy.example';
  response = () => new Response(null, { status: 404 });
  assert.equal((await h.create()).status, 201);
  response = () => { throw new Error('Existing D1 family must not consult legacy'); };
  assert.equal((await h.send(`/api/summer-workspace?code=${code}`)).status, 200);
  assert.equal((await h.post({ action: 'verify', code, pin: '1234' })).status, 200);
});
