import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setImmediate as flush } from 'node:timers/promises';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../../', import.meta.url);
const source = readFileSync(new URL('lib/contentLibrary.ts', root), 'utf8');
function load(overrides = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, URLSearchParams, AbortController, setTimeout, clearTimeout, ...overrides });
  return exports;
}
const lib = load();
const plain = value => JSON.parse(JSON.stringify(value));
const page = (total = 50, offset = 0) => ({
  items: Array.from({ length: Math.min(24, Math.max(0, total - offset)) }, (_, i) => ({ id: offset + i, word: `word-${offset + i}` })),
  total, offset, limit: 24, hasMore: offset + 24 < total,
});
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function clock() {
  let id = 0;
  let now = 0;
  const tasks = new Map();
  return {
    setTimeout(fn, delay) { tasks.set(++id, { fn, at: now + delay }); return id; },
    clearTimeout(key) { tasks.delete(key); },
    tick(ms) {
      now += ms;
      for (const [key, task] of [...tasks]) if (task.at <= now) { tasks.delete(key); task.fn(); }
    },
  };
}

test('only the six real collections are exposed, with no fabricated Thousand Character API', () => {
  assert.deepEqual(Object.keys(lib.LIBRARY_COLLECTIONS), ['idioms', 'poems', 'sanzijing', 'vocabulary', 'categories', 'brain-teasers']);
  assert.equal(lib.cultureLibraryCollection('poetry'), 'poems');
  assert.equal(lib.cultureLibraryCollection('idiom'), 'idioms');
  assert.equal(lib.cultureLibraryCollection('sanzijing'), 'sanzijing');
  assert.equal(lib.cultureLibraryCollection('qianziwen'), undefined);
  assert.equal(lib.cultureLibraryCollection('__proto__'), undefined);
  assert.doesNotMatch(source, /dataService|import\.meta\.env|process\.env|@neondatabase|@supabase|30895|fetchAll/i);
});

test('requests are fixed same-origin GETs, encoded, bounded to 24 items, and cancellable', async () => {
  const controller = new AbortController();
  const calls = [];
  const data = await lib.fetchLibraryPage('idioms', { q: '  学习 &?=你好  ', offset: 24, signal: controller.signal }, (url, options) => {
    calls.push({ url, options });
    return json(page(30895, 24));
  });
  const url = new URL(calls[0].url, 'https://test.invalid');
  assert.equal(url.pathname, '/api/library/idioms');
  assert.equal(url.searchParams.get('q'), '学习 &?=你好');
  assert.equal(url.searchParams.get('limit'), '24');
  assert.equal(url.searchParams.get('offset'), '24');
  const options = calls[0].options;
  assert.equal(options.signal, controller.signal);
  assert.deepEqual(plain({ ...options, signal: undefined }), {
    method: 'GET', credentials: 'same-origin', mode: 'same-origin', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json' },
  });
  assert.equal(options.body, undefined);
  assert.equal(data.total, 30895);
  assert.equal(data.items.length, 24);
  assert.equal(calls.length, 1);
});

