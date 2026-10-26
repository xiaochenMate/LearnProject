import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import GoBoard from '@sabaki/go-board';

const external = createRequire(import.meta.url);
const cache = new Map();
function load(file) {
  const path = resolve(file);
  if (cache.has(path)) return cache.get(path);
  const exports = {};
  cache.set(path, exports);
  const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(source, { exports, require: name => name.startsWith('.') ? load(resolve(dirname(path), name.endsWith('.ts') ? name : `${name}.ts`)) : external(name), console, Date, Set, Map }, { filename: path });
  return exports;
}
const core = load('lib/strategyCore.ts');
const chess = load('lib/strategyChess.ts');
const gomoku = load('lib/gobangAI.ts');
const gobang = load('lib/strategyGobang.ts');
const go = load('lib/strategyGo.ts');
const json = value => JSON.parse(JSON.stringify(value));
const settings = { mode: 'computer', human: 0, level: 2, minutes: 10 };
const empty = () => Array.from({ length: 15 }, () => Array(15).fill(0));

test('all three match formats reject malformed clocks, settings, moves and versions', () => {
  for (const [fresh, valid] of [[chess.newChessMatch, chess.validChessMatch], [gobang.newGobangMatch, gobang.validGobangMatch], [go.newGoMatch, go.validGoMatch]]) {
    const match = fresh();
    assert.equal(valid(match), true);
    for (const invalid of [null, [], { ...match, version: 0 }, { ...match, remaining: [NaN, 20] }, { ...match, remaining: [-1, 20] }, { ...match, timeout: 0 }, { ...match, settings: { ...match.settings, minutes: 900 } }, { ...match, moves: [42] }]) assert.equal(valid(invalid), false);
  }
});

test('chess castling and en passant are engine legal, and pinned moves are rejected', () => {
  const castle = chess.importChessPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O');
  const position = chess.replayChess(castle);
  assert.equal(position.get('g1').type, 'k');
  assert.equal(position.get('f1').type, 'r');
  assert.equal(position.get('e1'), null);
  const ep = chess.replayChess(chess.importChessPgn('1. e4 a6 2. e5 d5 3. exd6'));
  assert.equal(ep.get('d6').color, 'w');
  assert.equal(ep.get('d5'), null);
  const pinned = chess.newChessGame();
  assert.equal(pinned.load('4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1'), true);
  assert.equal(pinned.move({ from: 'e2', to: 'f2' }), null);
});

test('all four promotions are real legal choices, never forced to queen', () => {
  for (const type of ['q', 'r', 'b', 'n']) {
    const game = chess.newChessGame();
    game.load('7k/P7/8/8/8/8/8/7K w - - 0 1');
    const result = game.move({ from: 'a7', to: 'a8', promotion: type });
    assert.equal(result.promotion, type);
    assert.equal(game.get('a8').type, type);
  }
});

test('old chess.js FEN syntax acceptance cannot admit broken kings, pawns or castling rights', () => {
  const match = chess.newChessMatch();
  for (const fen of ['8/8/8/8/8/8/8/8 w - - 0 1', '7k/8/8/8/8/8/8/P6K w - - 0 1', '7k/8/8/8/8/8/8/4K3 w K - 0 1', '7k/8/8/8/8/8/7Q/7K w - - 0 1', '7k/8/8/4P3/8/8/8/7K w - d6 0 1']) {
    assert.equal(chess.validChessMatch({ ...match, startFen: fen }), false);
  }
});

test('chess recognizes mate, stalemate and repeated positions; rejects moves after termination', () => {
  const mate = chess.importChessPgn('1. f3 e5 2. g4 Qh4#');
  assert.match(chess.chessResult(chess.replayChess(mate), null), /黑方将死/);
  assert.equal(chess.validChessMatch({ ...mate, moves: [...mate.moves, 'a3'] }), false);
  const stale = chess.newChessGame();
  stale.load('7k/5K2/6Q1/8/8/8/8/8 b - - 0 1');
  assert.equal(chess.chessResult(stale, null), '逼和');
  const repetition = chess.importChessPgn('1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8');
  assert.match(chess.chessResult(chess.replayChess(repetition), null), /三次重复/);
});

