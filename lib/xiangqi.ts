import { Chess, DEFAULT_POSITION, type Color, type Move, type PieceSymbol, type Square } from '@weshell/xiangqi.js';

export { Chess, DEFAULT_POSITION };
export type { Color, Move, PieceSymbol, Square };
export const XIANGQI_STORAGE = 'exbeam.xiangqi.match.v3';
export const XQ_PIECES: Record<PieceSymbol, { asset: string; red: string; black: string; name: string; rule: string }> = {
  k: { asset: 'king', red: '帅', black: '将', name: '将帅', rule: '在九宫内沿直线走一格。将帅之间不可没有棋子阻隔，也不能走入对方攻击的位置。' },
  a: { asset: 'advisor', red: '仕', black: '士', name: '士仕', rule: '在九宫内沿斜线走一格，协助保护将帅。' },
  b: { asset: 'elephant', red: '相', black: '象', name: '相象', rule: '走田字，不可过河；田字中央有棋子时被塞象眼，不能走过去。' },
  n: { asset: 'horse', red: '马', black: '馬', name: '马', rule: '先直走一格，再斜走一格。第一格有棋子挡住时叫作蹩马腿，不能向该方向走。' },
  r: { asset: 'rook', red: '车', black: '車', name: '车', rule: '沿横线或纵线走任意格，途中不能越过其他棋子。' },
  c: { asset: 'cannon', red: '炮', black: '砲', name: '炮', rule: '不吃子时像车一样走；吃子时必须隔且仅隔一个棋子，作为炮架。' },
  p: { asset: 'soldier', red: '兵', black: '卒', name: '兵卒', rule: '每次向前走一格；过河后也可横走一格，始终不能后退，也没有升变。' },
};
export interface XiangqiSession {
  version: 3;
  id: string;
  initialFen: string;
  moves: string[];
  mode: 'computer' | 'local';
  human: Color;
  level: 1 | 2 | 3;
  clock: number;
  clocks: { w: number; b: number };
  resigned: Color | null;
  counted: boolean;
}
export const createXiangqiSession = (settings: Partial<XiangqiSession> = {}): XiangqiSession => ({
  version: 3, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  initialFen: DEFAULT_POSITION, moves: [], mode: 'computer', human: 'w', level: 1,
  clock: 600, clocks: { w: 600, b: 600 }, resigned: null, counted: false, ...settings,
});
export function restoreXiangqi(session: Pick<XiangqiSession, 'initialFen' | 'moves'>, ply = session.moves.length): Chess {
  const game = new Chess(session.initialFen);
  for (const move of session.moves.slice(0, Math.max(0, ply))) game.move(move);
  return game;
}
export function validXiangqiSession(value: unknown): value is XiangqiSession {
  if (!value || typeof value !== 'object') return false;
  const s = value as XiangqiSession;
  if (s.version !== 3 || typeof s.id !== 'string' || typeof s.initialFen !== 'string' || s.initialFen.length > 160 || !Array.isArray(s.moves) || s.moves.length > 1500 || !s.moves.every((x) => typeof x === 'string' && /^[a-i][0-9][a-i][0-9]$/.test(x))) return false;
  if (!['computer', 'local'].includes(s.mode) || !['w', 'b'].includes(s.human) || ![1, 2, 3].includes(s.level) || ![0, 300, 600, 1200].includes(s.clock) || !s.clocks || ![s.clocks.w, s.clocks.b].every((x) => Number.isFinite(x) && x >= 0 && x <= s.clock) || ![null, 'w', 'b'].includes(s.resigned) || typeof s.counted !== 'boolean') return false;
  try { restoreXiangqi(s); return true; } catch { return false; }
}
export function moveXiangqi(session: XiangqiSession, from: Square, to: Square): XiangqiSession {
  const game = restoreXiangqi(session);
  if (xiangqiResult(session, game)) throw new Error('本局已经结束');
  const move = game.move({ from, to });
  return { ...session, moves: [...session.moves, move.lan] };
}
export function xiangqiResult(session: XiangqiSession, game = restoreXiangqi(session)): { winner: Color | 'draw'; reason: string } | null {
  if (session.resigned) return { winner: session.resigned === 'w' ? 'b' : 'w', reason: '认输' };
  if (session.clock && (!session.clocks.w || !session.clocks.b)) return { winner: !session.clocks.w ? 'b' : 'w', reason: '超时' };
  if (game.isCheckmate() || game.isStalemate()) return { winner: game.turn() === 'w' ? 'b' : 'w', reason: game.isCheckmate() ? '将杀' : '困毙' };
  if (game.isDraw()) return { winner: 'draw', reason: '和棋' };
  return null;
}

