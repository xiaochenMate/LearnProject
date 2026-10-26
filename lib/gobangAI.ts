export type Player = 1 | 2;
export type Board = (Player | 0)[][];
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const WIN = 10_000_000;
const inside = (board: Board, r: number, c: number) => r >= 0 && c >= 0 && r < board.length && c < board.length;

export function winningLine(board: Board, r: number, c: number): [number, number][] {
  if (!inside(board, r, c) || !board[r][c]) return [];
  const player = board[r][c];
  for (const [dr, dc] of DIRECTIONS) {
    const line: [number, number][] = [[r, c]];
    for (const sign of [-1, 1]) {
      let nr = r + dr * sign, nc = c + dc * sign;
      while (inside(board, nr, nc) && board[nr][nc] === player) {
        line.push([nr, nc]); nr += dr * sign; nc += dc * sign;
      }
    }
    if (line.length >= 5) return line;
  }
  return [];
}

export function checkWin(board: Board, r: number, c: number): boolean {
  return winningLine(board, r, c).length >= 5;
}

function positionScore(board: Board, r: number, c: number, player: Player): number {
  let score = 0;
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1, open = 0;
    for (const sign of [-1, 1]) {
      let nr = r + dr * sign, nc = c + dc * sign;
      while (inside(board, nr, nc) && board[nr][nc] === player) { count++; nr += dr * sign; nc += dc * sign; }
      if (inside(board, nr, nc) && board[nr][nc] === 0) open++;
    }
    if (count >= 5) score += WIN;
    else if (open) score += [0, 4, 35, 700, 50_000][count] * (open === 2 ? 6 : 1);
    // Five-cell windows also value broken threes/fours that contiguous runs miss.
    for (let offset = -4; offset <= 0; offset++) {
      let stones = 0, valid = true;
      for (let i = 0; i < 5; i++) {
        const nr = r + (offset + i) * dr, nc = c + (offset + i) * dc;
        if (!inside(board, nr, nc) || (board[nr][nc] !== 0 && board[nr][nc] !== player)) { valid = false; break; }
        if ((nr === r && nc === c) || board[nr][nc] === player) stones++;
      }
      if (valid) score += [0, 1, 8, 100, 8000, WIN][stones];
    }
  }
  return score;
}

export function evaluateBoard(board: Board, player: Player): number {
  let score = 0;
  for (let r = 0; r < board.length; r++) for (let c = 0; c < board.length; c++) {
    if (board[r][c]) score += positionScore(board, r, c, board[r][c] as Player) * (board[r][c] === player ? 1 : -1);
  }
  return score;
}

function candidates(board: Board, player: Player): [number, number, number][] {
  const result: [number, number, number][] = [];
  const opponent: Player = player === 1 ? 2 : 1;
  for (let r = 0; r < board.length; r++) for (let c = 0; c < board.length; c++) {
    if (board[r][c]) continue;
    let near = false;
    for (let dr = -2; dr <= 2 && !near; dr++) for (let dc = -2; dc <= 2; dc++) {
      if (inside(board, r + dr, c + dc) && board[r + dr][c + dc]) { near = true; break; }
    }
    if (!near) continue;
    const score = positionScore(board, r, c, player) * 1.1 + positionScore(board, r, c, opponent);
    result.push([r, c, score]);
  }
  return result.sort((a, b) => b[2] - a[2] || a[0] - b[0] || a[1] - b[1]);
}

export function getBestMove(source: Board, depth = 2, player: Player = 2): [number, number] {
  const board = source.map(row => [...row]);
  if (board.every(row => row.every(cell => cell === 0))) return [Math.floor(board.length / 2), Math.floor(board.length / 2)];
  if (board.every(row => row.every(Boolean))) return [-1, -1];
  const opponent: Player = player === 1 ? 2 : 1;
  const root = candidates(board, player);
  if (!root.length) return [-1, -1];
  for (const color of [player, opponent]) for (const [r, c] of root) {
    board[r][c] = color;
    const won = checkWin(board, r, c);
    board[r][c] = 0;
    if (won) return [r, c];
  }
  if (depth <= 1) return [root[0][0], root[0][1]];
  const deadline = Date.now() + 160;
  let nodes = 0, exhausted = false;
  const search = (left: number, current: Player, alpha: number, beta: number): number => {
    if (++nodes > 3500 || Date.now() > deadline) { exhausted = true; return evaluateBoard(board, player); }
    if (!left) return evaluateBoard(board, player);
    const moves = candidates(board, current).slice(0, 8);
    if (!moves.length) return 0;
    const maximizing = current === player;
    let best = maximizing ? -Infinity : Infinity;
    for (const [r, c] of moves) {
      board[r][c] = current;
      const value = checkWin(board, r, c) ? (maximizing ? WIN * (left + 1) : -WIN * (left + 1))
        : search(left - 1, current === 1 ? 2 : 1, alpha, beta);
      board[r][c] = 0;
      best = maximizing ? Math.max(best, value) : Math.min(best, value);
      if (maximizing) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (beta <= alpha || exhausted) break;
    }
    return best;
  };
  let bestMove: [number, number] = [root[0][0], root[0][1]];
  for (let target = 2; target <= Math.min(3, depth); target++) {
    let best = -Infinity;
    let candidate = bestMove;
    for (const [r, c] of root.slice(0, 12)) {
      board[r][c] = player;
      const value = search(target - 1, opponent, -Infinity, Infinity);
      board[r][c] = 0;
      if (value > best) { best = value; candidate = [r, c]; }
      if (exhausted) break;
    }
    if (exhausted) break;
    bestMove = candidate;
  }
  return bestMove;
}

export function getScoreMap(board: Board, player: Player): number[][] {
  return board.map((row, r) => row.map((cell, c) => cell ? 0 : positionScore(board, r, c, player)));
}