test('PGN round trips custom FEN, headers, promotions and timeout result', () => {
  const original = chess.importChessPgn('[Event "Promotion"]\n[SetUp "1"]\n[FEN "7k/P7/8/8/8/8/8/7K w - - 0 1"]\n\n1. a8=N');
  const exported = chess.exportChessPgn(original);
  const restored = chess.importChessPgn(exported);
  assert.equal(restored.startFen, original.startFen);
  assert.deepEqual(json(restored.moves), ['a8=N']);
  assert.equal(restored.headers.Event, 'Promotion');
  const timeout = chess.newChessMatch();
  timeout.remaining[0] = 0;
  timeout.timeout = 0;
  assert.match(chess.exportChessPgn(timeout), /0-1/);
  assert.throws(() => chess.importChessPgn('not a chess game'));
  assert.throws(() => chess.importChessPgn('x'.repeat(250_001)));
  const resigned = chess.importChessPgn('1. e4 e5 0-1');
  assert.match(chess.chessMatchResult(resigned, chess.replayChess(resigned)), /棋谱结果：黑方获胜/);
  assert.match(chess.exportChessPgn(resigned), /0-1/);
});

test('timeout cannot award a win to a bare king or lone minor against bare king', () => {
  const game = chess.newChessGame();
  game.load('7k/8/8/8/8/8/Q7/7K w - - 0 1');
  assert.match(chess.chessResult(game, 0), /和棋/);
  assert.match(chess.chessResult(chess.newChessGame(), 0), /白方超时，黑方获胜/);
});

test('bounded chess AI preserves history/FEN and chooses an engine-legal move at every level', () => {
  const game = chess.replayChess(chess.importChessPgn('1. e4 e5 2. Nf3'));
  const fen = game.fen(), history = game.history().join(' ');
  for (const level of [1, 2, 3]) {
    const move = chess.bestChessMove(game, level);
    assert.ok(game.moves().includes(move.san));
    assert.equal(game.fen(), fen);
    assert.equal(game.history().join(' '), history);
  }
  const mate = chess.newChessGame();
  mate.load('7k/5Q2/6K1/8/8/8/8/8 w - - 0 1');
  assert.match(chess.bestChessMove(mate, 1).san, /#$/);
});

test('gomoku detects every axis, both colors and long lines without wrapping edges', () => {
  for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) for (const color of [1, 2]) {
    const board = empty();
    for (let i = 0; i < 6; i++) board[4 + dr * i][7 + dc * i] = color;
    assert.equal(gomoku.checkWin(board, 4, 7), true);
    assert.equal(gomoku.winningLine(board, 4, 7).length, 6);
  }
  assert.equal(gomoku.checkWin(empty(), -1, 0), false);
});

test('gomoku AI and hints honor their side, find immediate wins/blocks, and never mutate a board', () => {
  for (const color of [1, 2]) {
    const board = empty();
    for (let c = 2; c < 6; c++) board[7][c] = color;
    board[7][1] = color === 1 ? 2 : 1;
    const before = JSON.stringify(board);
    assert.deepEqual(json(gomoku.getBestMove(board, 3, color)), [7, 6]);
    assert.deepEqual(json(gomoku.getBestMove(board, 2, color === 1 ? 2 : 1)), [7, 6]);
    assert.equal(JSON.stringify(board), before);
  }
  assert.deepEqual(json(gomoku.getBestMove(empty(), 3, 1)), [7, 7]);
  assert.deepEqual(json(gomoku.getBestMove(Array.from({ length: 15 }, () => Array(15).fill(1)), 1)), [-1, -1]);
});

