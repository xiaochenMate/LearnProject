import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import ts from "typescript";

function load(file, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const source = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  vm.runInNewContext(
    source,
    {
      exports,
      require: (name) => load(resolve(dirname(path), `${name}.ts`), cache),
      console,
    },
    { filename: path },
  );
  return exports;
}
const catalog = load("lib/experienceCatalog.ts");
const store = load("lib/explorerStore.ts");
const physics = load("lib/wavePhysics.ts");
const ecology = load("lib/ecology.ts");
const entry = (overrides = {}) => ({
  id: "d1",
  key: "wave-cancel",
  moduleId: "e3",
  kind: "experiment",
  title: "Verified",
  detail: "A real experiment",
  createdAt: "2026-10-25T01:00:00Z",
  ...overrides,
});

test("every existing experience has complete catalog metadata and local covers exist", () => {
  assert.equal(catalog.EXPERIENCES.length, 20);
  assert.equal(catalog.EXPERIENCE_BY_ID.size, 20);
  assert.equal(catalog.FEATURED_EXPERIENCES.length, 6);
  for (const item of catalog.EXPERIENCES) {
    assert.ok(
      item.title &&
        item.description &&
        item.group &&
        item.prompt &&
        item.format,
      item.id,
    );
    assert.ok(item.minutes > 0);
    if (item.cover.startsWith("/"))
      assert.ok(existsSync(resolve(`public${item.cover}`)), item.cover);
  }
  assert.equal(catalog.searchExperiences("波动").length, 1);
  assert.equal(catalog.searchExperiences("宇宙", "strategy").length, 0);
  assert.equal(catalog.searchExperiences("3D").length, 2);
});

test("every experience has unique local cover artwork and a lightweight responsive variant", () => {
  const manifest = JSON.parse(
    readFileSync(resolve("design/experience-covers-v1.json"), "utf8"),
  );
  assert.equal(manifest.assets.length, catalog.EXPERIENCES.length);
  assert.equal(new Set(manifest.assets.map((asset) => asset.id)).size, 20);
  assert.equal(new Set(catalog.EXPERIENCES.map((item) => item.cover)).size, 20);
  assert.equal(
    new Set(catalog.EXPERIENCES.map((item) => item.coverSmall)).size,
    20,
  );
  let bytes = 0;
  const artworkHashes = new Set();
  for (const item of catalog.EXPERIENCES) {
    assert.ok(
      manifest.assets.some(
        (asset) => asset.id === item.id && asset.prompt.length > 100,
      ),
      item.id,
    );
    for (const cover of [item.cover, item.coverSmall]) {
      assert.ok(
        cover.startsWith("/images/covers/") && cover.endsWith(".webp"),
        cover,
      );
      const path = resolve(`public${cover}`);
      const data = readFileSync(path);
      assert.equal(data.toString("ascii", 0, 4), "RIFF", cover);
      assert.equal(data.toString("ascii", 8, 12), "WEBP", cover);
      assert.ok(statSync(path).size <= 160_000, `Oversized cover: ${cover}`);
      bytes += data.length;
      if (cover === item.cover)
        artworkHashes.add(createHash("sha256").update(data).digest("hex"));
    }
  }
  assert.equal(
    artworkHashes.size,
    20,
    "Each module must have its own artwork, not a reused file",
  );
  assert.ok(
    bytes <= 2_000_000,
    `Cover collection exceeds its size budget: ${bytes}`,
  );
});

test("legacy bookmarks and real usage migrate without fabricating outcomes or modifying source keys", () => {
  const data = new Map([
    ["exbeam.saved.v1", '["e1","u1","unknown"]'],
    [
      "exbeam.usage.v1",
      JSON.stringify({
        e1: {
          launches: 9,
          lastOpened: "2026-10-25T01:00:00Z",
          totalSeconds: 123,
          sessions: [],
        },
      }),
    ],
  ]);
  const before = JSON.stringify([...data]);
  const migrated = store.readExplorerStore({
    getItem: (key) => data.get(key) || null,
  });
  assert.deepEqual(Array.from(migrated.saved), ["e1", "u1"]);
  assert.equal(migrated.sessions[0].seconds, 123);
  assert.equal(migrated.discoveries.length, 0);
  assert.equal(JSON.stringify([...data]), before);
});

test("evidence is deduplicated by real module result rather than by launch", () => {
  const initial = store.emptyExplorerStore();
  const first = store.addDiscovery(initial, entry());
  const repeated = store.addDiscovery(first, entry({ id: "d2" }));
  assert.equal(first, repeated);
  const updated = store.addDiscovery(
    first,
    entry({ id: "d3", detail: "Updated measurements" }),
  );
  assert.equal(updated.discoveries.length, 1);
  assert.equal(updated.discoveries[0].id, "d1");
  assert.equal(updated.discoveries[0].detail, "Updated measurements");
});

test("backup round trip includes bookmark IDs, drafts, evidence and sessions", () => {
  const original = {
    ...store.emptyExplorerStore(),
    saved: ["e1"],
    drafts: { e1: "A thought" },
    discoveries: [entry()],
    sessions: [
      {
        id: "s1",
        moduleId: "e1",
        seconds: 90,
        startedAt: "2026-10-25T01:00:00Z",
      },
    ],
  };
  const restored = store.parseExplorerBackup(
    JSON.stringify(store.createExplorerBackup(original)),
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(restored)),
    JSON.parse(JSON.stringify(original)),
  );
  assert.throws(() => store.parseExplorerBackup("{broken"));
  assert.throws(() =>
    store.parseExplorerBackup(
      JSON.stringify({ product: "other", data: original }),
    ),
  );
  assert.throws(() =>
    store.parseExplorerBackup(
      JSON.stringify({
        product: "ExBeam",
        format: 2,
        data: { ...original, sessions: null },
      }),
    ),
  );
});

