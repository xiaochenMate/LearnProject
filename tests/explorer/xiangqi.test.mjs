import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(file) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(resolve(file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require, Date, performance, console, Blob, URL, setTimeout });
  return exports;
}
const xq = load('lib/xiangqi.ts');
const storage = load('lib/moduleSession.ts');
test('new Xiangqi matches always start with red, even when the human chooses black', () => {
  const session = xq.createXiangqiSession({ human: 'b' });
  assert.equal(xq.restoreXiangqi(session).turn(), 'w');
  assert.equal(xq.restoreXiangqi(session).moves().length, 44);
  assert.equal(xq.validXiangqiSession(session), true);
});
test('rules reject a pinned horse exposing facing generals and illegal moves', () => {
  const game = new xq.Chess('4k4/9/9/9/9/4N4/9/9/9/4K4 w - - 0 1');
  assert.ok(!game.moves({ square: 'e4', verbose: true }).some((move) => move.to === 'f6'));
  assert.throws(() => xq.moveXiangqi(xq.createXiangqiSession(), 'a0', 'b1'));
});
test('capture, move history, PGN export and restore retain the same board', () => {
  const original = xq.createXiangqiSession({ mode: 'local' });
  const changed = xq.moveXiangqi(original, 'b2', 'b9');
  assert.equal(original.moves.length, 0);
  const game = xq.restoreXiangqi(changed);
  assert.equal(game.history({ verbose: true })[0].captured, 'n');
  const imported = new xq.Chess(); imported.loadPgn(game.pgn());
  assert.equal(imported.fen(), game.fen());
  assert.equal(xq.restoreXiangqi(changed, 0).fen(), xq.DEFAULT_POSITION);
});
test('all training answers are legal and advertised mating problems actually mate', () => {
  assert.equal(xq.XIANGQI_PUZZLES.length, 10);
  for (const puzzle of xq.XIANGQI_PUZZLES) for (const answer of puzzle.solutions) {
    const game = new xq.Chess(puzzle.fen);
    assert.ok(game.move(answer), puzzle.id);
    if (puzzle.mate) assert.equal(game.isCheckmate(), true, puzzle.id);
  }
});
test('clock expiry, resignation and corrupted sessions have explicit outcomes', () => {
  const session = xq.createXiangqiSession();
  assert.equal(xq.xiangqiResult(session), null);
  assert.equal(xq.xiangqiResult({ ...session, clocks: { w: 0, b: 600 } }).winner, 'b');
  assert.equal(xq.xiangqiResult({ ...session, resigned: 'b' }).winner, 'w');
  assert.equal(xq.validXiangqiSession({ ...session, moves: ['a0b1'] }), false);
  assert.equal(xq.validXiangqiSession({ ...session, clocks: { w: -1, b: 2 } }), false);
  assert.equal(xq.validXiangqiSession({ ...session, counted: 'yes' }), false);
});
test('bounded local search returns a legal move without mutating the input position', () => {
  for (const level of [1, 2]) {
    const answer = xq.searchXiangqi(xq.DEFAULT_POSITION, level);
    assert.ok(answer.nodes > 0);
    assert.ok(new xq.Chess(xq.DEFAULT_POSITION).moves({ verbose: true }).some((move) => move.lan === answer.move));
  }
});
test('every Xiangqi and international chess piece has its own local vector asset', () => {
  const files = [];
  for (const side of ['red', 'black']) for (const piece of Object.values(xq.XQ_PIECES)) files.push(`xiangqi-${side}-${piece.asset}.svg`);
  for (const side of ['w', 'b']) for (const type of ['p', 'n', 'b', 'r', 'q', 'k']) files.push(`chess-${side}-${type}.svg`);
  assert.equal(new Set(files).size, 26);
  for (const file of files) { const path = resolve(`public/images/pieces/${file}`); assert.ok(existsSync(path)); assert.ok(readFileSync(path, 'utf8').includes('viewBox="0 0 100 100"')); }
});
test('shared module storage rejects corruption and denied access without losing unrelated data', () => {
  const map = new Map([['old-key', 'original']]);
  const adapter = { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  assert.equal(storage.readModuleSession(adapter, 'new', { correct: 0 }).value.correct, 0);
  map.set('new', '{bad'); assert.equal(storage.readModuleSession(adapter, 'new', { correct: 0 }).restored, false);
  map.set('new', '{}'); assert.equal(storage.readModuleSession(adapter, 'new', { correct: 0 }).restored, false);
  map.set('new', '{"correct":3}'); assert.equal(storage.readModuleSession(adapter, 'new', { correct: 0 }).value.correct, 3);
  assert.equal(storage.readModuleSession({ getItem() { throw new Error('denied'); } }, 'x', 0).available, false);
  assert.equal(map.get('old-key'), 'original');
});
