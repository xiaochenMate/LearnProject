import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

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
        URLSearchParams,
        Date,
        require: (name) => name.startsWith('.') ? load(resolve(dirname(file), `${name}.ts`)) : nodeRequire(name),
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
  assert.equal(COSMIC_OBJECTS.length, 44);
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

test('every space has a valid address and entering then leaving restores its portal', () => {
  const { load } = loadModules();
  const { COSMIC_BY_ID } = load(dataPath);
  const nav = load(resolve('lib/universeNavigation.ts'));
  for (const context of nav.UNIVERSE_CONTEXTS.values()) {
    assert.ok(context.objectIds.includes(context.defaultId), context.id);
    assert.ok(
      context.objectIds.every((id) => COSMIC_BY_ID.has(id)),
      context.id,
    );
    const address = nav.universeAddress(context.id);
    assert.equal(address[0].id, 'universe');
    assert.equal(new Set(address.map((item) => item.id)).size, address.length);
    if (context.parentId) {
      const parent = nav.UNIVERSE_CONTEXTS.get(context.parentId);
      assert.ok(parent.objectIds.includes(context.portalId), context.id);
      const from = {
        contextId: parent.id,
        selectedId: context.portalId,
        overview: false,
      };
      const into = nav.enterLocation(from);
      assert.equal(into.contextId, context.id);
      assert.equal(nav.leaveLocation(into).contextId, parent.id);
      assert.equal(nav.leaveLocation(into).selectedId, context.portalId);
    }
  }
});

test('a continuous journey reaches the Moon and returns one level at a time', () => {
  const nav = loadModules().load(resolve('lib/universeNavigation.ts'));
  let location = nav.contextLocation('universe');
  for (const [portal, expected] of [
    ['cosmic-web', 'cosmic-web'],
    ['local-group', 'local-group'],
    ['milky-way', 'milky-way'],
    ['solar-system', 'solar-system'],
    ['earth', 'earth'],
    ['moon', 'detail:moon'],
  ]) {
    location = nav.enterLocation({ ...location, selectedId: portal });
    assert.equal(location.contextId, expected);
  }
  assert.equal(nav.universeAddress(location.contextId).length, 7);
  assert.equal(
    nav.enterLocation(location),
    null,
    'a close-up must not recurse',
  );
  const ancestors = [];
  while ((location = nav.leaveLocation(location)))
    ancestors.push(location.contextId);
  assert.deepEqual(ancestors, [
    'earth',
    'solar-system',
    'milky-way',
    'local-group',
    'cosmic-web',
    'universe',
  ]);
});

test('other galaxies and planetary systems do not borrow the Milky Way catalogue', () => {
  const nav = loadModules().load(resolve('lib/universeNavigation.ts'));
  assert.deepEqual(
    Array.from(nav.UNIVERSE_CONTEXTS.get('andromeda').objectIds),
    ['andromeda-core'],
  );
  assert.deepEqual(
    Array.from(nav.UNIVERSE_CONTEXTS.get('triangulum').objectIds),
    ['ngc604'],
  );
  assert.deepEqual(Array.from(nav.UNIVERSE_CONTEXTS.get('lmc').objectIds), [
    'tarantula',
  ]);
  assert.ok(
    !nav.UNIVERSE_CONTEXTS.get('local-group').objectIds.includes('whirlpool'),
  );
  assert.ok(
    !nav.UNIVERSE_CONTEXTS.get('virgo-cluster').objectIds.includes('milky-way'),
  );
  for (const [child, parent] of [
    ['europa', 'jupiter'],
    ['titan', 'saturn'],
    ['triton', 'neptune'],
    ['proxima-b', 'proxima'],
  ]) {
    assert.equal(nav.locationForObject(child).contextId, parent);
  }
});

test('zoom boundaries require deliberate focused inward or sufficiently wide outward travel', () => {
  const { zoomDestination } = loadModules().load(
    resolve('lib/universeNavigation.ts'),
  );
  const boundary = {
    direction: 'in',
    distance: 57,
    focusDistance: 100,
    overviewDistance: 500,
    focused: true,
    canEnter: true,
    canLeave: true,
  };
  assert.equal(zoomDestination(boundary), 'in');
  assert.equal(zoomDestination({ ...boundary, focused: false }), null);
  assert.equal(zoomDestination({ ...boundary, canEnter: false }), null);
  assert.equal(zoomDestination({ ...boundary, distance: 70 }), null);
  assert.equal(
    zoomDestination({ ...boundary, direction: 'out', distance: 621 }),
    'out',
  );
  assert.equal(
    zoomDestination({
      ...boundary,
      direction: 'out',
      distance: 621,
      canLeave: false,
    }),
    null,
  );
});

