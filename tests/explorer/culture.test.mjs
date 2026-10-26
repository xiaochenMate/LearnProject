import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  if (path.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
  const exports = {};
  cache.set(path, exports);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    require: name => load(resolve(dirname(path), name.endsWith('.json') ? name : `${name}.ts`)),
  }, { filename: path });
  return exports;
}
const { CULTURE_BOOKS: books, CULTURE_IDIOMS: idioms } = load('lib/cultureContent.ts');
const practice = load('lib/culturePractice.ts');
const progress = load('lib/cultureProgress.ts');
const original = load('lib/cultureOriginal.ts');
const plain = value => JSON.parse(JSON.stringify(value));
const initial = book => progress.emptyCultureProgress(book);
const correctDraft = q => ({ ...progress.emptyCultureDraft(q.id), answer: q.answer, order: q.tokens?.map((_, i) => i) || [] });
const answer = (state, q, at, draft = correctDraft(q), reveal = false) => progress.submitCultureQuestion({ ...state, draft }, q, at, reveal);
const now = Date.UTC(2026, 9, 26);

test('all available local content is retained, with truthful excerpt coverage and local covers', () => {
  assert.equal(books.poetry.units.length, 20);
  assert.equal(books.sanzijing.units.length, 6);
  assert.equal(books.qianziwen.units.length, 2);
  assert.equal(books.idiom.units.length, 32);
  for (const book of Object.values(books)) {
    assert.equal(new Set(book.units.map(u => u.id)).size, book.units.length);
    assert.ok(existsSync(resolve(`public/images/covers/${book.cover}-480.webp`)));
    for (const unit of book.units) assert.ok(unit.meaning && unit.lines.length && unit.title);
  }
  assert.match(books.sanzijing.source, /精选注释仍为已有开篇 6 段/);
  assert.match(books.qianziwen.source, /精选注释仍为已有开篇 2 段/);
  assert.match(books.idiom.source, /未逐则收录典籍出处/);
  const poems = load('lib/poems.ts').POEM_LIBRARY;
  for (const poem of poems) {
    const unit = books.poetry.units.find(u => u.id === poem.id);
    assert.deepEqual(plain(unit.lines), plain(poem.lines));
    assert.equal(unit.meaning, poem.meaning);
  }
  for (const item of idioms) assert.equal(books.idiom.units.find(u => u.id === item.word).example, item.example);
});

test('each unit has four usable, stable, distinct exercises with data-backed options', () => {
  let total = 0;
  for (const book of Object.values(books)) {
    const questions = practice.allCultureQuestions(book);
    total += questions.length;
    assert.equal(new Set(questions.map(q => q.id)).size, questions.length);
    for (const unit of book.units) {
      const qs = practice.questionsForUnit(book, unit);
      assert.equal(qs.length, 4, `${book.id}:${unit.id}`);
      assert.deepEqual(plain(qs), plain(practice.questionsForUnit(book, unit)));
      assert.equal(new Set(qs.map(q => q.label)).size, 4);
      for (const q of qs) {
        assert.equal(practice.checkCultureAnswer(q, correctDraft(q)), true, q.id);
        if (q.options) {
          assert.ok(q.options.length >= 2);
          assert.equal(new Set(q.options).size, q.options.length);
          assert.ok(q.options.includes(q.answer));
        }
      }
    }
  }
  assert.equal(total, 240);
});

test('indexed ordering retains repeated lines, validates multiplicity, and rejects invalid indices', () => {
  const q = { id: 'repeated', kind: 'order', tokens: ['同一句', '同一句', '末句'] };
  assert.equal(practice.checkCultureAnswer(q, { order: [0, 1, 2] }), true);
  assert.equal(practice.checkCultureAnswer(q, { order: [1, 0, 2] }), true);
  for (const order of [[0, 2], [0, 0, 2], [0, 2, 1], [-1, 1, 2], [0, 1, 9], [0, 1, 2, 2]]) {
    assert.equal(practice.checkCultureAnswer(q, { order }), false);
  }
  for (let n = 2; n < 30; n++) {
    const shuffled = practice.shuffledIndices(n, 'stable');
    assert.equal(new Set(shuffled).size, n);
    assert.notDeepEqual(plain(shuffled), Array.from({ length: n }, (_, i) => i));
  }
});