test('gomoku replay distinguishes a 225-move draw and refuses overwritten or post-win moves', () => {
  const black = [], white = [];
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) ((y + 2 * x) % 4 < 2 ? black : white).push([x, y]);
  const moves = black.flatMap((point, i) => white[i] ? [point, white[i]] : [point]);
  const full = gobang.replayGobang(moves);
  assert.equal(full.draw, true);
  assert.equal(full.winner, null);
  assert.throws(() => gobang.replayGobang([[0, 0], [0, 0]]));
  const won = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0]];
  assert.equal(gobang.replayGobang(won).winner, 0);
  assert.throws(() => gobang.replayGobang([...won, [9, 9]]));
});

const captureSequence = [[0, 1], [1, 1], [1, 0], [8, 8], [2, 1], [8, 7], [1, 2]];
test('Sabaki-backed Go captures, rejects suicide/occupied/outside points, and replay restores captures', () => {
  const position = go.replayGo(9, captureSequence);
  assert.equal(position.board.get([1, 1]), 0);
  assert.equal(position.board.getCaptures(1), 1);
  assert.throws(() => go.playGo(position, [1, 1]), /无气/);
  assert.throws(() => go.playGo(position, [0, 1]), /已有棋子/);
  assert.throws(() => go.playGo(position, [99, 0]), /不在棋盘/);
  const beforeCapture = go.replayGo(9, captureSequence, 6);
  assert.equal(beforeCapture.board.get([1, 1]), -1);
  assert.equal(beforeCapture.board.getCaptures(1), 0);
});

test('Go enforces immediate ko and positional superko even without the engine ko marker', () => {
  const board = GoBoard.fromDimensions(9);
  [[0, 1], [1, 0], [2, 1]].forEach(point => board.set(point, 1));
  [[1, 1], [0, 2], [2, 2], [1, 3]].forEach(point => board.set(point, -1));
  const position = { board, turn: 0, passes: 0, seen: new Set([go.goHash(board)]) };
  const captured = go.playGo(position, [1, 2]);
  assert.throws(() => go.playGo(captured, [1, 1]), /劫争/);
  const withoutMarker = new GoBoard(captured.board.signMap.map(row => [...row]));
  assert.throws(() => go.playGo({ ...captured, board: withoutMarker }, [1, 1]), /全局同形/);
});

test('Go pass history resets on a placement, two passes stop play, undo restores play', () => {
  const onePass = go.replayGo(9, [null]);
  assert.equal(onePass.passes, 1);
  assert.equal(go.playGo(onePass, [4, 4]).passes, 0);
  const finished = go.replayGo(9, [[4, 4], null, null]);
  assert.equal(finished.passes, 2);
  assert.throws(() => go.playGo(finished, [0, 0]));
  assert.equal(go.replayGo(9, [[4, 4], null]).passes, 1);
});

test('area scoring counts stones plus exclusive empty areas, komi and neutral regions exactly once', () => {
  const emptyScore = go.scoreGo(GoBoard.fromDimensions(9), [], 7.5);
  assert.equal(emptyScore.black, 0);
  assert.equal(emptyScore.white, 7.5);
  assert.equal(emptyScore.neutral, 81);
  const board = new GoBoard([[1, 1, 1], [1, 0, 1], [1, 1, 1]]);
  const score = go.scoreGo(board, [], 0);
  assert.equal(score.black, 9);
  assert.equal(score.stones[0], 8);
  assert.equal(score.empty[0], 1);
  board.set([0, 1], -1);
  assert.equal(go.scoreGo(board, [], 0).neutral, 1);
  const groupBoard = new GoBoard([[1, 1, 0], [0, 0, -1], [0, 0, 0]]);
  const dead = go.toggleDeadGroup(groupBoard, [], [0, 0]);
  assert.equal(dead.length, 2);
  assert.equal(go.toggleDeadGroup(groupBoard, dead, [1, 0]).length, 0);
  assert.equal(go.scoreGo(groupBoard, dead, 0).black, 0);
  assert.equal(groupBoard.get([0, 0]), 1, 'Scoring must not mutate the real board');
});