test('every object has four science sections, a glossary, valid related objects and sources', () => {
  const { load } = loadModules();
  const { COSMIC_OBJECTS, COSMIC_BY_ID } = load(dataPath);
  const { SCIENCE_ARTICLES, ASTRONOMY_TERMS, scienceSearchText } = load(
    resolve('lib/universeScience.ts'),
  );
  assert.equal(SCIENCE_ARTICLES.size, COSMIC_OBJECTS.length);
  assert.ok(
    scienceSearchText('sun').includes('日冕'),
    'knowledge search includes the science article body',
  );
  for (const object of COSMIC_OBJECTS) {
    const article = SCIENCE_ARTICLES.get(object.id);
    assert.equal(article.sections.length, 4, object.id);
    assert.ok(
      article.sections.every(
        (section) => section.text.length >= 22 && section.title,
      ),
    );
    assert.ok(
      article.terms.every((term) => ASTRONOMY_TERMS[term]),
      object.id,
    );
    assert.ok(
      article.related.every((id) => COSMIC_BY_ID.has(id) && id !== object.id),
      object.id,
    );
    assert.ok(
      article.sources.length >= 2 &&
        article.sources.every((source) => source.url.startsWith('https://')),
    );
    assert.ok(scienceSearchText(object.id).includes(object.name.toLowerCase()));
  }
});

test('new spatial position persists without losing legacy observations or notes', () => {
  const store = new Map([
    [
      'exbeam.universe.progress.v1',
      JSON.stringify({
        selectedId: 'moon',
        visited: ['moon'],
        notes: { moon: 'The far side also has daylight.' },
        location: {
          contextId: 'detail:moon',
          selectedId: 'moon',
          overview: false,
        },
      }),
    ],
  ]);
  const { readUniverseProgress, saveUniverseProgress } =
    loadModules(store).load(progressPath);
  const progress = readUniverseProgress();
  assert.equal(progress.location.contextId, 'detail:moon');
  assert.equal(progress.notes.moon, 'The far side also has daylight.');
  assert.ok(saveUniverseProgress(progress));
  assert.equal(readUniverseProgress().location.selectedId, 'moon');
});

test('malformed and impossible spatial addresses are sanitized', () => {
  const nav = loadModules().load(resolve('lib/universeNavigation.ts'));
  for (const raw of [
    null,
    [],
    { contextId: 'andromeda', selectedId: 'earth' },
    { contextId: 'nope', selectedId: 'earth' },
  ]) {
    assert.equal(nav.sanitizeLocation(raw).contextId, 'universe');
  }
  assert.equal(
    nav.sanitizeLocation({
      contextId: 'detail:moon',
      selectedId: 'moon',
      overview: true,
    }).overview,
    false,
  );
});

test('shared URLs resolve the same space and reject an impossible member', () => {
  const nav = loadModules().load(resolve('lib/universeNavigation.ts'));
  const location = nav.locationFromSearch(
    '?module=e1&space=detail%3Amoon&object=moon',
  );
  assert.equal(location.contextId, 'detail:moon');
  assert.equal(location.selectedId, 'moon');
  assert.equal(nav.locationFromSearch('?object=europa').contextId, 'jupiter');
  assert.equal(
    nav.locationFromSearch('?space=andromeda&object=earth').contextId,
    'universe',
  );
  assert.equal(nav.locationFromSearch('?space=unknown'), null);
  assert.equal(nav.locationFromSearch(''), null);
});