test('first independent success earns one credit and read progress; replay cannot farm credit', () => {
  const book = books.poetry;
  const q = practice.allCultureQuestions(book)[0];
  const first = answer(initial(book), q, now);
  assert.equal(first.newCredit, true);
  assert.equal(first.state.credits.length, 1);
  assert.ok(first.state.read.includes(q.unitId));
  assert.equal(first.state.review[q.id].dueAt, now + 86400000);
  const doubleClick = progress.submitCultureQuestion(first.state, q, now);
  assert.equal(doubleClick.state, first.state);
  const replay = answer(first.state, q, now + 1000);
  assert.equal(replay.newCredit, false);
  assert.equal(replay.state.credits.length, 1);
  assert.deepEqual(plain(replay.state.review), plain(first.state.review));
});

test('wrong answers, hints, and reveal enter the review queue without awarding success', () => {
  const book = books.idiom;
  const q = practice.allCultureQuestions(book).find(q => q.kind === 'text');
  const wrong = answer(initial(book), q, now, { ...correctDraft(q), answer: '错误答案' });
  assert.equal(wrong.state.draft.result, 'wrong');
  assert.equal(wrong.newCredit, false);
  assert.equal(wrong.state.review[q.id].wrong, true);
  assert.equal(progress.dueCultureQuestions(book, wrong.state, now).length, 1);
  const hinted = answer(initial(book), q, now, { ...correctDraft(q), hinted: true });
  assert.equal(hinted.state.draft.result, 'assisted');
  assert.equal(hinted.newCredit, false);
  const revealed = answer(initial(book), q, now, correctDraft(q), true);
  assert.equal(revealed.state.draft.result, 'revealed');
  assert.equal(revealed.newCredit, false);
  assert.equal(revealed.state.credits.length, 0);
  const retry = answer(wrong.state, q, now + 100);
  assert.equal(retry.newCredit, true);
  assert.equal(retry.state.review[q.id].wrong, false);
  assert.equal(progress.dueCultureQuestions(book, retry.state, now + 100).length, 0);
});

test('review advances only when due, follows spaced intervals, and resets on error', () => {
  const book = books.qianziwen;
  const q = practice.allCultureQuestions(book)[1];
  let state = answer(initial(book), q, now).state;
  assert.equal(progress.dueCultureQuestions(book, state, now).length, 0);
  let at = now;
  for (const days of [3, 7, 14, 14]) {
    at = state.review[q.id].dueAt;
    assert.equal(progress.dueCultureQuestions(book, state, at).length, 1);
    const result = answer(state, q, at);
    assert.equal(result.newCredit, false);
    state = result.state;
    assert.equal(state.review[q.id].dueAt, at + days * 86400000);
  }
  state = answer(state, q, at + 1, { ...correctDraft(q), answer: '错' }).state;
  assert.equal(state.review[q.id].streak, 0);
  assert.equal(state.review[q.id].lapses, 1);
  assert.equal(state.credits.length, 1);
});

test('read and self-assessment cannot mark a unit mastered; all real questions must succeed', () => {
  for (const book of Object.values(books)) {
    const unit = book.units[0];
    let state = { ...initial(book), read: [unit.id] };
    assert.equal(progress.cultureUnitLearned(book, unit, state), false);
    const qs = practice.questionsForUnit(book, unit);
    for (const q of qs) state = answer(state, q, now).state;
    assert.equal(progress.cultureUnitLearned(book, unit, state), true);
    assert.equal(state.read.length, 1);
    assert.equal(state.credits.length, qs.length);
  }
});

test('legacy score and self-assessments migrate without touching old keys or fabricating scores', () => {
  const values = new Map([['poem_score', '23'], ['exbeam.classics.reflections.v2', '["1","6","99"]']]);
  const before = plain([...values]);
  const storage = { getItem: key => values.get(key) || null, setItem: () => assert.fail('migration must be read-only'), removeItem: () => assert.fail('never remove legacy keys') };
  const poems = progress.loadCultureProgress(books.poetry, storage);
  assert.equal(poems.legacyScore, 23);
  assert.equal(poems.credits.length, 0);
  const classics = progress.loadCultureProgress(books.sanzijing, storage);
  assert.deepEqual(plain(classics.read), ['1', '6']);
  assert.deepEqual(plain(classics.legacyReflections), ['1', '6', '99']);
  assert.equal(classics.credits.length, 0);
  assert.deepEqual(plain([...values]), before);
});

