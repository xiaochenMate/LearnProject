import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import vm from "node:vm";
import ts from "typescript";

function load(file, globals = {}, cache = new Map()) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  vm.runInNewContext(
    code,
    {
      exports,
      Blob,
      Uint8Array,
      atob,
      console,
      ...globals,
      require: (name) =>
        load(resolve(dirname(path), `${name}.ts`), globals, cache),
    },
    { filename: path },
  );
  return exports;
}
const physics = load("lib/wavePhysics.ts"),
  wave = load("lib/labsWave.ts"),
  eco = load("lib/labsEcology.ts"),
  money = load("lib/labsCurrency.ts"),
  common = load("lib/labsCommon.ts"),
  art = load("lib/labsArt.ts");
const json = (value) => JSON.parse(JSON.stringify(value));
test("wave presets retain exact superposition and meaningful task outcomes", () => {
  for (const p of wave.WAVE_PRESETS)
    assert.equal(wave.validWaves(p.waves), true);
  assert.equal(
    physics.verifyWaveExperiment(
      "constructive",
      ...wave.WAVE_PRESETS.find((p) => p.id === "same").waves,
    ),
    true,
  );
  assert.equal(
    physics.verifyWaveExperiment(
      "destructive",
      ...wave.WAVE_PRESETS.find((p) => p.id === "cancel").waves,
    ),
    true,
  );
  assert.equal(
    physics.verifyWaveExperiment(
      "beats",
      ...wave.WAVE_PRESETS.find((p) => p.id === "beat").waves,
    ),
    true,
  );
  assert.ok(
    Math.abs(
      physics.resultantAmplitude(
        ...wave.WAVE_PRESETS.find((p) => p.id === "unequal").waves,
      ) - 0.8,
    ) < 1e-10,
  );
});
test("spatial and temporal export samples are computed from the same model and time", () => {
  for (const view of ["space", "time"]) {
    const waves = wave.WAVE_PRESETS[3].waves;
    const rows = wave.sampleWaveTrace(waves, view, 2.3, 1.2);
    assert.equal(rows.length, 601);
    for (const row of rows) {
      const x = view === "space" ? row.axis : 1.2,
        time = view === "time" ? row.axis : 2.3;
      assert.equal(row.a, physics.sampleWave(waves[0], x, time));
      assert.equal(row.b, physics.sampleWave(waves[1], x, time));
      assert.equal(row.sum, row.a + row.b);
    }
  }
});
test("wave session and record validators reject malformed persistent data", () => {
  for (const bad of [
    null,
    [null, null],
    [{ amplitude: Infinity, frequency: 1, phase: 0 }, {}],
    [{ amplitude: 1, frequency: -1, phase: 0 }, {}],
  ])
    assert.equal(wave.validWaves(bad), false);
  assert.equal(
    wave.validWaveRecords([
      {
        id: "x",
        at: "not-date",
        waves: wave.WAVE_PRESETS[0].waves,
        time: 0,
        task: "beats",
        verified: true,
        note: "",
      },
    ]),
    false,
  );
});
test("legacy ecology chains and all existing example chains remain valid", () => {
  assert.deepEqual(
    json(eco.legacyEcoState(["grass", "rabbit", "wolf"]).chain),
    ["grass", "rabbit", "wolf"],
  );
  for (const p of eco.ECO_PRESETS)
    assert.equal(eco.validateLabChain(p.chain, p.habitat).valid, true, p.title);
});