test('Go saved scoring requires complete real groups and a two-pass ending', () => {
  const match = { ...go.newGoMatch(), moves: [[4, 4], [5, 5], [4, 3], null, null], dead: [[4, 4], [4, 3]], accepted: [true, false] };
  assert.equal(go.validGoMatch(match), true);
  assert.equal(go.validGoMatch({ ...match, dead: [[4, 4]] }), false);
  assert.equal(go.validGoMatch({ ...match, dead: [[0, 0]] }), false);
  assert.equal(go.validGoMatch({ ...match, moves: match.moves.slice(0, -2) }), false);
});

test('clock settles real elapsed time, locks timeout, supports unlimited and never refunds undo time', () => {
  const match = chess.newChessMatch();
  const charged = core.chargeClock(match, 0, 1234);
  assert.equal(charged.remaining[0], 598766);
  assert.equal(charged.remaining[1], 600000);
  assert.equal(match.remaining[0], 600000);
  const timeout = core.chargeClock(charged, 0, 1_000_000);
  assert.equal(timeout.timeout, 0);
  assert.equal(timeout.remaining[0], 0);
  assert.equal(core.chargeClock(timeout, 1, 1000), timeout);
  const unlimited = chess.newChessMatch({ ...settings, minutes: 0 });
  assert.equal(core.chargeClock(unlimited, 0, 1_000_000), unlimited);
  assert.equal(core.formatClock(59999, 10), '01:00');
  assert.equal(core.undoCount(4, settings, 0), 2);
  assert.equal(core.undoCount(3, settings, 1), 1);
  assert.equal(core.undoCount(1, { ...settings, human: 1 }, 1), 1);
});

test('damaged storage preserves raw data and recovers a validated backup, or safely falls back', () => {
  const key = chess.CHESS_KEY;
  const good = chess.importChessPgn('1. e4 e5');
  const entries = new Map([[key, '{damaged'], [`${key}.backup`, JSON.stringify(good)]]);
  const storage = { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value) };
  const recovered = core.recoverStrategySession(storage, key, chess.newChessMatch(), chess.validChessMatch);
  assert.deepEqual(json(recovered.value.moves), ['e4', 'e5']);
  assert.equal(entries.get(`${key}.damaged`), '{damaged');
  entries.set(`${key}.backup`, JSON.stringify({ ...good, moves: ['e9'] }));
  const fallback = core.recoverStrategySession(storage, key, chess.newChessMatch(), chess.validChessMatch);
  assert.deepEqual(json(fallback.value.moves), []);
  assert.equal(chess.validChessMatch(fallback.value), true);
  assert.doesNotThrow(() => core.recoverStrategySession({ getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } }, key, chess.newChessMatch(), chess.validChessMatch));
  const quota = core.recoverStrategySession({ getItem: key => key.endsWith('.backup') ? null : '{bad', setItem() { throw Error('quota'); } }, key, chess.newChessMatch(), chess.validChessMatch);
  assert.match(quota.message, /无法备份/);
});

test('all chess images are local real assets and no strategy module loads remote media or uses native confirm', () => {
  for (const color of ['w', 'b']) for (const type of ['p', 'n', 'b', 'r', 'q', 'k']) assert.equal(existsSync(`public/images/pieces/chess-${color}-${type}.svg`), true);
  for (const name of ['ChessApp', 'GobangApp', 'GoApp']) {
    const source = readFileSync(`components/${name}.tsx`, 'utf8');
    assert.ok(source.includes('<Workbench'));
    assert.doesNotMatch(source, /https?:\/\/|\balert\s*\(|\bconfirm\s*\(/);
  }
});
