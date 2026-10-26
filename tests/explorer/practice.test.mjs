import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import * as Lucide from 'lucide-react';

const nativeRequire = createRequire(import.meta.url);
function loader(windowValue) {
  const cache = new Map();
  function load(file) {
    const path = resolve(file);
    if (cache.has(path)) return cache.get(path);
    const exports = {}; cache.set(path, exports);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const context = { exports, console, require(name) {
      if (name.endsWith('.css')) return {};
      if (name === 'lucide-react') return Lucide;
      if (!name.startsWith('.')) return nativeRequire(name);
      const candidate = resolve(dirname(path), name);
      return load(existsSync(`${candidate}.ts`) ? `${candidate}.ts` : `${candidate}.tsx`);
    } };
    if (windowValue !== undefined) context.window = windowValue;
    vm.runInNewContext(source, context, { filename: path });
    return exports;
  }
  return load;
}
const load = loader();
const core = load('lib/practiceCore.ts');
const data = load('lib/practiceData.ts');
const sessions = load('lib/practiceSessions.ts');
const moduleSession = load('lib/moduleSession.ts');
const plain = value => JSON.parse(JSON.stringify(value));

test('character library has genuine, unique compositions and every quiz includes exactly one target part', () => {
  assert.equal(new Set(data.PRACTICE_CHARACTERS.map(c => c.result)).size, data.PRACTICE_CHARACTERS.length);
  assert.ok(data.PRACTICE_CHARACTERS.length >= 40);
  for (const character of data.PRACTICE_CHARACTERS) {
    assert.notEqual(character.candidate, character.result, character.result);
    assert.ok(character.pinyin && character.meaning && character.examples.length);
    const question = sessions.characterQuestion(character.result);
    assert.equal(question.options.length, 9);
    assert.equal(new Set(question.options).size, 9);
    assert.equal(question.options.filter(p => p === character.candidate).length, 1);
  }
  assert.equal(data.PRACTICE_CHARACTERS.find(c => c.result === '谢').candidate, '射');
  assert.equal(data.PRACTICE_CHARACTERS.find(c => c.result === '课').candidate, '果');
});

test('character wrong-answer review resolves on success, repeated successes never inflate learned count', () => {
  let state = sessions.initialCharacter();
  state = sessions.answerCharacter(state, state.options.find(p => p !== '工'));
  assert.deepEqual(Array.from(state.wrong), ['江']);
  state = sessions.answerCharacter(state, '工');
  assert.deepEqual(Array.from(state.learned), ['江']);
  assert.equal(state.wrong.length, 0);
  assert.equal(sessions.answerCharacter(state, '工'), state);
  state = sessions.answerCharacter({ ...state, ...sessions.characterQuestion('江') }, '工');
  assert.equal(state.learned.length, 1);
});

test('legacy character counts and vocabulary due dates migrate without changing source keys or inventing mastery', () => {
  const values = new Map([['char_learned', '17'], ['exbeam.vocabulary.review.v2', '{"101":1790000000000,"201":1790000300000,"bad":"not a date"}']]);
  const before = JSON.stringify([...values]);
  const legacy = loader({ localStorage: { getItem: key => values.get(key) || null } })('lib/practiceSessions.ts');
  assert.equal(legacy.initialCharacter().legacyLearned, 17);
  assert.equal(legacy.initialCharacter().learned.length, 0);
  const state = legacy.initialVocabulary();
  assert.equal(state.progress['101'].due, 1790000000000);
  assert.equal(state.progress['101'].correct, 0);
  assert.equal(state.progress.bad, undefined);
  assert.equal(JSON.stringify([...values]), before);
});

test('history uses event-specific years, BCE ordering and guaranteed unsolved random initial order', () => {
  assert.equal(data.PRACTICE_HISTORY.find(e => e.id === 'sui').name, '隋朝建立');
  assert.equal(data.PRACTICE_HISTORY.find(e => e.id === 'sui').year, 581);
  assert.match(data.PRACTICE_HISTORY.find(e => e.id === 'sui').description, /589/);
  assert.equal(data.PRACTICE_HISTORY.find(e => e.id === 'three_kings').name, '曹魏建立');
  assert.match(data.PRACTICE_HISTORY.find(e => e.id === 'three_kings').description, /229/);
  assert.equal(core.yearLabel(-221), '公元前221年');
  for (let i = 0; i < 100; i++) {
    const order = sessions.historyQuestion('mixed', 6);
    assert.equal(new Set(order).size, 6);
    const years = order.map(id => data.PRACTICE_HISTORY.find(e => e.id === id).year);
    assert.ok(years.some((year, index) => index && year < years[index - 1]));
  }
});

