import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import { build } from 'vite';

const root = fileURLToPath(new URL('../../', import.meta.url));
const clientFiles = ['lib/neon.ts', 'lib/supabase.ts', 'lib/dataService.ts'];
const canary = 'postgresql://bundle_canary:must_never_ship@example.invalid/source';
const plain = value => JSON.parse(JSON.stringify(value));

function loadClient(fetch) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    }).outputText;
    vm.runInNewContext(source, {
      exports,
      fetch,
      require(name) {
        assert.ok(name.startsWith('./'), `Unexpected client dependency: ${name}`);
        return load(resolve(dirname(file), `${name}.ts`));
      },
    }, { filename: file });
    return exports;
  }
  return {
    service: load(resolve(root, 'lib/dataService.ts')),
    neon: load(resolve(root, 'lib/neon.ts')),
    supabase: load(resolve(root, 'lib/supabase.ts')),
  };
}

function jsonResponse(payload, init) {
  return new Response(JSON.stringify(payload), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
    ...init,
  });
}

function checkError(modules, code, endpoint, status) {
  return error => {
    assert.ok(error instanceof modules.service.ClientDataError);
    assert.equal(error.name, 'ClientDataError');
    assert.equal(error.code, code);
    assert.equal(error.mode, 'serverAPI');
    assert.equal(error.endpoint, endpoint);
    assert.equal(error.status, status);
    assert.ok(!error.message.includes(canary));
    assert.equal(error.cause, undefined);
    return true;
  };
}

test('imports have no database clients, environment reads, or network side effects', () => {
  let calls = 0;
  const modules = loadClient(() => { calls++; throw new Error('Unexpected network access'); });
  assert.equal(calls, 0);
  assert.equal(modules.service.default, modules.service.dataService);
  assert.equal(modules.neon.default, modules.neon.sql);
  assert.equal(modules.service.dataService.mode, 'serverAPI');
  assert.ok(Object.isFrozen(modules.service.SERVER_API));
  assert.deepEqual(plain(modules.service.SERVER_API), {
    mode: 'serverAPI', readOnly: true, health: '/api/health', dataStatus: '/api/data-status',
  });
  assert.equal(modules.neon.SERVER_API, modules.service.SERVER_API);
  assert.equal(modules.supabase.SERVER_API, modules.service.SERVER_API);
  for (const file of clientFiles) {
    const source = readFileSync(resolve(root, file), 'utf8');
    assert.doesNotMatch(source, /@neondatabase\/serverless|@supabase\/supabase-js|import\.meta\.env|process\.env|VITE_/);
  }
});

test('every legacy query signature rejects without sending SQL or returning empty data', async () => {
  const calls = [];
  const modules = loadClient((...args) => { calls.push(args); return jsonResponse([]); });
  const service = modules.service.dataService;
  const attempts = [
    () => service.queryNeon`SELECT * FROM old_table WHERE secret = ${canary}`,
    () => service.query('SELECT * FROM old_table WHERE secret = $1', [canary]),
    () => service.querySupabase('old_table'),
    () => service.querySupabase('old_table', 'id,private_data'),
    () => modules.neon.sql`SELECT ${canary}`,
    () => modules.neon.sql('SELECT $1', [canary]),
    () => modules.supabase.supabase.from('old_table').select(),
    () => modules.supabase.supabase.from('old_table').select('private_data'),
  ];
  for (const attempt of attempts) {
    await assert.rejects(attempt, checkError(modules, 'CLIENT_DATABASE_DISABLED'));
  }
  service.clearCache();
  await assert.rejects(attempts[0], checkError(modules, 'CLIENT_DATABASE_DISABLED'));
  assert.deepEqual(calls, []);
});

test('status methods use only fixed same-origin, uncached GET endpoints', async () => {
  const calls = [];
  const payloads = [
    { ok: true, service: 'exbeam-api' },
    { mode: 'serverAPI', configured: false, state: 'migration-pending' },
  ];
  const modules = loadClient((...args) => {
    calls.push(args);
    return jsonResponse(payloads[calls.length - 1]);
  });
  const controller = new AbortController();
  assert.deepEqual(plain(await modules.service.dataService.getHealth(controller.signal)), payloads[0]);
  assert.deepEqual(plain(await modules.service.dataService.getDataStatus()), payloads[1]);
  assert.deepEqual(calls.map(([endpoint]) => endpoint), ['/api/health', '/api/data-status']);
  for (const [, options] of calls) {
    assert.deepEqual(plain({ ...options, signal: undefined }), {
      method: 'GET', credentials: 'same-origin', mode: 'same-origin',
      redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' },
    });
    assert.equal(options.body, undefined);
  }
  assert.equal(calls[0][1].signal, controller.signal);
});

