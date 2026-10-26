import { Chess } from 'chess.js';
import { Difficulty, MatchBase, MatchSettings, Side, newMatchBase, validBase } from './strategyCore';

export interface ChessMove { from: string; to: string; san: string; color: 'w' | 'b'; piece: string; captured?: string; promotion?: string; flags: string }
export interface ChessPiece { type: string; color: 'w' | 'b' }
export interface ChessGame {
  load(fen: string): boolean;
  fen(): string;
  moves(options?: { square?: string; verbose?: boolean }): any[];
  move(move: string | { from: string; to: string; promotion?: string }): ChessMove | null;
  undo(): ChessMove | null;
  get(square: string): ChessPiece | null;
  board(): (ChessPiece | null)[][];
  turn(): 'w' | 'b';
  history(options?: { verbose?: boolean }): any[];
  game_over(): boolean;
  in_checkmate(): boolean;
  in_check(): boolean;
  in_stalemate(): boolean;
  in_threefold_repetition(): boolean;
  insufficient_material(): boolean;
  in_draw(): boolean;
  load_pgn(pgn: string, options?: { sloppy?: boolean }): boolean;
  pgn(options?: { max_width?: number; newline_char?: string }): string;
  header(...args: string[]): Record<string, string>;
}
export interface ChessMatch extends MatchBase { startFen: string; moves: string[]; headers: Record<string, string> }
export const CHESS_KEY = 'exbeam.strategy.chess.v1';
export const CHESS_VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
export const CHESS_PIECES: Record<string, string> = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };
export const chessSide = (game: ChessGame): Side => game.turn() === 'w' ? 0 : 1;
export const newChessGame = (): ChessGame => new Chess() as ChessGame;

export function newChessMatch(settings?: MatchSettings): ChessMatch {
  return { ...newMatchBase(settings), startFen: newChessGame().fen(), moves: [], headers: {} };
}

export function initialChessMatch(): ChessMatch {
  try {
    const old = JSON.parse(localStorage.getItem('exbeam.chess.match.v2') || 'null');
    if (typeof old?.pgn === 'string' && old.pgn.trim()) {
      const match = importChessPgn(old.pgn, { mode: 'computer', human: 0, level: 1, minutes: 10 });
      match.remaining = [old.whiteTimer, old.blackTimer].map(n => Number.isFinite(n) ? Math.max(0, Math.min(600, n)) * 1000 : 600_000) as [number, number];
      if (match.remaining.includes(0)) match.timeout = match.remaining[0] === 0 ? 0 : 1;
      return match;
    }
  } catch { /* Keep the old key untouched even when it is damaged. */ }
  return newChessMatch();
}

export function replayChess(match: Pick<ChessMatch, 'startFen' | 'moves'>, count = match.moves.length): ChessGame {
  const game = newChessGame();
  if (!game.load(match.startFen)) throw new Error('初始局面无效');
  const rows = game.board();
  const pieces = rows.flat().filter((piece): piece is ChessPiece => Boolean(piece));
  if (['w', 'b'].some(color => pieces.filter(piece => piece.type === 'k' && piece.color === color).length !== 1)
    || [...rows[0], ...rows[7]].some(piece => piece?.type === 'p')) throw new Error('初始局面的王或兵位置无效');
  const fields = game.fen().split(' ');
  const castling: Record<string, [string, string, string]> = { K: ['e1', 'h1', 'w'], Q: ['e1', 'a1', 'w'], k: ['e8', 'h8', 'b'], q: ['e8', 'a8', 'b'] };
  for (const right of fields[2].replace('-', '')) {
    const [king, rook, color] = castling[right];
    if (game.get(king)?.type !== 'k' || game.get(king)?.color !== color || game.get(rook)?.type !== 'r' || game.get(rook)?.color !== color) throw new Error('初始局面的易位权无效');
  }
  if (fields[3] !== '-') {
    const pawn = game.get(`${fields[3][0]}${Number(fields[3][1]) + (game.turn() === 'w' ? -1 : 1)}`);
    if (game.get(fields[3]) || pawn?.type !== 'p' || pawn.color === game.turn()) throw new Error('初始局面的过路兵标记无效');
  }
  // 0.10 validates FEN syntax only; the side that just moved must not have left its king in check.
  const previous = newChessGame();
  fields[1] = game.turn() === 'w' ? 'b' : 'w';
  fields[3] = '-';
  if (!previous.load(fields.join(' ')) || previous.in_check()) throw new Error('初始局面存在非法将军');
  for (const san of match.moves.slice(0, count)) {
    if (game.game_over() || !game.move(san)) throw new Error('棋谱包含非法走子');
  }
  return game;
}

export function validChessMatch(value: unknown): value is ChessMatch {
  if (!validBase(value)) return false;
  const s = value as ChessMatch;
  if (typeof s.startFen !== 'string' || s.startFen.length > 160 || !Array.isArray(s.moves) || s.moves.length > 3000
    || s.moves.some(m => typeof m !== 'string' || m.length > 16) || !s.headers || typeof s.headers !== 'object' || Array.isArray(s.headers)
    || Object.entries(s.headers).some(([k, v]) => !/^[A-Za-z][A-Za-z0-9_]*$/.test(k) || typeof v !== 'string' || v.length > 300)) return false;
  try { replayChess(s); return true; } catch { return false; }
}