test('saved work, selected item, filters, partial exercise, notes and review survive restoration', () => {
  const book = books.sanzijing;
  const q = practice.allCultureQuestions(book)[0];
  const state = { ...initial(book), selectedId: '2', view: 'practice', query: '习惯', category: book.units[1].category,
    saved: ['1', '2'], read: ['1'], notes: { 2: '每天阅读一小段' }, draft: { ...progress.emptyCultureDraft(q.id), order: [1] } };
  const storage = { getItem: key => key === progress.cultureStorageKey(book) ? JSON.stringify(state) : null };
  const restored = progress.loadCultureProgress(book, storage);
  assert.deepEqual(plain(restored), plain(state));
  assert.equal(progress.validCultureProgress(restored, book), true);
});

test('corrupt records and unavailable storage remain safe, without modifying source records', () => {
  const book = books.poetry;
  for (const raw of ['{bad', 'null', '[]', '{"version":0}']) {
    assert.equal(progress.loadCultureProgress(book, { getItem: key => key === 'poem_score' ? '5' : raw }).legacyScore, 5);
  }
  assert.deepEqual(plain(progress.loadCultureProgress(book, { getItem: () => { throw new Error('blocked'); } })), plain(initial(book)));
  const q = practice.allCultureQuestions(book)[0];
  const dirty = { ...initial(book), selectedId: 'missing', saved: ['p1', 'p1', 'missing'], credits: ['bad'],
    review: { bad: { dueAt: 0 }, [q.id]: { dueAt: Infinity } }, notes: { p1: 'a'.repeat(2500), bad: 'ignore' },
    draft: { ...progress.emptyCultureDraft(q.id), order: [0, 0, -1, 999, 1] }, speechRate: 99 };
  const normalized = progress.normalizeCultureProgress(dirty, book);
  assert.equal(normalized.selectedId, book.units[0].id);
  assert.deepEqual(plain(normalized.saved), ['p1']);
  assert.equal(normalized.credits.length, 0);
  assert.equal(Object.keys(normalized.review).length, 0);
  assert.deepEqual(plain(normalized.draft.order), [0, 1]);
  assert.equal(normalized.notes.p1.length, 2000);
  assert.equal(normalized.speechRate, 0.8);
});

test('search, actual categories, author/dynasty, pinyin initials and saved shelves work locally', () => {
  const poem = initial(books.poetry);
  assert.equal(progress.filterCultureUnits(books.poetry, { ...poem, query: '李白' }).length, 3);
  assert.ok(progress.filterCultureUnits(books.poetry, { ...poem, category: '友人情谊' }).some(u => u.title === '赠汪伦'));
  assert.equal(progress.filterCultureUnits(books.poetry, { ...poem, dynasty: '宋' }).length, 4);
  const idiom = initial(books.idiom);
  assert.equal(progress.filterCultureUnits(books.idiom, { ...idiom, query: 'hsts' }).length, 0);
  assert.equal(progress.filterCultureUnits(books.idiom, { ...idiom, query: 'hstz' })[0].title, '画蛇添足');
  assert.equal(progress.filterCultureUnits(books.idiom, { ...idiom, query: 'hua she' })[0].title, '画蛇添足');
  assert.equal(progress.filterCultureUnits(books.idiom, { ...idiom, shelf: 'saved' }).length, 0);
  assert.equal(progress.filterCultureUnits(books.idiom, { ...idiom, shelf: 'saved', saved: ['画蛇添足'] }).length, 1);
});