test('status is refreshed and a previous success never masks a later failure', async () => {
  let calls = 0;
  const modules = loadClient(() => {
    calls++;
    if (calls === 1) return jsonResponse({ ready: false });
    if (calls === 2) return jsonResponse({ ready: true });
    throw new Error(canary);
  });
  const service = modules.service.dataService;
  assert.deepEqual(plain(await service.getDataStatus()), { ready: false });
  service.clearCache();
  assert.deepEqual(plain(await service.getDataStatus()), { ready: true });
  await assert.rejects(() => service.getDataStatus(), checkError(modules, 'SERVER_API_UNAVAILABLE', '/api/data-status'));
  assert.equal(calls, 3);
});

for (const [method, endpoint] of [['getHealth', '/api/health'], ['getDataStatus', '/api/data-status']]) {
  test(`${method} rejects unavailable fetch and sanitizes connection errors`, async () => {
    for (const fetch of [undefined, () => { throw new Error(canary); }, () => Promise.reject(new Error(canary))]) {
      const modules = loadClient(fetch);
      await assert.rejects(() => modules.service.dataService[method](), checkError(modules, 'SERVER_API_UNAVAILABLE', endpoint));
    }
  });

  test(`${method} rejects HTTP errors without exposing response bodies`, async () => {
    for (const status of [401, 403, 404, 405, 500, 503]) {
      const modules = loadClient(() => jsonResponse({ error: canary }, { status }));
      await assert.rejects(() => modules.service.dataService[method](), checkError(modules, 'SERVER_API_UNAVAILABLE', endpoint, status));
    }
  });

  test(`${method} rejects HTML fallbacks, malformed JSON, arrays, and scalar payloads`, async () => {
    const responses = [
      () => new Response('<!doctype html><title>SPA fallback</title>'),
      () => new Response('{', { headers: { 'content-type': 'application/json' } }),
      () => new Response(null, { status: 204 }),
      ...[[], null, true, 1, 'ready'].map(payload => () => jsonResponse(payload)),
    ];
    for (const response of responses) {
      const modules = loadClient(response);
      await assert.rejects(() => modules.service.dataService[method](), checkError(modules, 'SERVER_API_INVALID_RESPONSE', endpoint, response().status));
    }
  });

  test(`${method} rejects unexpected redirects`, async () => {
    const modules = loadClient(() => ({ ok: true, redirected: true, status: 200 }));
    await assert.rejects(() => modules.service.dataService[method](), checkError(modules, 'SERVER_API_UNAVAILABLE', endpoint, 200));
  });

  test(`${method} propagates cancellation as an explicit unavailable status`, async () => {
    const controller = new AbortController();
    controller.abort();
    const modules = loadClient((_endpoint, options) => {
      assert.equal(options.signal, controller.signal);
      return Promise.reject(controller.signal.reason);
    });
    await assert.rejects(() => modules.service.dataService[method](controller.signal), checkError(modules, 'SERVER_API_UNAVAILABLE', endpoint));
  });
}

test('the client bundle cannot inline privileged canary environment values', async () => {
  const env = {
    VITE_NEON_DATABASE_URL: canary,
    VITE_DATABASE_URL: canary,
    VITE_SUPABASE_URL: 'https://bundle-canary.invalid',
    VITE_SUPABASE_ANON_KEY: 'must_never_ship_anon_key',
    VITE_SUPABASE_SERVICE_ROLE_KEY: 'must_never_ship_service_role',
    DATABASE_URL: canary,
    SUPABASE_SERVICE_ROLE_KEY: 'must_never_ship_server_role',
  };
  // Isolate this check from real .env files and write no shared build artifacts.
  const result = await build({
    root,
    configFile: false,
    envDir: false,
    publicDir: false,
    logLevel: 'silent',
    define: { 'import.meta.env': JSON.stringify(env), 'process.env': JSON.stringify(env) },
    build: {
      write: false,
      minify: false,
      rollupOptions: {
        input: clientFiles.map(file => resolve(root, file)),
        preserveEntrySignatures: 'strict',
        treeshake: false,
      },
    },
  });
  const chunks = (Array.isArray(result) ? result : [result]).flatMap(output => output.output).filter(output => output.type === 'chunk');
  assert.ok(chunks.length > 0);
  const code = chunks.map(chunk => chunk.code).join('\n');
  for (const value of Object.values(env)) assert.ok(!code.includes(value), 'A synthetic environment secret entered the bundle');
  assert.doesNotMatch(code, /postgres(?:ql)?:\/\//i);
  assert.doesNotMatch(chunks.flatMap(chunk => Object.keys(chunk.modules)).join('\n'), /@neondatabase|@supabase/);
  assert.match(code, /\/api\/health/);
  assert.match(code, /\/api\/data-status/);
});

test('production env example contains no frontend database assignments', () => {
  const example = readFileSync(resolve(root, '.env.example'), 'utf8');
  assert.doesNotMatch(example, /^\s*VITE_\w*(?:NEON|SUPABASE|DATABASE|SECRET|PASSWORD|TOKEN)\w*\s*=/m);
  assert.match(example, /server-side secret/);
  assert.match(example, /CLIENT_DATABASE_DISABLED/);
  assert.match(example, /Preserve the original site\/source data/);
});
