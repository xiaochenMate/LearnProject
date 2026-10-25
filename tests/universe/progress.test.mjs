import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

// Load the browser's pure data/storage modules without introducing a test bundler.
function loadModules(storage = new Map()) {
  const cache = new Map();
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText;
    vm.runInNewContext(
      source,
      {
        exports,
        localStorage,
        require: (name) => load(resolve(dirname(file), `${name}.ts`)),
      },
      { filename: file },
    );
    return exports;
  }
  return { load, localStorage };
}
const dataPath = resolve('lib/universeData.ts');
const progressPath = resolve('lib/universeProgress.ts');

test('all four scales and route stops have complete, reachable records', () => {
  const {
    COSMIC_OBJECTS,
    COSMIC_BY_ID,
    UNIVERSE_SCALES,
    EXPLORATION_ROUTE,
    SCALE_QUESTIONS,
  } = loadModules().load(dataPath);
  assert.equal(COSMIC_OBJECTS.length, 26);
  assert.equal(COSMIC_BY_ID.size, COSMIC_OBJECTS.length);
  for (const scale of UNIVERSE_SCALES) {
    assert.equal(COSMIC_BY_ID.get(scale.defaultId).scale, scale.id);
    const question = SCALE_QUESTIONS[scale.id];
    assert.ok(question.options[question.answer]);
  }
  for (const object of COSMIC_OBJECTS) {
    assert.ok(UNIVERSE_SCALES.some((scale) => scale.id === object.scale));
    assert.ok(
      object.description &&
        object.observation &&
        object.source.startsWith('https://'),
    );
    assert.ok(object.stats.length >= 4);
    if (object.image)
      assert.ok(existsSync(resolve(`public${object.image}`)), object.image);
    if (object.enterScale)
      assert.ok(
        UNIVERSE_SCALES.some((scale) => scale.id === object.enterScale),
      );
  }
  for (const id of EXPLORATION_ROUTE) assert.ok(COSMIC_BY_ID.has(id), id);
});

test('migrates solar progress, deduplicates IDs, and preserves new notes', () => {
  const store = new Map([
    ['exbeam.solar.visited.v1', '["earth","saturn","invalid"]'],
    ['exbeam.solar.observed.v1', '["moon"]'],
  ]);
  const { readUniverseProgress, saveUniverseProgress } =
    loadModules(store).load(progressPath);
  const progress = readUniverseProgress();
  assert.deepEqual(Array.from(progress.visited), ['earth', 'saturn']);
  assert.deepEqual(Array.from(progress.observed), ['moon']);
  progress.selectedId = 'orion';
  progress.notes.orion = 'A stellar nursery';
  progress.observed = [];
  assert.equal(saveUniverseProgress(progress), true);
  assert.equal(
    JSON.parse(store.get('exbeam.universe.progress.v1')).notes.orion,
    'A stellar nursery',
  );
  assert.equal(
    readUniverseProgress().observed.length,
    0,
    'legacy observations must not resurrect after being unchecked',
  );
});

test('corrupt legacy storage cannot erase valid universe progress', () => {
  const store = new Map([
    ['exbeam.solar.visited.v1', 'corrupt'],
    [
      'exbeam.universe.progress.v1',
      JSON.stringify({
        selectedId: 'andromeda',
        visited: ['andromeda'],
        observed: [],
        notes: { andromeda: 'Look back in time' },
      }),
    ],
  ]);
  const progress = loadModules(store).load(progressPath).readUniverseProgress();
  assert.equal(progress.selectedId, 'andromeda');
  assert.equal(progress.notes.andromeda, 'Look back in time');
});

test('invalid records are dropped and notes are capped', () => {
  const store = new Map([
    [
      'exbeam.universe.progress.v1',
      JSON.stringify({
        selectedId: 'nope',
        visited: ['earth', 42, 'nope'],
        observed: null,
        notes: { earth: 'x'.repeat(600), nope: 'bad', moon: 12 },
        quizzes: ['solar', 'solar', 'bad'],
      }),
    ],
  ]);
  const progress = loadModules(store).load(progressPath).readUniverseProgress();
  assert.equal(progress.selectedId, 'solar-system');
  assert.deepEqual(Array.from(progress.visited), ['earth']);
  assert.equal(progress.notes.earth.length, 500);
  assert.equal(Object.keys(progress.notes).length, 1);
  assert.deepEqual(Array.from(progress.quizzes), ['solar']);
});

test('storage denial returns a usable workspace and reports unsaved state', () => {
  const { load, localStorage } = loadModules();
  localStorage.getItem = () => {
    throw new Error('denied');
  };
  localStorage.setItem = () => {
    throw new Error('quota exceeded');
  };
  const { readUniverseProgress, saveUniverseProgress } = load(progressPath);
  const progress = readUniverseProgress();
  assert.equal(progress.selectedId, 'solar-system');
  assert.equal(saveUniverseProgress(progress), false);
});