test("import merges, keeps longer sessions, newer evidence and current drafts without duplicates", () => {
  const current = {
    ...store.emptyExplorerStore(),
    saved: ["e1"],
    discoveries: [entry()],
    drafts: { e1: "current" },
    sessions: [
      {
        id: "s1",
        moduleId: "e1",
        seconds: 100,
        startedAt: "2026-10-25T01:00:00Z",
      },
    ],
  };
  const incoming = {
    ...store.emptyExplorerStore(),
    saved: ["u1", "e1"],
    discoveries: [
      entry({ id: "d2", detail: "new", createdAt: "2026-10-25T02:00:00Z" }),
    ],
    drafts: { e1: "older", u1: "art" },
    sessions: [{ ...current.sessions[0], seconds: 40 }],
  };
  const merged = store.mergeExplorerStores(current, incoming);
  assert.deepEqual(Array.from(merged.saved), ["e1", "u1"]);
  assert.equal(merged.discoveries.length, 1);
  assert.equal(merged.discoveries[0].detail, "new");
  assert.equal(merged.sessions[0].seconds, 100);
  assert.equal(merged.drafts.e1, "current");
  assert.equal(merged.drafts.u1, "art");
  assert.equal(
    JSON.stringify(store.mergeExplorerStores(merged, incoming)),
    JSON.stringify(merged),
  );
});

test("invalid records and storage denial have safe fallbacks", () => {
  const invalid = store.normalizeExplorerStore({
    version: 2,
    saved: ["e1", 12, "unknown", "e1"],
    discoveries: [null, entry({ moduleId: "unknown" }), entry()],
    sessions: [
      { id: "s", moduleId: "e1", seconds: Infinity, startedAt: "invalid" },
    ],
    drafts: { unknown: "bad", e1: "x".repeat(2500) },
  });
  assert.deepEqual(Array.from(invalid.saved), ["e1"]);
  assert.equal(invalid.discoveries.length, 1);
  assert.equal(invalid.sessions.length, 0);
  assert.equal(invalid.drafts.e1.length, 2000);
  assert.equal(
    store.writeExplorerStore(invalid, {
      setItem() {
        throw new Error("quota");
      },
    }),
    false,
  );
  assert.equal(
    store.readExplorerStore({
      getItem() {
        throw new Error("denied");
      },
    }).version,
    2,
  );
});

test("damaged newer storage recovers legacy data and keeps the original before writing", () => {
  const values = new Map([
    [store.EXPLORER_STORAGE_KEY, "{damaged"],
    ["exbeam.saved.v1", '["e1"]'],
  ]);
  const storage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
  };
  const recovered = store.readExplorerStore(storage);
  assert.deepEqual(Array.from(recovered.saved), ["e1"]);
  assert.equal(store.writeExplorerStore(recovered, storage), true);
  assert.equal(
    values.get(store.EXPLORER_STORAGE_KEY + ".recovery"),
    "{damaged",
  );
});

test("new discoveries never silently discard older notes after 500 entries", () => {
  const original = {
    ...store.emptyExplorerStore(),
    discoveries: Array.from({ length: 600 }, (_, i) =>
      entry({ id: "d" + i, key: "note-" + i }),
    ),
  };
  const added = store.addDiscovery(
    original,
    entry({ id: "new", key: "new-note" }),
  );
  assert.equal(added.discoveries.length, 601);
  assert.equal(store.normalizeExplorerStore(added).discoveries.length, 601);
});

test("wave superposition produces exact constructive and destructive results", () => {
  const a = { amplitude: 1, frequency: 1, phase: 0 };
  const b = { ...a, phase: 180 };
  assert.equal(physics.resultantAmplitude(a, a), 2);
  assert.ok(physics.resultantAmplitude(a, b) < 1e-7);
  for (let x = 0; x < 20; x += 0.5)
    assert.ok(
      Math.abs(physics.sampleWave(a, x, 0.3) + physics.sampleWave(b, x, 0.3)) <
        1e-10,
    );
  assert.equal(physics.verifyWaveExperiment("destructive", a, b), true);
  assert.equal(physics.verifyWaveExperiment("destructive", a, a), false);
  assert.equal(physics.verifyWaveExperiment("constructive", a, a), true);
  assert.equal(
    physics.verifyWaveExperiment(
      "constructive",
      { ...a, amplitude: 0 },
      { ...a, amplitude: 0 },
    ),
    false,
  );
  assert.equal(
    physics.verifyWaveExperiment("beats", a, { ...a, frequency: 1.2 }),
    true,
  );
  assert.equal(
    physics.verifyWaveExperiment("beats", a, { ...a, frequency: 2 }),
    false,
  );
});

test("ecology enforces real direction, producer, unique members and no decomposition loop", () => {
  assert.equal(
    ecology.validateFoodChain(["grass", "rabbit", "wolf"]).valid,
    true,
  );
  assert.equal(
    ecology.validateFoodChain(["grass", "locust", "frog", "snake", "eagle"])
      .valid,
    true,
  );
  for (const chain of [
    ["grass", "rabbit"],
    ["rabbit", "grass", "wolf"],
    ["grass", "wolf", "rabbit"],
    ["grass", "rabbit", "rabbit"],
    ["grass", "rabbit", "wolf", "mushroom"],
  ])
    assert.equal(
      ecology.validateFoodChain(chain).valid,
      false,
      chain.join(","),
    );
});