test('query length is capped and invalid collection/offset values never reach the network', async () => {
  let calls = 0;
  const fetcher = url => { calls++; assert.equal(new URL(url, 'https://test.invalid').searchParams.get('q').length, 200); return json(page()); };
  await lib.fetchLibraryPage('poems', { q: 'a'.repeat(500) }, fetcher);
  for (const collection of ['qianziwen', '../sql', '__proto__', 'constructor', 'https://elsewhere.invalid']) {
    await assert.rejects(() => lib.fetchLibraryPage(collection, {}, fetcher), { code: 'invalid-request' });
  }
  for (const offset of [-1, 1.5, NaN, Infinity, '24', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(() => lib.fetchLibraryPage('poems', { offset }, fetcher), { code: 'invalid-request' });
  }
  assert.equal(calls, 1);
});

test('source counts come only from each successful server page, never from a local fallback', async () => {
  for (const [collection, total] of [['idioms', 30895], ['poems', 70], ['sanzijing', 61], ['vocabulary', 225]]) {
    const result = await lib.fetchLibraryPage(collection, {}, () => json(page(total)));
    assert.equal(result.total, total);
    assert.equal(result.hasMore, true);
    assert.equal(result.items.length, 24);
  }
  assert.deepEqual(plain(await lib.fetchLibraryPage('categories', {}, () => json(page(0)))), page(0));
  const last = await lib.fetchLibraryPage('sanzijing', { offset: 48 }, () => json(page(61, 48)));
  assert.equal(last.items.length, 13);
  assert.equal(last.hasMore, false);
});

test('network and HTTP failures are explicit errors and never expose server error text', async () => {
  const secret = 'postgresql://private:do-not-expose@example.invalid/db';
  for (const fetcher of [undefined, () => { throw new Error(secret); }, () => Promise.reject(new Error(secret)),
    ...[401, 403, 404, 500, 503].map(status => () => new Response(secret, { status })),
    () => ({ ok: true, redirected: true })]) {
    await assert.rejects(() => lib.fetchLibraryPage('poems', {}, fetcher), error => {
      assert.equal(error.code, 'unavailable');
      assert.ok(!String(error).includes(secret));
      assert.equal(error.cause, undefined);
      return true;
    });
  }
});

test('HTML fallbacks, malformed JSON and inconsistent pagination fail closed', async () => {
  const invalid = [[], null, {}, { ...page(), items: [null] }, { ...page(), items: ['not an object'] },
    { ...page(), limit: 30000 }, { ...page(), offset: 24 }, { ...page(), total: '50' },
    { ...page(), total: -1 }, { ...page(), hasMore: 'true' }, { ...page(), items: [] },
    { ...page(), hasMore: false }, { ...page(0), hasMore: true }];
  for (const payload of invalid) await assert.rejects(() => lib.fetchLibraryPage('idioms', {}, () => json(payload)), { code: 'invalid-response' });
  for (const response of [new Response('<html>fallback</html>'), new Response('{', { headers: { 'content-type': 'application/json' } })]) {
    await assert.rejects(() => lib.fetchLibraryPage('poems', {}, () => response), { code: 'invalid-response' });
  }
});

test('idiom/poem readers retain source fields and cannot render image_url or server HTML', () => {
  const unsafe = '<img src="https://unsafe.invalid/a.jpg" onerror="alert(1)">';
  const idiom = lib.libraryEntry('idioms', { id: 1, word: '学以致用', pinyin: 'xué yǐ zhì yòng', explanation: unsafe, example: '例句', derivation: '源库标注的出处', image_url: 'https://unsafe.invalid/a.jpg' }, 0);
  assert.equal(idiom.title, '学以致用');
  assert.equal(idiom.sections[0].text, unsafe);
  assert.equal(idiom.source, '源库标注的出处');
  assert.equal(idiom.image_url, undefined);
  assert.equal(JSON.stringify(idiom).includes('image_url'), false);
  const poem = lib.libraryEntry('poems', { title: '静夜思', author: '李白', dynasty: '唐', lines: ['床前明月光', '疑是地上霜'], meaning: '诗意', source: '源库版本' }, 0);
  assert.equal(poem.subtitle, '唐 · 李白');
  assert.deepEqual(plain(poem.lines), ['床前明月光', '疑是地上霜']);
  assert.equal(poem.sections[0].text, '诗意');
  assert.equal(poem.source, '源库版本');
});

test('Sanzijing deep reading retains characters/pinyin, translations, interpretation and allusion source', () => {
  const entry = lib.libraryEntry('sanzijing', {
    id: '61', content_raw: '人之初，性本善。', content_chars: ['人', '之', '初', '性', '本', '善'],
    content_pinyin: ['rén', 'zhī', 'chū', 'xìng', 'běn', 'shàn'], chapter_name: '开篇', verse_index: 1,
    translation_vernacular: '白话', interpretation_deep: '深入解读', translation_english: 'Translation',
    allusion_title: '典故题名', allusion_context: '典故背景', allusion_source: '《孟子》',
  }, 0);
  assert.equal(entry.title, '人之初，性本善。');
  assert.equal(entry.subtitle, '开篇 · 第 1 段');
  assert.equal(entry.characters.length, 6);
  assert.equal(entry.pinyin[3], 'xìng');
  assert.deepEqual(plain(entry.sections), [
    { label: '白话译文', text: '白话' }, { label: '深入解读', text: '深入解读' },
    { label: '英文对照', text: 'Translation' }, { label: '典故', text: '典故题名\n典故背景' },
  ]);
  assert.equal(entry.source, '《孟子》');
  assert.deepEqual(plain(lib.libraryEntry('sanzijing', { content_raw: '只收录原文' }, 0).lines), ['只收录原文']);
});

test('remaining real collections have inspectable text-only entries', () => {
  const word = lib.libraryEntry('vocabulary', { word: 'orbit', phonetic: '/ˈɔːbɪt/', definition: '轨道', example: 'In orbit.', translation: '在轨道上。' }, 24);
  assert.equal(word.title, 'orbit');
  assert.equal(word.sections.length, 3);
  assert.equal(lib.libraryEntry('categories', { name: '自然', description: '自然主题' }, 0).sections[0].text, '自然主题');
  const puzzle = lib.libraryEntry('brain-teasers', { question: '什么数？', answer: '二', explanation: '解析' }, 0);
  assert.equal(puzzle.sections[0].label, '答案');
  assert.equal(puzzle.sections[1].text, '解析');
  assert.equal(lib.libraryEntry('poems', {}, 0).source, '');
});

test('debouncing sends only the last search and resets to the requested page', async () => {
  const scheduler = clock();
  const scoped = load(scheduler);
  const calls = [];
  const states = [];
  const loader = scoped.createLibrarySearch(state => states.push(plain(state)), {
    fetcher: url => { calls.push(url); return json(page(1)); },
  });
  loader.load('idioms', '一', 0, true);
  scheduler.tick(200);
  loader.load('idioms', '一心', 0, true);
  scheduler.tick(299);
  assert.equal(calls.length, 0);
  scheduler.tick(1);
  await flush();
  assert.equal(calls.length, 1);
  assert.equal(new URL(calls[0], 'https://test.invalid').searchParams.get('q'), '一心');
  assert.equal(states.at(-1).phase, 'ready');
  loader.dispose();
});

test('new search aborts in-flight work and ignores late successful or failing responses', async () => {
  for (const failOld of [false, true]) {
    const requests = [];
    const states = [];
    const loader = lib.createLibrarySearch(state => states.push(plain(state)), {
      fetcher: (url, options) => { const pending = deferred(); requests.push({ ...pending, url, signal: options.signal }); return pending.promise; },
    });
    loader.load('poems', 'old');
    loader.load('poems', 'new');
    assert.equal(requests[0].signal.aborted, true);
    requests[1].resolve(json(page(70)));
    await flush();
    const count = states.length;
    if (failOld) requests[0].reject(new Error('late failure'));
    else requests[0].resolve(json(page(1)));
    await flush();
    assert.equal(states.length, count);
    assert.equal(states.at(-1).page.total, 70);
    loader.dispose();
  }
});

test('dispose cancels timers/requests and a failed retry never retains a previous total', async () => {
  const scheduler = clock();
  const scoped = load(scheduler);
  const states = [];
  let calls = 0;
  const loader = scoped.createLibrarySearch(state => states.push(plain(state)), {
    fetcher: () => { calls++; if (calls === 1) return json(page(225)); throw new Error('offline'); },
  });
  loader.load('vocabulary');
  await flush();
  assert.equal(states.at(-1).page.total, 225);
  loader.load('vocabulary');
  await flush();
  assert.equal(states.at(-1).phase, 'error');
  assert.equal(states.at(-1).page, undefined);
  loader.load('vocabulary', 'pending', 0, true);
  loader.dispose();
  scheduler.tick(1000);
  await flush();
  assert.equal(calls, 2);
  const pending = deferred();
  const lateStates = [];
  let signal;
  const late = lib.createLibrarySearch(state => lateStates.push(state), { fetcher: (_url, options) => { signal = options.signal; return pending.promise; } });
  late.load('poems');
  late.dispose();
  assert.equal(signal.aborted, true);
  pending.resolve(json(page(70)));
  await flush();
  assert.equal(lateStates.length, 1);
});

test('culture wiring is additive and preserves the local practice/original reader paths', () => {
  const ui = readFileSync(new URL('lib/cultureUI.tsx', root), 'utf8');
  assert.match(ui, /cloudCollection && <button[^>]+[\s\S]*?云端资料库/);
  assert.match(ui, /cloudLibraryOpen && cloudCollection && <CloudLibrary/);
  assert.match(ui, /useModuleState<CultureProgress>/);
  assert.match(ui, /<CultureOriginalReader/);
  assert.match(ui, /<PracticeQuestion/);
  assert.match(ui, /<CloudLibrary collection=\{cloudCollection\} onClose=\{\(\) => setCloudLibraryOpen\(false\)\}/);
  assert.doesNotMatch(ui, /dataService|SELECT \*|picsum|\bNEON\b|\balert\s*\(|\bconfirm\s*\(/);
  const component = readFileSync(new URL('components/CloudLibrary.tsx', root), 'utf8');
  assert.doesNotMatch(component, /image_url|<img\b|dangerouslySetInnerHTML|fetch\(/);
  assert.match(component, /showModal\(\)/);
  assert.match(component, /onCompositionStart/);
  assert.match(component, /active\.current\?\.dispose\(\)/);
  assert.match(component, /state\.page\.items\.map/);
});