test("ecology seeds only a genuinely new session and preserves explicitly empty or customized history", () => {
  const storage = (values) => ({
    getItem: (key) => (values.has(key) ? values.get(key) : null),
  });
  assert.deepEqual(json(eco.initialEcoState(storage(new Map())).chain), [
    "grass",
    "rabbit",
    "wolf",
  ]);
  assert.deepEqual(
    json(
      eco.initialEcoState(storage(new Map([["exbeam.ecology.v2", "[]"]])))
        .chain,
    ),
    [],
  );
  assert.deepEqual(
    json(
      eco.initialEcoState(
        storage(new Map([["exbeam.ecology.v2", '["grass","locust","frog"]']])),
      ).chain,
    ),
    ["grass", "locust", "frog"],
  );
  const empty = {
    ...eco.legacyEcoState(null),
    habitat: "pond",
    initial: 25000,
  };
  assert.deepEqual(
    json(
      eco.initialEcoState(
        storage(new Map([["exbeam.ecology.lab.v1", JSON.stringify(empty)]])),
      ),
    ),
    json(empty),
  );
  const custom = {
    ...empty,
    chain: ["algae", "zooplankton", "smallfish", "heron"],
  };
  assert.deepEqual(
    json(
      eco.initialEcoState(
        storage(new Map([["exbeam.ecology.lab.v1", JSON.stringify(custom)]])),
      ),
    ),
    json(custom),
  );
  assert.deepEqual(
    json(
      eco.initialEcoState({
        getItem() {
          throw new Error("denied");
        },
      }).chain,
    ),
    [],
  );
});
test("ecology enforces producer, habitat, uniqueness and directional food relations", () => {
  for (const [chain, habitat] of [
    [["grass", "wolf", "rabbit"], "meadow"],
    [["rabbit", "snake", "eagle"], "meadow"],
    [["algae", "rabbit", "heron"], "pond"],
    [["algae", "zooplankton", "zooplankton"], "pond"],
    [["grass", "rabbit", "mushroom"], "meadow"],
  ])
    assert.equal(
      eco.validateLabChain(chain, habitat).valid,
      false,
      chain.join(","),
    );
  assert.deepEqual(json(eco.nextSpecies([], "pond").map((s) => s.id)), [
    "algae",
  ]);
  assert.deepEqual(
    json(eco.nextSpecies(["grass"], "meadow").map((s) => s.id)),
    ["locust", "rabbit"],
  );
  assert.equal(eco.nextSpecies(["grass", "wolf"], "meadow").length, 0);
});
test("energy budgets conserve the modeled split and decay geometrically", () => {
  const chain = eco.ECO_PRESETS[1].chain;
  for (const efficiency of [0.05, 0.1, 0.2]) {
    const rows = eco.energyLevels(chain, 10000, efficiency);
    rows.forEach((r, i) => {
      assert.equal(r.energy, 10000 * efficiency ** i);
      if (i < rows.length - 1)
        assert.ok(Math.abs(r.energy - r.transferred - r.untransferred) < 1e-8);
    });
    assert.ok(rows.every((r, i) => !i || r.energy < rows[i - 1].energy));
  }
  assert.throws(() => eco.energyLevels(chain, -1, 0.1));
  assert.throws(() => eco.energyLevels(chain, 10000, 2));
});
test("ecology configuration cannot restore unknown species or corrupt controls", () => {
  const state = eco.legacyEcoState(["grass", "rabbit", "wolf"]);
  assert.equal(eco.validEcoState(state), true);
  for (const patch of [
    { chain: ["alien"] },
    { initial: Infinity },
    { efficiency: 1 },
    { removed: "frog" },
    { habitat: "ocean" },
  ])
    assert.equal(eco.validEcoState({ ...state, ...patch }), false);
});
const dates = ["2025-01-02", "2025-01-03"];
const snapshot = money.parseRateResponse(
  [
    { base: "CNY", quote: "USD", rate: 0.14, date: dates[0] },
    { base: "CNY", quote: "EUR", rate: 0.13, date: dates[1] },
  ],
  "2025-01-04T00:00:00Z",
);
test("reference rate parsing preserves individual dates, source and retrieval time", () => {
  assert.equal(money.validRateSnapshot(snapshot), true);
  assert.equal(snapshot.date, dates[0]);
  assert.deepEqual(json(money.pairDates(snapshot, "USD", "EUR")), dates);
  assert.equal(snapshot.source, "https://frankfurter.dev/");
  assert.equal(snapshot.fetchedAt, "2025-01-04T00:00:00Z");
  assert.equal(money.pairRate(snapshot, "USD", "EUR"), 0.13 / 0.14);
});
test("invalid, duplicate, wrong-base and future reference data never replace cache", () => {
  for (const rows of [
    [],
    [{ base: "USD", quote: "EUR", rate: 1, date: dates[0] }],
    [{ base: "CNY", quote: "USD", rate: -1, date: dates[0] }],
    [{ base: "CNY", quote: "USD", rate: 1, date: "2025-02-30" }],
    [{ base: "CNY", quote: "USD", rate: 1, date: "2999-01-01" }],
    [
      { base: "CNY", quote: "USD", rate: 1, date: dates[0] },
      { base: "CNY", quote: "USD", rate: 2, date: dates[0] },
    ],
  ])
    assert.throws(() => money.parseRateResponse(rows));
  assert.equal(
    money.validRateSnapshot({ date: dates[0], rates: { CNY: 2, USD: 0.14 } }),
    false,
  );
  assert.equal(
    money.validRateSnapshot({
      date: dates[0],
      rates: { CNY: 1, USD: Infinity },
    }),
    false,
  );
});
test("legacy reference cache remains usable without inventing retrieval timestamps", () => {
  const cache = { date: dates[0], rates: { CNY: 1, USD: 0.14 } };
  assert.equal(money.validRateSnapshot(cache), true);
  assert.equal(cache.fetchedAt, undefined);
  assert.equal(money.pairRate(cache, "USD", "JPY"), null);
  assert.equal(money.pairRate(null, "USD", "USD"), 1);
  assert.equal(money.pairRate(null, "USD", "CNY"), null);
});