test('new culture surfaces use Workbench and never arbitrary SQL, fake infrastructure labels or popup alerts', () => {
  const ui = readFileSync(resolve('lib/cultureUI.tsx'), 'utf8');
  assert.match(ui, /<Workbench/);
  assert.match(ui, /useModuleState<CultureProgress>/);
  assert.match(ui, /kind: 'challenge'/);
  for (const file of ['lib/cultureUI.tsx', 'components/PoetryApp.tsx', 'components/ThreeCharacterApp.tsx', 'components/ThousandCharacterApp.tsx', 'components/IdiomApp.tsx']) {
    const source = readFileSync(resolve(file), 'utf8');
    assert.doesNotMatch(source, /dataService|SELECT \*|picsum|\bNEON\b|\balert\s*\(|\bconfirm\s*\(/);
  }
  const speech = readFileSync(resolve('lib/cultureSpeech.ts'), 'utf8');
  assert.match(speech, /removeEventListener\('voiceschanged'/);
  assert.match(speech, /current\.current\.onend = null/);
  assert.match(speech, /当前设备不支持语音朗读/);
});

test('complete public-domain originals retain the selected edition, endpoints, variants and 1000-character text', () => {
  const san = books.sanzijing.original;
  const qian = books.qianziwen.original;
  assert.equal(san.paragraphs.length, 89);
  assert.equal(original.originalCharacterCount(san), 1056);
  assert.equal(qian.paragraphs.length, 125);
  assert.equal(original.originalCharacterCount(qian), 1000);
  assert.match(san.paragraphs[0].text, /^人之初/);
  assert.match(san.paragraphs.at(-1).text, /宜自勗/);
  assert.match(qian.paragraphs[0].text, /^天地玄黃/);
  assert.equal(qian.paragraphs.at(-1).text.replace(/\s/g, ''), '謂語助者焉哉乎也');
  assert.ok(qian.paragraphs.some(p => p.variants?.includes('一作')));
  for (const source of [san, qian]) {
    assert.equal(new Set(source.paragraphs.map(p => p.id)).size, source.paragraphs.length);
    assert.ok(source.paragraphs.every(p => p.simplified && p.text && !p.text.includes('一作')));
    assert.ok(source.sourceUrl.includes(String(source.revision)));
    assert.match(source.rights, /CC BY-SA 4.0/);
    assert.match(source.note, /未提供全篇拼音或译注/);
  }
});

test('full-original search accepts both scripts and pagination reaches every line exactly once', () => {
  for (const book of [books.sanzijing, books.qianziwen]) {
    const source = book.original;
    const state = initial(book).original;
    const pages = original.cultureOriginalPages(original.filterCultureOriginal(source, state));
    assert.deepEqual(plain(pages.flat().map(p => p.id)), plain(source.paragraphs.map(p => p.id)));
    assert.ok(pages.every(p => p.length <= 10));
    assert.equal(original.filterCultureOriginal(source, { ...state, shelf: 'saved' }).length, 0);
    assert.equal(original.filterCultureOriginal(source, { ...state, shelf: 'saved', saved: [source.paragraphs[0].id] }).length, 1);
  }
  const source = books.sanzijing.original;
  assert.ok(original.filterCultureOriginal(source, { ...initial(books.sanzijing).original, query: '人不学' }).length > 0);
  assert.ok(original.filterCultureOriginal(source, { ...initial(books.sanzijing).original, query: '人不學' }).length > 0);
});

test('original reading progress, script, shelf and page restore separately from annotated challenge scores', () => {
  const book = books.qianziwen;
  const lineId = book.original.paragraphs[120].id;
  const state = { ...initial(book), readingScope: 'original', original: { page: 12, query: '焉哉', shelf: 'all', script: 'simplified', read: [lineId], saved: [lineId] } };
  const restored = progress.loadCultureProgress(book, { getItem: key => key === progress.cultureStorageKey(book) ? JSON.stringify(state) : null });
  assert.deepEqual(plain(restored), plain(state));
  assert.equal(restored.credits.length, 0);
  assert.equal(restored.read.length, 0);
  const normalized = progress.normalizeCultureProgress({ ...state, original: { ...state.original, page: 999, read: ['missing', lineId, lineId] } }, book);
  assert.equal(normalized.original.page, 12);
  assert.deepEqual(plain(normalized.original.read), [lineId]);
});

test('mobile directory defaults to collapsed without changing exercise state or hiding the content area', () => {
  const ui = readFileSync(resolve('lib/cultureUI.tsx'), 'utf8');
  const css = readFileSync(resolve('components/culture.css'), 'utf8');
  assert.match(ui, /\[directoryOpen, setDirectoryOpen\] = useState\(false\)/);
  assert.match(ui, /aria-expanded=\{directoryOpen\}/);
  assert.match(css, /\.culture-workspace \.culture-library \{ display: none; \}/);
  assert.match(css, /\.culture-workspace\.culture-directory-open \.culture-library \{ display: flex; \}/);
  assert.match(css, /\.culture-workspace \.wb-content \{ min-height: 0; overflow: auto; \}/);
});
