import GoBoard from '@sabaki/go-board';
import { MatchBase, MatchSettings, Point, Side, newMatchBase, pointKey, validBase, validPoint } from './strategyCore';

export type GoSize = 9 | 13 | 19;
export type GoMove = Point | null;
export interface GoMatch extends MatchBase {
  size: GoSize;
  komi: number;
  moves: GoMove[];
  dead: Point[];
  accepted: [boolean, boolean];
}
export interface GoPosition { board: GoBoard; seen: Set<string>; turn: Side; passes: number }
export const GO_KEY = 'exbeam.strategy.go.v1';
export const goHash = (board: GoBoard) => board.signMap.map(row => row.join(',')).join(';');
export const newGoMatch = (settings?: MatchSettings, size: GoSize = 9, komi = 7.5): GoMatch => ({ ...newMatchBase({ ...(settings || { mode: 'local', human: 0, level: 2, minutes: 10 }), mode: 'local' }), size, komi, moves: [], dead: [], accepted: [false, false] });

export function initialGoPosition(size: GoSize): GoPosition {
  const board = GoBoard.fromDimensions(size);
  return { board, seen: new Set([goHash(board)]), turn: 0, passes: 0 };
}

export function playGo(position: GoPosition, point: GoMove): GoPosition {
  if (position.passes >= 2) throw new Error('已进入终局确认，请恢复对弈后再落子。');
  if (point === null) return { ...position, board: position.board.clone(), turn: position.turn === 0 ? 1 : 0, passes: position.passes + 1 };
  if (!validPoint(point, position.board.width)) throw new Error('落点不在棋盘内。');
  const sign = position.turn === 0 ? 1 : -1;
  const analysis = position.board.analyzeMove(sign, point);
  if (analysis.overwrite) throw new Error('这里已有棋子。');
  if (analysis.suicide) throw new Error('禁入点：落子后无气，且不能提子。');
  if (analysis.ko) throw new Error('劫争：不能立即回提，须先在别处落子。');
  const board = position.board.makeMove(sign, point, { preventOverwrite: true, preventSuicide: true, preventKo: true });
  const hash = goHash(board);
  if (position.seen.has(hash)) throw new Error('禁止全局同形：不能重现此前的棋盘。');
  return { board, seen: new Set([...position.seen, hash]), turn: position.turn === 0 ? 1 : 0, passes: 0 };
}

export function replayGo(size: GoSize, moves: GoMove[], count = moves.length): GoPosition {
  let position = initialGoPosition(size);
  for (const point of moves.slice(0, count)) position = playGo(position, point);
  return position;
}

export function legalGoPoints(position: GoPosition): Set<string> {
  const points = new Set<string>();
  if (position.passes >= 2) return points;
  for (let y = 0; y < position.board.height; y++) for (let x = 0; x < position.board.width; x++) {
    if (position.board.get([x, y])) continue;
    try { playGo(position, [x, y]); points.add(pointKey([x, y])); } catch { /* Illegal points intentionally have no marker. */ }
  }
  return points;
}

export function toggleDeadGroup(board: GoBoard, dead: Point[], point: Point): Point[] {
  if (!board.get(point)) return dead;
  const keys = new Set(dead.map(pointKey));
  const group = board.getChain(point) as Point[];
  const remove = keys.has(pointKey(point));
  for (const vertex of group) { if (remove) keys.delete(pointKey(vertex)); else keys.add(pointKey(vertex)); }
  return [...keys].map(key => key.split(',').map(Number) as Point);
}

export function scoreGo(board: GoBoard, dead: Point[], komi: number) {
  const clean = board.clone();
  dead.forEach(point => clean.set(point, 0));
  const territory: number[][] = clean.signMap.map(row => row.map(() => 0));
  const seen = new Set<string>();
  const stones = [0, 0], empty = [0, 0];
  let neutral = 0;
  for (let y = 0; y < clean.height; y++) for (let x = 0; x < clean.width; x++) {
    const vertex: Point = [x, y];
    const sign = clean.get(vertex);
    if (sign) { stones[sign === 1 ? 0 : 1]++; continue; }
    if (seen.has(pointKey(vertex))) continue;
    const region = clean.getConnectedComponent(vertex, p => clean.get(p) === 0);
    const borders = new Set<number>();
    region.forEach(p => {
      seen.add(pointKey(p));
      clean.getNeighbors(p).forEach(n => { const color = clean.get(n); if (color) borders.add(color); });
    });
    const owner = borders.size === 1 ? [...borders][0] : 0;
    region.forEach(([c, r]) => { territory[r][c] = owner; });
    if (owner) empty[owner === 1 ? 0 : 1] += region.length;
    else neutral += region.length;
  }
  return { stones, empty, neutral, black: stones[0] + empty[0], white: stones[1] + empty[1] + komi, territory };
}

export function validGoMatch(value: unknown): value is GoMatch {
  if (!validBase(value)) return false;
  const s = value as GoMatch;
  if (s.settings.mode !== 'local' || ![9, 13, 19].includes(s.size) || ![0, 6.5, 7.5].includes(s.komi)
    || !Array.isArray(s.moves) || s.moves.length > 3000 || s.moves.some(p => p !== null && !validPoint(p, s.size))
    || !Array.isArray(s.dead) || s.dead.some(p => !validPoint(p, s.size)) || new Set(s.dead.map(pointKey)).size !== s.dead.length
    || !Array.isArray(s.accepted) || s.accepted.length !== 2 || s.accepted.some(b => typeof b !== 'boolean')) return false;
  try {
    const position = replayGo(s.size, s.moves);
    if (position.passes < 2 && (s.dead.length || s.accepted.some(Boolean))) return false;
    const dead = new Set(s.dead.map(pointKey));
    return s.dead.every(p => position.board.get(p) && position.board.getChain(p).every(v => dead.has(pointKey(v as Point))));
  } catch { return false; }
}
