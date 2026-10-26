import { searchXiangqi } from './xiangqi';
self.onmessage = (event: MessageEvent<{ fen: string; level: number }>) => {
  try { self.postMessage(searchXiangqi(event.data.fen, event.data.level)); }
  catch { self.postMessage({ move: null, error: '无法分析此局面' }); }
};
