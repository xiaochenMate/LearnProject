
/**
 * Professional Go (Weiqi) Core Logic
 * Handles capturing, suicide moves, and Ko rule.
 */

export type StoneColor = 1 | 2; // 1: Black, 2: White, 0: Empty
export type BoardState = number[][];

export interface GoMove {
  r: number;
  c: number;
  color: StoneColor;
  captured?: { r: number, c: number }[];
}

export class GoEngine {
  size: number;
  
  constructor(size: number = 19) {
    this.size = size;
  }

  static createBoard(size: number): BoardState {
    return Array(size).fill(0).map(() => Array(size).fill(0));
  }

  /**
   * Find liberties of a group starting at (r, c)
   */
  getGroupLiberties(board: BoardState, r: number, c: number): { group: {r: number, c: number}[], liberties: number } {
    const color = board[r][c];
    if (color === 0) return { group: [], liberties: 0 };

    const visited = new Set<string>();
    const group: {r: number, c: number}[] = [];
    const liberties = new Set<string>();
    const stack = [{r, c}];

    while (stack.length > 0) {
      const current = stack.pop()!;
      const key = `${current.r},${current.c}`;
      if (visited.has(key)) continue;
      visited.add(key);
      group.push(current);

      const neighbors = [
        {r: current.r - 1, c: current.c},
        {r: current.r + 1, c: current.c},
        {r: current.r, c: current.c - 1},
        {r: current.r, c: current.c + 1},
      ];

      for (const n of neighbors) {
        if (n.r >= 0 && n.r < this.size && n.c >= 0 && n.c < this.size) {
          if (board[n.r][n.c] === 0) {
            liberties.add(`${n.r},${n.c}`);
          } else if (board[n.r][n.c] === color) {
            stack.push(n);
          }
        }
      }
    }

    return { group, liberties: liberties.size };
  }

  /**
   * Check if placing a stone of color at (r, c) is legal.
   * Returns captured stones if legal, or null if illegal.
   */
  validateMove(board: BoardState, r: number, c: number, color: StoneColor, lastBoard?: string): { captured: {r: number, c: number}[] } | null {
    if (board[r][c] !== 0) return null;

    // 1. Hypothetical placement
    const nextBoard = board.map(row => [...row]);
    nextBoard[r][c] = color;

    const opponent = color === 1 ? 2 : 1;
    const capturedStones: {r: number, c: number}[] = [];

    // 2. Check for captures of opponent groups
    const neighbors = [
      {r: r - 1, c}, {r: r + 1, c}, {r, c: c - 1}, {r, c: c + 1}
    ];

    for (const n of neighbors) {
      if (n.r >= 0 && n.r < this.size && n.c >= 0 && n.c < this.size) {
        if (nextBoard[n.r][n.c] === opponent) {
          const { group, liberties } = this.getGroupLiberties(nextBoard, n.r, n.c);
          if (liberties === 0) {
            for (const s of group) {
              const crossKey = `${s.r},${s.c}`;
              if (!capturedStones.some(existing => `${existing.r},${existing.c}` === crossKey)) {
                capturedStones.push(s);
              }
            }
          }
        }
      }
    }

    // Apply captures to nextBoard for Ko check and suicide check
    for (const s of capturedStones) {
      nextBoard[s.r][s.c] = 0;
    }

    // 3. Check for suicide (no liberties for the placed stone's group)
    const { liberties: selfLiberties } = this.getGroupLiberties(nextBoard, r, c);
    if (selfLiberties === 0 && capturedStones.length === 0) {
      return null;
    }

    // 4. Ko Rule Check
    if (lastBoard) {
        const boardString = JSON.stringify(nextBoard);
        if (boardString === lastBoard) return null;
    }

    return { captured: capturedStones };
  }
}
