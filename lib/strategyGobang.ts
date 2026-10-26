import { Board, checkWin, winningLine } from './gobangAI.ts';
import { MatchBase, MatchSettings, Point, Side, newMatchBase, validBase, validPoint } from './strategyCore';

export interface GobangMatch extends MatchBase { moves: Point[] }
export const GOBANG_KEY = 'exbeam.strategy.gobang.v1';
export const newGobangMatch = (settings?: MatchSettings): GobangMatch => ({ ...newMatchBase(settings), moves: [] });

export function replayGobang(moves: Point[], count = moves.length) {
  const board: Board = Array.from({ length: 15 }, () => Array(15).fill(0));
  let winner: Side | null = null;
  let line: Point[] = [];
  moves.slice(0, count).forEach(([x, y], i) => {
    if (!validPoint([x, y], 15) || board[y][x] || winner !== null) throw new Error('五子棋存档包含非法落子');
    board[y][x] = i % 2 === 0 ? 1 : 2;
    if (checkWin(board, y, x)) {
      winner = (i % 2) as Side;
      line = winningLine(board, y, x).map(([r, c]) => [c, r]);
    }
  });
  return { board, winner, line, draw: winner === null && count === 225, turn: (count % 2) as Side };
}

export function validGobangMatch(value: unknown): value is GobangMatch {
  if (!validBase(value)) return false;
  const s = value as GobangMatch;
  if (!Array.isArray(s.moves) || s.moves.length > 225 || s.moves.some(p => !validPoint(p, 15))) return false;
  try { replayGobang(s.moves); return true; } catch { return false; }
}