test('eleven representative moons have one canonical parent and four Galilean siblings', () => {
  const { load } = loadModules();
  const { SATELLITE_ORBITS, SATELLITE_SYSTEMS } = load(resolve('lib/solarSystemModel.ts'));
  const nav = load(resolve('lib/universeNavigation.ts'));
  assert.equal(Object.keys(SATELLITE_ORBITS).length, 11);
  assert.deepEqual(Array.from(SATELLITE_SYSTEMS.jupiter), ['io', 'europa', 'ganymede', 'callisto']);
  for (const [id, orbit] of Object.entries(SATELLITE_ORBITS)) {
    assert.equal(nav.locationForObject(id).contextId, orbit.parent);
    assert.ok(nav.UNIVERSE_CONTEXTS.get(orbit.parent).objectIds.includes(id));
    assert.ok(orbit.radiusKm > 0 && orbit.axisKm > orbit.radiusKm && orbit.periodDays > 0);
  }
});

test('ephemerides retain astronomical distances, poles and differing orbital periods', () => {
  const model = loadModules().load(resolve('lib/solarSystemModel.ts'));
  const date = new Date('2026-10-25T12:00:00Z');
  const state = model.solarState(date);
  const length = (v) => Math.hypot(...v);
  assert.ok(length(state.positions.earth) > 0.98 && length(state.positions.earth) < 1.02);
  assert.ok(length(state.positions.moon) > 0.0023 && length(state.positions.moon) < 0.0028);
  assert.ok(state.north.earth[1] > 0.91 && state.north.earth[1] < 0.93, 'Earth has a tilted axis');
  const next = model.solarState(new Date(date.getTime() + 3600000));
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, x, i) => sum + x * b[i], 0) / length(a) / length(b))));
  const io = angle(state.positions.io, next.positions.io);
  const europa = angle(state.positions.europa, next.positions.europa);
  const ganymede = angle(state.positions.ganymede, next.positions.ganymede);
  assert.ok(io / europa > 1.8 && io / europa < 2.2);
  assert.ok(europa / ganymede > 1.8 && europa / ganymede < 2.2);
  const triton = model.satelliteNorth('triton', state);
  assert.ok(triton.reduce((sum, x, i) => sum + x * state.north.neptune[i], 0) < -0.9, 'Triton is retrograde');
});

test('display compression preserves directions, parent-relative tracks and orbital ordering', () => {
  const model = loadModules().load(resolve('lib/solarSystemModel.ts'));
  const date = new Date('2026-10-25T12:00:00Z');
  const state = model.solarState(date);
  const radii = ['io', 'europa', 'ganymede', 'callisto'].map((id) => model.satelliteDisplayRadius(id, 17, false));
  assert.ok(radii.every((r, i) => i === 0 || r > radii[i - 1]));
  for (const id of Object.keys(model.SATELLITE_ORBITS)) {
    const offset = model.satelliteDisplayPosition(id, state.positions[id], 10, false);
    const path = model.satelliteOrbitPath(id, date, 10, false);
    assert.equal(path.length, 96);
    assert.ok(path.every((v) => v.every(Number.isFinite)));
    assert.ok(Math.hypot(...offset.map((x, i) => x - path[0][i])) < 1e-8, id);
    const cross = offset.map((x, i) => x / state.positions[id][i]).filter(Number.isFinite);
    assert.ok(cross.every((x) => Math.abs(x - cross[0]) < 1e-5));
  }
});

test('satellite maps, credits, licenses and cloud alpha are shipped locally', () => {
  const { COSMIC_BY_ID } = loadModules().load(dataPath);
  for (const id of ['io', 'europa', 'ganymede', 'callisto', 'enceladus', 'titan', 'titania', 'triton']) {
    const object = COSMIC_BY_ID.get(id);
    const bytes = readFileSync(resolve(`public${object.texture}`));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
  const cloud = readFileSync(resolve('public/images/solar-system/earth-clouds.webp'));
  assert.equal(cloud.toString('ascii', 8, 12), 'WEBP');
  assert.equal(cloud.toString('ascii', 12, 16), 'VP8X');
  assert.ok(cloud[20] & 0x10, 'cloud opacity must survive encoding');
  for (const file of ['SATELLITE-CREDITS.md', 'UPSTREAM-README.txt', 'LICENSES/CC-BY-4.0.txt', 'LICENSES/CC-BY-3.0.txt', 'LICENSES/CC-BY-SA-4.0.txt', 'LICENSES/JPL-image.txt'])
    assert.ok(existsSync(resolve(`public/images/solar-system/${file}`)), file);
});