test("provider-local dates are accepted near UTC midnight without allowing far-future data", () => {
  class FixedDate extends Date {
    static now() {
      return Date.parse("2026-10-25T16:00:00Z");
    }
  }
  const local = load("lib/labsCurrency.ts", { Date: FixedDate });
  assert.equal(local.validDate("2026-10-26"), true);
  assert.equal(local.validDate("2026-10-27"), false);
});

test("ecology SVG shows current disruption instead of falsely exporting baseline results", () => {
  const state = {
    ...eco.legacyEcoState(eco.ECO_PRESETS[1].chain),
    removed: "frog",
  };
  const svg = eco.ecologyChartSvg(state);
  assert.ok(svg.includes("移除 蛙"));
  assert.equal((svg.match(/0\.000 kJ/g) || []).length, 3);
  assert.ok(svg.includes('opacity="0.15"'));
});
test("fees are deducted in source currency and invalid amounts never become zero quotes", () => {
  assert.deepEqual(json(money.calculateConversion("1000", 0.14, "2", "5")), {
    gross: 140,
    fee: 25,
    net: 136.5,
  });
  for (const [amount, percent, fixed] of [
    ["", "0", "0"],
    ["-1", "0", "0"],
    ["Infinity", "0", "0"],
    ["1e13", "0", "0"],
    ["10", "101", "0"],
    ["10", "0", "11"],
    ["10", "", "0"],
  ])
    assert.equal(money.calculateConversion(amount, 0.14, percent, fixed), null);
  assert.equal(money.calculateConversion("100", null, "0", "0"), null);
  assert.equal(money.calculateConversion("0", 0.14, "0", "0").net, 0);
});
test("monetary display uses actual currency precision rather than always two decimals", () => {
  assert.ok(!money.formatCurrency(1200, "JPY").includes(".00"));
  assert.ok(money.formatCurrency(1200, "USD").includes(".00"));
});
test("CSV exports escape spreadsheet formulas, commas, quotes and line breaks", () => {
  const value = common.csv([
    ["=1+1", "+SUM(A1)", "-cmd", "@cmd", 'a,"b"\nc', -4, 2],
  ]);
  assert.ok(value.startsWith("\uFEFF"));
  assert.ok(value.includes('"\'=1+1"'));
  assert.ok(value.includes('"a,""b""\nc"'));
  assert.ok(value.endsWith('"-4","2"'));
});
test("chart SVG includes real points, axis units and escaped notes", () => {
  const svg = common.lineChartSvg(
    "Chart <test>",
    [
      {
        name: "sum",
        color: "#a0e7cc",
        points: [
          [0, -1],
          [1, 1],
          [2, 0],
        ],
      },
    ],
    "t / s",
    "y / arbitrary",
    "<note>",
  );
  assert.ok(svg.includes("Chart &lt;test&gt;"));
  assert.ok(svg.includes("t / s"));
  assert.ok(svg.includes("90.00,510.00 605.00,140.00 1120.00,325.00"));
  assert.throws(() => common.lineChartSvg("empty", [], "x", "y"));
});
test("storage-denied legacy migrations fall back without throwing", () => {
  const denied = load("lib/labsCommon.ts", {
    window: {
      get localStorage() {
        throw new Error("denied");
      },
    },
  });
  assert.equal(
    denied.readLegacyLab("test", (v) => v ?? "fallback"),
    "fallback",
  );
});
test("art pointer mapping stays correct on scaled and touch canvases", () => {
  assert.deepEqual(
    json(
      art.canvasPoint(250, 190, { left: 50, top: 50, width: 400, height: 280 }),
    ),
    { x: 500, y: 350 },
  );
  assert.deepEqual(
    json(
      art.canvasPoint(-10, 1000, { left: 0, top: 0, width: 400, height: 280 }),
    ),
    { x: 0, y: 700 },
  );
  assert.deepEqual(
    json(art.shapeBounds({ x: 100, y: 100 }, { x: 60, y: 80 }, true)),
    { x: 60, y: 60, width: 40, height: 40, endX: 60, endY: 60 },
  );
});
test("art projects validate dimensions, layer identity, opacity and PNG-only import", async () => {
  const p = {
    version: 1,
    width: 1000,
    height: 700,
    active: "a",
    background: "#ffffff",
    layers: [
      {
        id: "a",
        name: "Layer 1",
        visible: true,
        opacity: 1,
        image: new Blob(["png"], { type: "image/png" }),
      },
    ],
  };
  assert.equal(art.validArtProject(p), true);
  assert.equal(art.validArtProject({ ...p, width: 2000 }), false);
  assert.equal(art.validArtProject({ ...p, active: "unknown" }), false);
  assert.equal(
    art.validArtProject({ ...p, layers: [p.layers[0], p.layers[0]] }),
    false,
  );
  assert.equal(
    art.validArtProject({ ...p, layers: [{ ...p.layers[0], opacity: 2 }] }),
    false,
  );
  await assert.rejects(
    art.parseArtProject(
      JSON.stringify({
        ...p,
        product: "ExBeam Art",
        layers: [{ ...p.layers[0], image: "data:image/svg+xml;base64,AAAA" }],
      }),
    ),
  );
  const parsed = await art.parseArtProject(
    JSON.stringify({
      ...p,
      product: "ExBeam Art",
      layers: [{ ...p.layers[0], image: "data:image/png;base64,cG5n" }],
    }),
  );
  assert.equal(parsed.layers[0].image.type, "image/png");
});
test("four modules use Workbench, real exports and no blocking browser dialogs", () => {
  for (const file of [
    "WaveApp",
    "FoodChainApp",
    "ProArtApp",
    "CurrencyConverterApp",
  ]) {
    const source = readFileSync(`components/${file}.tsx`, "utf8");
    assert.ok(source.includes("<Workbench"), file);
    assert.ok(source.includes("downloadLabFile"), file);
    assert.ok(!/\b(?:alert|confirm)\s*\(/.test(source), file);
  }
});
