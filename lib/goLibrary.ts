
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

  /**
   * Simple territory calculation (Area scoring - Chinese Rules)
   * This is a heuristic and might not be 100% accurate for complex dead/alive groups
   * but works for basic end-game scenarios.
   */
  estimateScore(board: BoardState, komi: number = 7.5): { black: number, white: number, territory: number[][] } {
    const size = this.size;
    const territory = board.map(row => [...row]);
    const visited = new Set<string>();

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (territory[r][c] === 0 && !visited.has(`${r},${c}`)) {
          const area: {r: number, c: number}[] = [];
          const stack = [{r, c}];
          let colorsSeen = new Set<number>();
          
          while (stack.length > 0) {
            const curr = stack.pop()!;
            const key = `${curr.r},${curr.c}`;
            if (visited.has(key)) continue;
            visited.add(key);
            area.push(curr);

            const neighbors = [
              {r: curr.r - 1, c: curr.c}, {r: curr.r + 1, c: curr.c},
              {r: curr.r, c: curr.c - 1}, {r: curr.r, c: curr.c + 1}
            ];

            for (const n of neighbors) {
              if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
                if (board[n.r][n.c] === 0) {
                  stack.push(n);
                } else {
                  colorsSeen.add(board[n.r][n.c]);
                }
              }
            }
          }

          // If an empty area is surrounded by only one color, it's that color's territory
          if (colorsSeen.size === 1) {
            const owner = colorsSeen.values().next().value;
            for (const p of area) {
              territory[p.r][p.c] = owner + 10; // Use 11 for Black territory, 12 for White
            }
          }
        }
      }
    }

    let bScore = 0;
    let wScore = komi;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 1 || territory[r][c] === 11) bScore++;
        if (board[r][c] === 2 || territory[r][c] === 12) wScore++;
      }
    }

    return { black: bScore, white: wScore, territory };
  }

  getBestMove(board: BoardState, color: StoneColor, lastBoard?: string): {r: number, c: number} | null {
    const validMoves: {r: number, c: number, score: number}[] = [];
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] !== 0) continue;
        
        const result = this.validateMove(board, r, c, color, lastBoard);
        if (result === null) continue;
        
        let score = Math.random() * 10; 
        
        if (result.captured.length > 0) {
          score += result.captured.length * 100;
        }
        
        const nextBoard = board.map(row => [...row]);
        nextBoard[r][c] = color;
        for (const s of result.captured) {
            nextBoard[s.r][s.c] = 0;
        }
        
        const { liberties } = this.getGroupLiberties(nextBoard, r, c);
        
        if (liberties === 1 && result.captured.length < 2) {
            score -= 500; 
        } else {
            score += liberties * 5;
        }
        
        const center = (this.size - 1) / 2;
        const distToCenter = Math.abs(r - center) + Math.abs(c - center);
        score += (this.size - distToCenter) * 0.5;

        if (r === 0 || r === this.size - 1 || c === 0 || c === this.size - 1) {
            score -= 10;
        }
        
        validMoves.push({r, c, score});
      }
    }
    
    validMoves.sort((a, b) => b.score - a.score);
    
    if (validMoves.length === 0 || validMoves[0].score < -100) {
        return null;
    }
    
    const bestScore = validMoves[0].score;
    const topMoves = validMoves.filter(m => m.score >= bestScore - 5);
    const chosen = topMoves[Math.floor(Math.random() * topMoves.length)];

    return { r: chosen.r, c: chosen.c };
  }
}