test('history supports safe moves, chronological checking and content-deduplicated completion', () => {
  let state = sessions.initialHistory();
  state = sessions.checkHistory(state);
  assert.equal(state.result, 'wrong');
  assert.ok(state.wrong.length);
  const ordered = [...state.order].sort((a, b) => data.PRACTICE_HISTORY.find(e => e.id === a).year - data.PRACTICE_HISTORY.find(e => e.id === b).year);
  state = sessions.checkHistory({ ...state, order: ordered, result: 'pending' });
  assert.equal(state.result, 'correct'); assert.equal(state.completed.length, 1); assert.equal(state.learned.length, 4); assert.equal(state.wrong.length, 0);
  assert.equal(sessions.checkHistory(state), state);
  assert.equal(sessions.checkHistory({ ...state, result: 'pending' }).completed.length, 1);
  assert.deepEqual(plain(core.moveItem(['a', 'b', 'c'], 0, 2)), ['b', 'c', 'a']);
  const original = ['a']; assert.equal(core.moveItem(original, -1, 0), original);
});

test('clock carries hours across midnight, keeps exact hour hand position and supports noon/midnight', () => {
  assert.equal(core.dragClock(23 * 60 + 59, 'minute', 0), 0);
  assert.equal(core.dragClock(0, 'minute', 354), 1439);
  assert.equal(core.dragClock(11 * 60 + 30, 'hour', 15), 12 * 60 + 30);
  assert.equal(core.timeLabel(0, '12'), '上午 12:00');
  assert.equal(core.timeLabel(720, '12'), '下午 12:00');
  assert.equal(core.timeLabel(-1), '23:59');
  for (const step of [1, 5, 30]) for (let i = 0; i < 100; i++) { const target = core.clockTarget(step); assert.ok(target >= 0 && target < 1440); assert.equal(target % step, 0); assert.notEqual(core.clockTarget(step, target, () => target / 1440), target); }
  const initial = sessions.initialClock();
  assert.equal(sessions.parsedClockInput({ ...initial, format: '12', hour: '12', minute: '00', pm: false }), 0);
  assert.equal(sessions.parsedClockInput({ ...initial, format: '12', hour: '12', minute: '00', pm: true }), 720);
  for (const [hour, minute] of [['24', '00'], ['01', '60'], ['', '00']]) assert.equal(sessions.parsedClockInput({ ...initial, hour, minute }), null);
});

test('clock checks AM/PM, deduplicates successes and removes successfully reviewed times', () => {
  let state = { ...sessions.initialClock(), mode: 'read', target: 13 * 60 + 15 };
  state = sessions.checkClock(state, 75); assert.equal(state.feedback, 'wrong'); assert.equal(state.wrong.length, 1);
  state = sessions.checkClock(state, 795); assert.equal(state.feedback, 'correct'); assert.equal(state.wrong.length, 0); assert.equal(state.solved.length, 1);
  assert.equal(sessions.checkClock(state, 795), state);
  assert.equal(sessions.checkClock({ ...state, feedback: 'pending' }, 795).solved.length, 1);
});

test('math generators obey each range and operation, division is exact and never by zero', () => {
  for (const level of [20, 100, 1000]) for (const op of ['+', '-', '×', '÷']) for (let i = 0; i < 300; i++) {
    const question = core.mathQuestion({ level, operations: [op], duration: 30 }, String(i));
    assert.ok(core.validMathQuestion(question), JSON.stringify(question));
    assert.ok(question.answer >= 0 && question.answer <= level);
    assert.ok(question.a <= level && question.b <= level);
    if (op === '÷') { assert.ok(question.b > 0); assert.equal(question.a % question.b, 0); }
  }
});