export interface XiangqiPuzzle { id: string; title: string; category: string; fen: string; solutions: string[]; task: string; explanation: string; mate?: boolean }
const starter = (id: string, title: string, solutions: string[], task: string, explanation: string): XiangqiPuzzle => ({ id, title, solutions, task, explanation, fen: DEFAULT_POSITION, category: '基本功' });
export const XIANGQI_PUZZLES: XiangqiPuzzle[] = [
  starter('cannon-screen', '隔子打马', ['b2b9', 'h2h9'], '用红炮隔着炮架吃掉一匹黑马。', '炮吃子必须隔一个棋子。这里黑炮成为炮架，红炮可越过它打到后方的马。'),
  starter('central-cannon', '中炮布局', ['b2e2', 'h2e2'], '将一门红炮调到中路 e2。', '中炮直接指向对方中兵，但进攻需要与其他子力配合，不代表已经形成必胜。'),
  starter('horse-development', '跃马中路', ['b0c2', 'h0g2'], '把一匹红马跳到 c2 或 g2。', '先直后斜是马的走法。出动马能控制中路，也要留意马腿是否被挡。'),
  starter('elephant-cover', '飞相护中', ['c0e2', 'g0e2'], '把红相飞到 e2。', '相走田字，必须留在本方河界内；中间的象眼也必须空着。'),
  starter('palace-guard', '九宫卫士', ['d0e1', 'f0e1'], '将一枚红仕移到 e1。', '仕沿九宫的斜线走一格，保护将帅周围的要点。'),
  starter('central-pawn', '挺进中兵', ['e3e4'], '将中兵从 e3 推进到 e4。', '兵没过河时只能向前；即使过河，也不能后退。'),
  starter('rook-development', '出动车路', ['a0a1', 'i0i1'], '将一辆红车向前走一格。', '车需要通畅的线路。移动后仍应检查本方将帅的安全。'),
  starter('general-step', '将帅守宫', ['e0e1'], '让红帅在九宫内向前走一格。', '帅不能离开九宫，也不能进入被攻击的位置。合法着法会排除将帅照面。'),
  { id: 'double-rook-left', title: '双车封宫', category: '一步将杀', fen: '3k5/3p1R3/9/3R5/9/9/9/9/9/4K4 w - - 0 1', solutions: ['f8d8'], task: '红先，用车完成一步将杀。', explanation: '横车吃卒将军，另一辆车保护落点；将向中路逃跑又会与红帅照面，因此无路可走。', mate: true },
  { id: 'double-rook-right', title: '侧翼合围', category: '一步将杀', fen: '5k3/3R1p3/9/5R3/9/9/9/9/9/4K4 w - - 0 1', solutions: ['d8f8'], task: '红先，找到横车吃卒的将杀。', explanation: '先确认吃卒后的车有保护，再检查对方将的全部合法逃路。这比单看一次将军更可靠。', mate: true },
];

const values: Record<PieceSymbol, number> = { k: 100000, r: 900, c: 460, n: 420, a: 210, b: 210, p: 100 };
const evaluate = (game: Chess, side: Color) => game.board().flat().reduce((sum, piece) => {
  if (!piece) return sum;
  const rank = Number(piece.square[1]), file = piece.square.charCodeAt(0) - 97;
  const advance = piece.color === 'w' ? rank : 9 - rank;
  const bonus = piece.type === 'p' ? advance * 9 + (advance >= 5 ? 50 : 0) : piece.type === 'n' || piece.type === 'c' ? 20 - Math.abs(file - 4) * 4 : 0;
  return sum + (piece.color === side ? 1 : -1) * (values[piece.type] + bonus);
}, 0);
export function searchXiangqi(fen: string, level: number): { move: string | null; nodes: number; depth: number } {
  const game = new Chess(fen), side = game.turn();
  const root = game.moves({ verbose: true }) as Move[];
  if (!root.length) return { move: null, nodes: 0, depth: 0 };
  const end = performance.now() + [0, 160, 550, 1100][level];
  let nodes = 0, completedDepth = 0, best = root[0].lan;
  const ordered = (moves: Move[]) => moves.sort((a, b) => (b.captured ? values[b.captured] : 0) - (a.captured ? values[a.captured] : 0));
  const visit = (depth: number, alpha: number, beta: number): number => {
    if (++nodes % 64 === 0 && performance.now() > end) throw new Error('budget');
    if (game.isCheckmate() || game.isStalemate()) return game.turn() === side ? -1000000 - depth : 1000000 + depth;
    if (depth === 0) return evaluate(game, side);
    const moves = ordered(game.moves({ verbose: true }) as Move[]);
    if (!moves.length) return evaluate(game, side);
    const maximize = game.turn() === side;
    let value = maximize ? -Infinity : Infinity;
    for (const move of moves) {
      game.move(move.lan);
      let score: number;
      try { score = visit(depth - 1, alpha, beta); } finally { game.undo(); }
      value = maximize ? Math.max(value, score) : Math.min(value, score);
      if (maximize) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  };
  for (let depth = 1; depth <= Math.max(1, Math.min(3, level)); depth++) {
    let score = -Infinity, candidate = best;
    try {
      for (const move of ordered([...root])) {
        game.move(move.lan);
        let value: number;
        try { value = visit(depth - 1, score, Infinity); } finally { game.undo(); }
        if (value > score) { score = value; candidate = move.lan; }
      }
      best = candidate;
      completedDepth = depth;
    } catch { break; }
  }
  return { move: best, nodes, depth: completedDepth };
}
