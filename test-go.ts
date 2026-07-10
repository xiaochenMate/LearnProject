import { GoEngine } from './lib/goLibrary';
const engine = new GoEngine(19);
const board = GoEngine.createBoard(19);
const start = Date.now();
const move = engine.getBestMove(board, 2, undefined);
console.log('Move:', move, 'Time:', Date.now() - start, 'ms');