test('math only scores complete explicit answers, invalid input preserves progress and expired submissions cannot score', () => {
  let run = core.createMathRun(core.DEFAULT_MATH, 1000, [], 'test');
  run = { ...run, question: { id: 'test-0', a: 12, b: 3, op: '+', answer: 15 }, input: '1' };
  assert.equal(run.attempts.length, 0);
  const invalid = core.submitMath({ ...run, input: '15oops' }, 1001);
  assert.equal(invalid.attempts.length, 0); assert.equal(invalid.question.id, 'test-0');
  let answered = core.submitMath({ ...run, input: '15' }, 1001);
  assert.equal(answered.attempts.length, 1); assert.equal(core.mathStats(answered.attempts).score, 10);
  assert.ok(core.validMathRun(answered));
  const late = core.submitMath({ ...run, input: '15' }, run.deadline);
  assert.equal(late.status, 'result'); assert.equal(core.mathStats(late.attempts).score, 0); assert.ok(core.validMathRun(late));
  assert.equal(core.finishMath(late), late);
});

test('math stores all wrong/skipped questions, complete finite wrong-answer retry has no phantom final question', () => {
  const q = { id: 'old', a: 6, b: 4, op: '×', answer: 24 };
  let run = core.createMathRun(core.DEFAULT_MATH, 1000, [q], 'retry');
  run = core.submitMath({ ...run, input: '24' }, 1001);
  assert.equal(run.status, 'result'); assert.equal(run.attempts.length, 1); assert.equal(core.mathStats(run.attempts).score, 10); assert.ok(core.validMathRun(run));
  const skip = core.submitMath(core.createMathRun(core.DEFAULT_MATH, 1000, [q], 'skip'), 1001, true);
  assert.equal(skip.attempts[0].response, ''); assert.equal(skip.attempts[0].correct, false);
  assert.equal(skip.status, 'result');
});

test('puzzles require an answer before revealing explanation; drafts, hints, bookmarks and review survive question changes', () => {
  assert.equal(new Set(data.PRACTICE_PUZZLES.map(p => p.category)).size, 4);
  for (const puzzle of data.PRACTICE_PUZZLES) { assert.equal(new Set(puzzle.options).size, 4); assert.ok(puzzle.options.includes(puzzle.answer)); assert.ok(puzzle.explanation.length > 20); }
  let state = sessions.initialPuzzle();
  assert.equal(sessions.checkPuzzle(state), state);
  state = { ...state, selected: '桌子', hints: 1, saved: ['BT_001'] };
  state = sessions.openPuzzle(state, 'BT_003'); state = sessions.openPuzzle(state, 'BT_001');
  assert.equal(state.selected, '桌子'); assert.equal(state.hints, 1); assert.equal(state.saved.length, 1);
  state = sessions.checkPuzzle(state); assert.equal(state.submitted, true); assert.equal(state.wrong.length, 1);
  assert.equal(sessions.checkPuzzle(state), state);
  state = sessions.checkPuzzle({ ...state, submitted: false, selected: '人' });
  assert.equal(state.solved.length, 1); assert.equal(state.wrong.length, 0); assert.ok(sessions.validPuzzle(state));
  assert.match(data.PRACTICE_PUZZLES.find(p => p.id === 'BT_004').explanation, /陆地冰川/);
});

test('word bank preserves original IDs and provides local definitions, examples and translations', () => {
  assert.ok(data.PRACTICE_WORDS.length >= 30);
  assert.equal(new Set(data.PRACTICE_WORDS.map(w => w.id)).size, data.PRACTICE_WORDS.length);
  for (const id of [101, 102, 110, 201, 210, 901, 902, 903]) assert.ok(data.PRACTICE_WORDS.find(w => w.id === id));
  for (const word of data.PRACTICE_WORDS) assert.ok(word.word && word.phonetic && word.definition && word.example && word.translation);
  assert.equal(core.normalizeWord('  ＡＰＰＬＥ  '), 'apple');
  const one = core.shuffle([1, 2, 3, 4, 5], core.seededRandom('stable'));
  assert.deepEqual(plain(one), plain(core.shuffle([1, 2, 3, 4, 5], core.seededRandom('stable'))));
});

test('vocabulary self-ratings are not test results, wrong words require an actual correct test to clear', () => {
  const selfRated = core.updateWordProgress(undefined, true, false, 1000);
  assert.equal(selfRated.correct, 0); assert.equal(selfRated.due, 86401000);
  let progress = core.updateWordProgress(selfRated, false, true, 2000);
  assert.equal(progress.wrong, true); assert.equal(progress.due, 3602000);
  progress = core.updateWordProgress(progress, true, false, 3000); assert.equal(progress.wrong, true); assert.equal(progress.correct, 0);
  progress = core.updateWordProgress(progress, true, true, 4000); assert.equal(progress.wrong, false); assert.equal(progress.correct, 1);
  progress = core.updateWordProgress(progress, true, true, 5000); assert.equal(progress.correct, 2); assert.equal(progress.due, 3 * 86400000 + 5000);
});

