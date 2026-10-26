import { test } from 'node:test';
import assert from 'node:assert/strict';
import { harness, schema, seedLibrary } from './helpers-worker.mjs';

const required = {
  brain_teasers: ['id', 'question', 'answer', 'hints', 'category', 'difficulty'],
  idioms: ['id', 'word'],
  poems: ['id', 'title', 'author', 'dynasty', 'lines'],
  portal_users: ['id', 'email'],
  portal_favorites: ['id', 'user_email', 'module_id'],
  sanzijing_verses: ['id'],
  vocab_categories: ['id', 'name', 'label'],
  vocab_words: ['id', 'word', 'definition'],
  vocab_progress: ['id', 'user_email'],
};

test('source primary key types and every confirmed NOT NULL constraint are preserved', t => {
  const h = harness(t);
  for (const [table, notNull] of Object.entries(required)) {
    const columns = h.db.sqlite.prepare(`PRAGMA table_info(${table})`).all();
    assert.equal(columns.find(column => column.name === 'id').type, table === 'brain_teasers' ? 'TEXT' : 'INTEGER');
    assert.equal(columns.find(column => column.name === 'id').pk, 1);
    assert.deepEqual(columns.filter(column => column.notnull).map(column => column.name).sort(), [...notNull].sort(), table);
  }
});

test('source unique constraints and foreign keys reject duplicates and orphaned rows', t => {
  const h = harness(t);
  seedLibrary(h.db);
  for (const sql of [
    "INSERT INTO portal_users(id, email) VALUES(2, 'private@example.invalid')",
    "INSERT INTO portal_favorites(id, user_email, module_id) VALUES(2, 'private@example.invalid', 'secret')",
    'INSERT INTO sanzijing_verses(id, verse_index) VALUES(2, 2)',
    "INSERT INTO vocab_progress(id, user_email, word_id) VALUES(2, 'private@example.invalid', 4)",
  ]) assert.throws(() => h.db.sqlite.exec(sql), /UNIQUE/);
  assert.throws(() => h.db.sqlite.exec("INSERT INTO vocab_words(id, word, definition, category_id) VALUES(5, 'orphan', 'test', 999)"), /FOREIGN KEY/);
  assert.throws(() => h.db.sqlite.exec("INSERT INTO vocab_progress(id, user_email, word_id) VALUES(3, 'test@example.invalid', 999)"), /FOREIGN KEY/);
  assert.equal(h.db.sqlite.prepare('PRAGMA foreign_key_check').all().length, 0);
  for (const [table, column] of [['vocab_words', 'category_id'], ['vocab_progress', 'word_id']]) {
    assert.equal(h.db.sqlite.prepare(`PRAGMA foreign_key_list(${table})`).all().some(row => row.from === column), true);
    const indexes = h.db.sqlite.prepare(`PRAGMA index_list(${table})`).all();
    assert.ok(indexes.length > 0);
  }
});

test('JSON arrays/objects/nulls and ISO timestamps survive without lossy transformations', async t => {
  const h = harness(t);
  seedLibrary(h.db);
  h.db.sqlite.prepare('UPDATE poems SET lines = ?, created_at = ? WHERE id = 7')
    .run(JSON.stringify(['\u4eba\u4e4b\u521d', '', null]), '2026-10-26T08:00:00.123+08:00');
  const result = (await h.send('/api/library/poems')).body.items[0];
  assert.deepEqual(result.lines, ['\u4eba\u4e4b\u521d', '', null]);
  assert.equal(result.created_at, '2026-10-26T08:00:00.123+08:00');
  h.db.sqlite.exec('UPDATE sanzijing_verses SET content_chars = NULL, char_analysis = NULL');
  const verse = (await h.send('/api/library/sanzijing')).body.items[0];
  assert.equal(verse.content_chars, null);
  assert.equal(verse.char_analysis, null);
  assert.throws(() => h.db.sqlite.exec("UPDATE poems SET lines = '{\"not\":\"array\"}'"), /CHECK/);
  assert.throws(() => h.db.sqlite.exec("UPDATE brain_teasers SET hints = 'not-json'"), /CHECK/);
});

test('schema is idempotent, preserves completed manifests, and retains source-compatible defaults', t => {
  const h = harness(t);
  h.db.sqlite.exec("UPDATE migration_manifest SET status = 'complete', imported_count = expected_count, verified_at = '2026-10-26T00:00:00Z'");
  h.db.sqlite.exec(schema);
  assert.equal(h.db.sqlite.prepare("SELECT COUNT(*) AS count FROM migration_manifest WHERE status = 'complete'").get().count, 9);
  h.db.sqlite.exec("INSERT INTO portal_users(id, email) VALUES(19, 'default@example.invalid')");
  assert.match(h.db.sqlite.prepare('SELECT created_at FROM portal_users WHERE id = 19').get().created_at, /^\d{4}-\d{2}-\d{2}T/);
  h.db.sqlite.exec("INSERT INTO vocab_progress(id, user_email) VALUES(17, 'default@example.invalid')");
  const progress = h.db.sqlite.prepare('SELECT * FROM vocab_progress WHERE id = 17').get();
  assert.equal(progress.status, 'New');
  assert.equal(progress.correct_count, 0);
  assert.equal(progress.word_id, null);
});
