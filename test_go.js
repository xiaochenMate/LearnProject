import { GoEngine } from './lib/goLibrary.ts';
const engine = new GoEngine(9);
const b = GoEngine.createBoard(9);
const move = engine.getBestMove(b, 1, undefined);
console.log("Best move:", move);