test('every session validates its defaults, rejects broken shapes and storage failures fall back safely', () => {
  const checks = [[sessions.initialCharacter, sessions.validCharacter], [sessions.initialHistory, sessions.validHistory], [sessions.initialClock, sessions.validClock], [sessions.initialPuzzle, sessions.validPuzzle], [sessions.initialVocabulary, sessions.validVocabulary]];
  for (const [initial, validate] of checks) {
    assert.ok(validate(initial()));
    for (const invalid of [null, 0, 'bad', [], {}, { wrong: null }, { current: '__proto__' }]) assert.equal(validate(invalid), false);
    const fallback = initial();
    for (const raw of ['{broken', 'null', '{}', '[]']) {
      const result = moduleSession.readModuleSession({ getItem: () => raw }, 'key', fallback, validate);
      assert.equal(result.value, fallback); assert.equal(result.restored, false);
    }
    assert.equal(moduleSession.readModuleSession(null, 'key', fallback, validate).available, false);
    assert.equal(moduleSession.readModuleSession({ getItem() { throw new Error('denied'); } }, 'key', fallback, validate).value, fallback);
    assert.equal(moduleSession.readModuleSession({ getItem: () => JSON.stringify(fallback) }, 'key', fallback, validate).restored, true);
  }
  assert.equal(core.validMathRun({ ...core.createMathRun(), deadline: null }), false);
});

test('all six workbenches render actual exercises without browser-only APIs or remote infrastructure', () => {
  for (const name of ['CharacterApp', 'HistorySortingApp', 'ClockApp', 'MathSprintApp', 'BrainTeaseApp', 'VocabularyApp']) {
    const component = load(`components/${name}.tsx`).default;
    const html = renderToStaticMarkup(React.createElement(component, { onClose() {} }));
    assert.match(html, /workbench practice/);
    assert.ok(html.length > 1000, name);
    assert.match(html, /practice-stage|practice-order/, name);
    const source = readFileSync(resolve(`components/${name}.tsx`), 'utf8');
    assert.doesNotMatch(source, /\b(?:alert|confirm)\s*\(|picsum|dataService|queryNeon|SELECT\s+\*/i, name);
    assert.doesNotMatch(source, /replaceAll|Object\.hasOwn/, name);
  }
});

test('all six modules also render with corrupted or denied local storage and unsupported speech', () => {
  for (const localStorage of [{ getItem: () => '{bad', setItem() {} }, { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } }]) {
    const brokenLoad = loader({ localStorage });
    for (const name of ['CharacterApp', 'HistorySortingApp', 'ClockApp', 'MathSprintApp', 'BrainTeaseApp', 'VocabularyApp']) {
      assert.doesNotThrow(() => renderToStaticMarkup(React.createElement(brokenLoad(`components/${name}.tsx`).default, { onClose() {} })), name);
    }
  }
});

test('math restored exercise renders the real answer form and finished runs render their complete answer table', () => {
  const question = { id: 'render-0', a: 12, b: 3, op: '+', answer: 15 };
  const run = { ...core.createMathRun(core.DEFAULT_MATH, Date.now(), [], 'render'), question, input: '1' };
  const render = value => {
    const component = loader({ localStorage: { getItem: key => key === 'exbeam.practice.math.run.v1' ? JSON.stringify(value) : null } })('components/MathSprintApp.tsx').default;
    return renderToStaticMarkup(React.createElement(component, { onClose() {} }));
  };
  const playing = render(run);
  assert.match(playing, /<form[^>]*class="practice-stage"/);
  assert.match(playing, /aria-label="心算答案"[^>]*value="1"/);
  assert.match(playing, /提交答案/);
  assert.match(playing, /12 \+ 3 等于多少/);
  assert.doesNotMatch(playing, /开始挑战/);
  const paused = render({ ...run, status: 'paused', deadline: null });
  assert.match(paused, /已暂停/);
  assert.match(paused, /aria-label="心算答案"[^>]*disabled=""[^>]*value="1"/);
  const answered = core.submitMath({ ...run, input: '15' });
  const result = render(core.finishMath(answered));
  assert.match(result, /<table class="practice-table"/);
  assert.match(result, /正确答案/);
  assert.match(result, /错题再练/);
  assert.match(result, /<td>12 \+ 3<\/td>/);
});
