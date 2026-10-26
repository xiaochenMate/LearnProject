import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const schema = readFileSync(resolve(root, 'cloudflare/schema.sql'), 'utf8');
export const origin = 'https://exbeam.example';
export const code = 'ABCDEFGH';
export const mutation = (id, fields = {}) => ({ id, date: '2026-07-01', type: 'log-focus', minutes: 1, ...fields });

export function loadWorker({ fetch: outboundFetch = () => { throw new Error('Unexpected outbound request'); } } = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, Request, Response, Headers, URL, TextEncoder, TextDecoder, AbortController, crypto: webcrypto,
      setTimeout, clearTimeout, fetch: outboundFetch,
      require(name) {
        assert.ok(name.startsWith('.'), `Unexpected Worker dependency: ${name}`);
        return load(resolve(dirname(file), `${name}.ts`));
      },
    }, { filename: file });
    return exports;
  }
  return {
    worker: load(resolve(root, 'cloudflare/worker.ts')).default,
    defaultState: () => JSON.parse(JSON.stringify(load(resolve(root, 'lib/summerWorkspace.ts')).createSummerWorkspace())),
  };
}

// The mock adapter runs the production SQL, constraints and triggers in SQLite;
// only the asynchronous D1 binding surface is substituted.
export class SQLiteD1 {
  constructor({ initialize = true } = {}) {
    this.sqlite = new DatabaseSync(':memory:');
    this.log = [];
    this.before = undefined;
    if (initialize) this.sqlite.exec(schema);
  }
  withSession(value) { assert.equal(value, 'first-primary'); return this; }
  prepare(sql) {
    const db = this;
    const statement = {
      sql, values: [],
      bind(...values) { return { ...this, values }; },
      async first() { return (await this.all()).results[0] || null; },
      async all() {
        if (db.before) await db.before(this);
        return db.execute(this);
      },
      async run() { return this.all(); },
    };
    return statement;
  }
  execute(statement) {
    this.log.push({ sql: statement.sql, values: [...statement.values] });
    const prepared = this.sqlite.prepare(statement.sql);
    const rows = prepared.all(...statement.values).map(row => ({ ...row }));
    const changes = Number(this.sqlite.prepare('SELECT changes() AS changes').get().changes);
    return { success: true, results: rows, meta: { changes } };
  }
  async batch(statements) {
    assert.ok(statements.length, 'D1 batches cannot be empty');
    if (this.before) await this.before({ batch: statements });
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const results = statements.map(statement => this.execute(statement));
      this.sqlite.exec('COMMIT');
      return results;
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error; }
  }
  close() { this.sqlite.close(); }
}

export function harness(t, options = {}) {
  const loaded = loadWorker(options);
  const db = new SQLiteD1(options);
  t.after(() => db.close());
  const assetCalls = [];
  const env = {
    DB: db, EXBEAM_RELEASE: 'test-release',
    ASSETS: { async fetch(request) {
      assetCalls.push(request);
      return new Response('<html>static</html>', { headers: { 'Content-Type': 'text/html', ETag: 'asset-v1' } });
    } },
    ...options.env,
  };
  const send = async (path, init = {}) => {
    const response = await loaded.worker.fetch(new Request(`${origin}${path}`, init), env);
    const body = (response.headers.get('content-type') || '').includes('application/json') ? await response.json() : await response.text();
    return { response, body, status: response.status };
  };
  const post = (payload, headers = {}) => send('/api/summer-workspace', {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(payload),
  });
  return {
    ...loaded, db, env, send, post, assetCalls,
    create: (fields = {}) => post({ action: 'create', code, pin: '1234', ...fields }),
    mutate: (action, fields = {}) => post({ action: 'mutate', code, mutation: action, ...fields }),
  };
}

export function seedLibrary(db) {
  db.sqlite.exec(`
    INSERT INTO idioms(id, word, pinyin, explanation) VALUES(9, 'second', 'er', 'river'), (2, 'first', 'yi', 'mountain'), (15, '100%_literal', 'literal', NULL);
    INSERT INTO poems(id, title, author, dynasty, lines, created_at) VALUES(7, 'moon', 'Li', 'Tang', '["line one","line two"]', '2020-01-01T01:02:03.456Z');
    INSERT INTO brain_teasers(id, question, answer, hints, category, difficulty) VALUES('b', 'question', 'answer', '["hint"]', 'logic', 'easy');
    INSERT INTO sanzijing_verses(id, verse_index, content_raw, content_chars, content_pinyin, char_analysis, key_vocabulary, tags)
      VALUES(1, 2, 'verse', '["char"]', '["pin"]', '{"char":{"meaning":"good"}}', '["word"]', '["tag"]');
    INSERT INTO vocab_categories(id, name, label) VALUES(3, 'animals', 'Animals');
    INSERT INTO vocab_words(id, word, definition, category_id) VALUES(4, 'bird', 'flying animal', 3);
    INSERT INTO portal_users(id, email) VALUES(1, 'private@example.invalid');
    INSERT INTO portal_favorites(id, user_email, module_id) VALUES(1, 'private@example.invalid', 'secret');
    INSERT INTO vocab_progress(id, user_email, word_id) VALUES(1, 'private@example.invalid', 4);
  `);
}