export function chessResult(game: ChessGame, timeout: Side | null): string | null {
  if (game.in_checkmate()) return `${game.turn() === 'w' ? '黑方' : '白方'}将死获胜`;
  if (game.in_stalemate()) return '逼和';
  if (game.insufficient_material()) return '子力不足，和棋';
  if (game.in_threefold_repetition()) return '三次重复局面，和棋';
  if (game.in_draw()) return '五十回合规则，和棋';
  if (timeout !== null) {
    const winner = timeout === 0 ? 'b' : 'w';
    const pieces = game.board().flat().filter((p): p is ChessPiece => Boolean(p));
    const material = pieces.filter(p => p.color === winner && p.type !== 'k');
    const loserBare = pieces.filter(p => p.color !== winner).every(p => p.type === 'k');
    if (!material.length || (loserBare && material.length === 1 && ['b', 'n'].includes(material[0].type))) return '超时，但对方无将死子力，和棋';
    return `${timeout === 0 ? '白方' : '黑方'}超时，${timeout === 0 ? '黑方' : '白方'}获胜`;
  }
  return null;
}

export function chessMatchResult(match: ChessMatch, game: ChessGame): string | null {
  const result = chessResult(game, match.timeout);
  if (result) return result;
  if (match.headers.Result === '1-0') return '棋谱结果：白方获胜';
  if (match.headers.Result === '0-1') return '棋谱结果：黑方获胜';
  if (match.headers.Result === '1/2-1/2') return '棋谱结果：和棋';
  return null;
}

export function importChessPgn(raw: string, settings?: MatchSettings): ChessMatch {
  if (!raw.trim() || raw.length > 250_000) throw new Error('请选择不超过 250 KB 的 PGN 棋谱。');
  const game = newChessGame();
  const normalized = raw.trim();
  // chess.js 0.10 only retains a movetext result when at least one header exists.
  if (!game.load_pgn(normalized.startsWith('[') ? normalized : `[Event "ExBeam import"]\n\n${normalized}`)) throw new Error('PGN 无效，当前对局未改变。');
  const moves = game.history() as string[];
  const headers = game.header();
  const start = newChessGame();
  if (headers.FEN && !start.load(headers.FEN)) throw new Error('PGN 初始局面无效。');
  const match = { ...newChessMatch(settings), moves, startFen: start.fen(), headers };
  if (!validChessMatch(match)) throw new Error('棋谱存在非法或终局后的走子。');
  return match;
}

export function exportChessPgn(match: ChessMatch): string {
  const game = replayChess(match);
  for (const [key, value] of Object.entries(match.headers)) game.header(key, value);
  game.header('Event', match.headers.Event || 'ExBeam local match');
  if (match.startFen !== newChessGame().fen()) game.header('SetUp', '1', 'FEN', match.startFen);
  let result = ['1-0', '0-1', '1/2-1/2'].includes(match.headers.Result) ? match.headers.Result : '*';
  const outcome = chessResult(game, match.timeout);
  if (outcome) result = outcome.includes('和') ? '1/2-1/2' : match.timeout !== null ? (match.timeout === 0 ? '0-1' : '1-0') : (game.turn() === 'w' ? '0-1' : '1-0');
  game.header('Result', result);
  return game.pgn({ max_width: 80 });
}

function evaluate(game: ChessGame): number {
  let score = 0;
  game.board().forEach((row, r) => row.forEach((piece, c) => {
    if (!piece) return;
    const center = 3.5 - (Math.abs(c - 3.5) + Math.abs(r - 3.5)) / 2;
    const advance = piece.color === 'w' ? 6 - r : r - 1;
    const value = CHESS_VALUES[piece.type] + (piece.type === 'p' ? advance * 5 : piece.type === 'k' ? 0 : center * 9);
    score += piece.color === game.turn() ? value : -value;
  }));
  return score;
}

export function bestChessMove(game: ChessGame, level: Difficulty): ChessMove | null {
  if (game.game_over()) return null;
  const sorted = () => (game.moves({ verbose: true }) as ChessMove[]).sort((a, b) => {
    const priority = (m: ChessMove) => (CHESS_VALUES[m.captured || ''] || 0) * 10 + (CHESS_VALUES[m.promotion || ''] || 0) + (m.san.includes('+') ? 20 : 0);
    return priority(b) - priority(a) || a.san.localeCompare(b.san);
  });
  const root = sorted();
  let best = root[0] || null;
  const deadline = Date.now() + 180;
  let nodes = 0;
  let exhausted = false;
  const search = (depth: number, alpha: number, beta: number, ply: number): number => {
    nodes++;
    if (nodes > 6500 || Date.now() > deadline) { exhausted = true; return evaluate(game); }
    if (game.in_checkmate()) return -100_000 + ply;
    if (game.in_draw()) return 0;
    if (!depth) return evaluate(game);
    let score = -Infinity;
    for (const move of sorted()) {
      game.move(move.san);
      const value = -search(depth - 1, -beta, -alpha, ply + 1);
      game.undo();
      score = Math.max(score, value);
      alpha = Math.max(alpha, value);
      if (alpha >= beta || exhausted) break;
    }
    return score;
  };
  // Only adopt a fully searched iteration; the previous depth remains usable at the budget limit.
  for (let depth = 1; depth <= level; depth++) {
    let score = -Infinity;
    let candidate = best;
    for (const move of root) {
      game.move(move.san);
      const value = -search(depth - 1, -Infinity, Infinity, 1);
      game.undo();
      if (value > score) { score = value; candidate = move; }
      if (exhausted) break;
    }
    if (!exhausted) best = candidate;
    else break;
  }
  return best;
}
