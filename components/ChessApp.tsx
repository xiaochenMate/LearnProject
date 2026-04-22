
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, RotateCcw, Undo2, Swords, Trophy, 
  Volume2, VolumeX, Cpu, History, User, Loader2
} from 'lucide-react';

// 声明全局 Chess 对象
declare var Chess: any;

// 使用更稳定的棋子资源库，避免 SVG 在某些平板浏览器上的加载问题
const PIECE_IMAGES: Record<string, string> = {
  wP: 'https://chessboardjs.com/img/chesspieces/wikipedia/wP.png',
  wN: 'https://chessboardjs.com/img/chesspieces/wikipedia/wN.png',
  wB: 'https://chessboardjs.com/img/chesspieces/wikipedia/wB.png',
  wR: 'https://chessboardjs.com/img/chesspieces/wikipedia/wR.png',
  wQ: 'https://chessboardjs.com/img/chesspieces/wikipedia/wQ.png',
  wK: 'https://chessboardjs.com/img/chesspieces/wikipedia/wK.png',
  bP: 'https://chessboardjs.com/img/chesspieces/wikipedia/bP.png',
  bN: 'https://chessboardjs.com/img/chesspieces/wikipedia/bN.png',
  bB: 'https://chessboardjs.com/img/chesspieces/wikipedia/bB.png',
  bR: 'https://chessboardjs.com/img/chesspieces/wikipedia/bR.png',
  bQ: 'https://chessboardjs.com/img/chesspieces/wikipedia/bQ.png',
  bK: 'https://chessboardjs.com/img/chesspieces/wikipedia/bK.png',
};

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

type BoardTheme = 'wood' | 'green' | 'blue';

const THEMES: Record<BoardTheme, { light: string, dark: string, name: string }> = {
  wood: { light: '#f0d9b5', dark: '#b58863', name: '经典木纹' },
  green: { light: '#eeeed2', dark: '#769656', name: '森林绿' },
  blue: { light: '#dee3e6', dark: '#8ca2ad', name: '赛博蓝' }
};

const ChessApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [game, setGame] = useState<any>(null);
  const [board, setBoard] = useState<any[][]>([]);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('白方走棋');
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [theme, setTheme] = useState<BoardTheme>('green');
  const [lastMove, setLastMove] = useState<{ from: string, to: string } | null>(null);
  const [isLibReady, setIsLibReady] = useState(false);
  
  const [evalValue, setEvalValue] = useState<number>(0);
  const [whiteTimer, setWhiteTimer] = useState(600);
  const [blackTimer, setBlackTimer] = useState(600);
  const [captured, setCaptured] = useState<{ w: string[], b: string[] }>({ w: [], b: [] });
  const [materialAdv, setMaterialAdv] = useState(0);

  const audioCtx = useRef<AudioContext | null>(null);
  const timerRef = useRef<any>(null);

  const playSound = useCallback((type: 'move' | 'capture' | 'check' | 'checkmate') => {
    if (!soundEnabled) return;
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === 'move') {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
    } else if (type === 'capture') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
    } else if (type === 'check') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
    }
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.1);
  }, [soundEnabled]);

  const runEvaluation = (gameObj: any) => {
    if (!gameObj) return;
    const currentBoard = gameObj.board();
    let whiteScore = 0;
    let blackScore = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = currentBoard[r][c];
        if (piece) {
          const val = PIECE_VALUES[piece.type] || 0;
          if (piece.color === 'w') whiteScore += val;
          else blackScore += val;
        }
      }
    }
    setMaterialAdv(whiteScore - blackScore);
    setEvalValue((whiteScore - blackScore) * 0.8 + (Math.random() * 0.4 - 0.2)); 
  };

  useEffect(() => {
    const initGame = () => {
      if (typeof Chess !== 'undefined') {
        const newGame = new Chess();
        setGame(newGame);
        setBoard(newGame.board());
        setIsLibReady(true);
        runEvaluation(newGame);
      } else {
        setTimeout(initGame, 100);
      }
    };
    initGame();

    timerRef.current = setInterval(() => {
      setGame((current: any) => {
        if (!current || current.game_over()) return current;
        if (current.turn() === 'w') setWhiteTimer(t => Math.max(0, t - 1));
        else setBlackTimer(t => Math.max(0, t - 1));
        return current;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const updateState = useCallback((gameObj: any) => {
    setBoard(gameObj.board());
    setHistory(gameObj.history());
    runEvaluation(gameObj);
    const turn = gameObj.turn() === 'w' ? '白方' : '黑方';
    if (gameObj.in_checkmate()) {
      setStatus(`将死！${turn === '白方' ? '黑方' : '白方'} 获胜`);
      setGameOver(true);
      playSound('checkmate');
    } else if (gameObj.in_draw()) {
      setStatus('平局！');
      setGameOver(true);
    } else {
      setStatus(`${turn}走棋`);
      if (gameObj.in_check()) playSound('check');
    }
  }, [playSound]);

  const makeAiMove = useCallback(() => {
    if (!game || game.game_over()) return;
    setIsAiThinking(true);
    setTimeout(() => {
      const moves = game.moves({ verbose: true });
      if (moves.length === 0) {
          setIsAiThinking(false);
          return;
      }
      const captures = moves.filter((m: any) => m.captured);
      const move = captures.length > 0 ? captures[Math.floor(Math.random() * captures.length)] : moves[Math.floor(Math.random() * moves.length)];
      const result = game.move(move.san);
      if (result) {
        setLastMove({ from: result.from, to: result.to });
        if (result.captured) {
            playSound('capture');
            setCaptured(prev => ({ ...prev, b: [...prev.b, result.captured] }));
        } else playSound('move');
      }
      updateState(game);
      setIsAiThinking(false);
    }, 600);
  }, [game, playSound, updateState]);

  const handleSquareClick = (row: number, col: number) => {
    if (gameOver || isAiThinking || !game) return;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const square = files[col] + ranks[row];
    
    if (selectedSquare) {
      const result = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      if (result) {
        setLastMove({ from: result.from, to: result.to });
        if (result.captured) {
            playSound('capture');
            setCaptured(prev => ({ ...prev, w: [...prev.w, result.captured] }));
        } else playSound('move');
        updateState(game);
        setSelectedSquare(null);
        setValidMoves([]);
        if (!game.game_over()) makeAiMove();
        return;
      }
    }
    
    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true });
      setValidMoves(moves.map((m: any) => m.to));
    } else {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  const undoMove = () => {
    if (!game || gameOver || isAiThinking || history.length === 0) return;
    game.undo(); game.undo();
    updateState(game);
    setLastMove(null);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setGameOver(false);
    setHistory([]);
    setLastMove(null);
    setWhiteTimer(600);
    setBlackTimer(600);
    setCaptured({ w: [], b: [] });
    updateState(newGame);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isLibReady) {
      return (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-white tech-font tracking-widest animate-pulse">BOOTING_LOGIC_CORE</p>
          </div>
      )
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col font-sans overflow-hidden">
      
      <div className="fixed top-0 left-0 w-full h-[3px] bg-slate-900 z-[100]">
          <div 
            className="h-full bg-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(52,211,153,0.8)]"
            style={{ width: `${Math.min(100, Math.max(0, 50 + evalValue * 10))}%` }}
          />
      </div>

      <header className="shrink-0 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 z-20">
        <div className="bg-slate-950/80 px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]"></div>
          <span className="text-[10px] sm:text-xs font-black tech-font text-white uppercase italic tracking-tighter">{status}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 bg-slate-800/80 text-white/60 hover:text-emerald-400 rounded-full border border-white/10 transition-all">
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button onClick={onClose} className="p-2.5 bg-slate-800/80 text-white/60 hover:text-red-500 rounded-full border border-white/10 transition-all">
            <X size={18}/>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row items-center justify-center p-3 sm:p-6 lg:p-10 gap-4 xl:gap-12 relative overflow-y-auto no-scrollbar">
        
        <aside className="hidden xl:flex flex-col items-center gap-6 w-20">
            <div className="relative w-5 h-[450px] bg-slate-900 rounded-full overflow-hidden border border-white/10 shadow-inner">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-1000" style={{ height: `${Math.min(98, Math.max(2, 50 + evalValue * 10))}%` }} />
            </div>
            <span className="text-[10px] font-black text-emerald-500 tech-font rotate-90 whitespace-nowrap opacity-50">EVAL_SENSORS</span>
        </aside>

        <div className="flex flex-col items-center w-full max-w-[min(100%,500px)] space-y-2 md:space-y-4">
            
            <div className="flex items-center justify-between w-full px-2 py-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${game?.turn() === 'b' ? 'bg-slate-800 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                        <Cpu size={18} className={game?.turn() === 'b' ? 'text-emerald-400' : ''} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1 tracking-widest">AI_LOGIC_V4</span>
                        <div className="flex -space-x-1.5 opacity-60">
                            {captured.w.slice(-6).map((p, i) => (
                                <img key={i} src={PIECE_IMAGES[`w${p.toUpperCase()}`]} className="h-4 drop-shadow-sm" alt="cap" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className={`text-lg md:text-xl font-black font-mono px-4 py-1.5 rounded-xl border-2 transition-all duration-500 ${game?.turn() === 'b' ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg scale-105' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}>
                    {formatTime(blackTimer)}
                </div>
            </div>

            {/* 核心棋盘容器 - 增加 touch-action: none 防止平板误触滚动 */}
            <div className="relative w-full aspect-square bg-[#2d1e15] p-1.5 rounded-xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] border-[6px] border-[#3d2b1f] overflow-visible touch-none">
                <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-around text-[8px] font-black text-slate-700 italic pointer-events-none uppercase">
                    {['8','7','6','5','4','3','2','1'].map(n => <span key={n}>{n}</span>)}
                </div>
                <div className="absolute -bottom-6 left-0 right-0 flex justify-around text-[8px] font-black text-slate-700 italic pointer-events-none uppercase">
                    {['A','B','C','D','E','F','G','H'].map(l => <span key={l}>{l}</span>)}
                </div>

                <div className="grid grid-cols-8 grid-rows-8 w-full h-full border-2 border-slate-950 overflow-hidden rounded-md bg-slate-800">
                    {board.length > 0 && board.map((rowArr, r) => rowArr.map((cell, c) => {
                        const squareName = String.fromCharCode(97 + c) + (8 - r);
                        const isDark = (r + c) % 2 === 1;
                        const isSelected = selectedSquare === squareName;
                        const isValidTarget = validMoves.includes(squareName);
                        const isLast = lastMove && (lastMove.from === squareName || lastMove.to === squareName);
                        const isCheck = cell?.type === 'k' && cell?.color === game?.turn() && game?.in_check();

                        return (
                            <div 
                                key={`${r}-${c}`}
                                onClick={() => handleSquareClick(r, c)}
                                className="relative flex items-center justify-center cursor-pointer touch-manipulation transition-all duration-200 group"
                                style={{ backgroundColor: isDark ? THEMES[theme].dark : THEMES[theme].light }}
                            >
                                {isLast && <div className="absolute inset-0 bg-yellow-400/25 z-0" />}
                                {isSelected && <div className="absolute inset-0 bg-emerald-400/40 ring-inset ring-2 ring-emerald-400/30 z-0" />}
                                {isCheck && <div className="absolute inset-0 bg-red-600/40 animate-pulse z-0" />}
                                
                                {isValidTarget && (
                                    <div className={`absolute w-3 h-3 md:w-4 md:h-4 rounded-full z-10 ${cell ? 'ring-4 ring-black/15' : 'bg-black/15 shadow-inner'}`} />
                                )}

                                {cell && (
                                    <img 
                                        src={PIECE_IMAGES[`${cell.color}${cell.type.toUpperCase()}`]} 
                                        alt={`${cell.color}${cell.type}`}
                                        loading="eager"
                                        className="w-[90%] h-[90%] object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.4)] transition-all duration-300 z-20 pointer-events-none group-active:scale-125"
                                        style={{ transform: isSelected ? 'translateY(-8px)' : 'none' }}
                                    />
                                )}
                            </div>
                        );
                    }))}
                </div>

                {isAiThinking && (
                    <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center z-50 rounded-md">
                        <div className="bg-slate-950/95 px-5 py-3 rounded-2xl border border-emerald-500/40 flex items-center gap-3 animate-in zoom-in shadow-2xl">
                            <Cpu size={16} className="text-emerald-500 animate-spin" />
                            <span className="text-[10px] font-black tech-font text-emerald-500 uppercase italic tracking-[0.2em]">Synthesizing_Move</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between w-full px-2 py-1 shrink-0">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500 ${game?.turn() === 'w' ? 'bg-blue-600 border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-slate-900 border-slate-800 text-slate-700'}`}>
                        <User size={18} className={game?.turn() === 'w' ? 'text-white' : ''} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-500 uppercase leading-none mb-1 tracking-widest">COMMANDER</span>
                        <div className="flex -space-x-1.5 opacity-60">
                            {captured.b.slice(-6).map((p, i) => (
                                <img key={i} src={PIECE_IMAGES[`b${p.toUpperCase()}`]} className="h-4 drop-shadow-sm" alt="cap" />
                            ))}
                        </div>
                    </div>
                </div>
                <div className={`text-lg md:text-xl font-black font-mono px-4 py-1.5 rounded-xl border-2 transition-all duration-500 ${game?.turn() === 'w' ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' : 'bg-slate-900/50 border-slate-800 text-slate-600'}`}>
                    {formatTime(whiteTimer)}
                </div>
            </div>
        </div>

        <aside className="w-full xl:w-72 flex flex-col gap-3 self-stretch px-2 pb-6 max-w-[500px]">
            <div className="bg-slate-900/70 border border-white/5 p-4 rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden min-h-[100px] xl:min-h-0">
                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                        <History size={12} /> ENGAGEMENT_HISTORY
                    </h3>
                    <div className="text-[8px] font-mono text-slate-500 tracking-tighter">PHASE: {Math.ceil(history.length / 2)}</div>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-4 xl:grid-cols-2 gap-2 content-start">
                    {history.map((move, i) => (
                        <div key={i} className={`flex items-center gap-2 text-[10px] p-2 rounded-lg bg-slate-950/80 border border-white/5 transition-all hover:border-emerald-500/30`}>
                            <span className="w-4 text-slate-600 text-right font-mono text-[8px]">{i % 2 === 0 ? Math.floor(i/2) + 1 + '.' : ''}</span>
                            <span className="font-bold text-slate-100 truncate">{move}</span>
                        </div>
                    ))}
                    {history.length === 0 && <p className="col-span-full text-[9px] text-slate-700 italic text-center py-6 uppercase tracking-[0.3em] font-black">Waiting_For_Initial_Move</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 shrink-0">
                <button onClick={undoMove} className="py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/5 shadow-lg group">
                    <Undo2 size={16} className="group-hover:-rotate-45 transition-transform" /> UNDO
                </button>
                <button onClick={resetGame} className="py-4 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/5 shadow-lg">
                    <RotateCcw size={16} /> RESET
                </button>
            </div>
        </aside>
      </main>

      {gameOver && (
          <div className="fixed inset-0 z-[200] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-500 text-center">
              <div className="relative mb-8">
                <div className="absolute -inset-10 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
                <Trophy size={100} className="text-emerald-400 relative z-10 drop-shadow-[0_0_40px_rgba(16,185,129,0.6)]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-white italic tech-font mb-2 uppercase tracking-tighter">Engagement_Concluded</h2>
              <p className="text-emerald-500 font-bold uppercase tracking-[0.4em] mb-12 text-sm md:text-base">{status}</p>
              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md px-6">
                <button onClick={resetGame} className="flex-1 py-5 bg-white text-black font-black text-base rounded-[2rem] hover:bg-emerald-500 transition-all active:scale-95 tech-font uppercase shadow-2xl">New_Match</button>
                <button onClick={onClose} className="flex-1 py-5 bg-slate-900 text-white font-black text-base rounded-[2rem] hover:bg-slate-800 transition-all active:scale-95 tech-font uppercase border border-white/10 shadow-xl">Exit_Sync</button>
              </div>
          </div>
      )}

      <footer className="h-8 bg-slate-950 px-6 flex items-center justify-between z-20 shrink-0 border-t border-white/5">
        <div className="flex items-center gap-6">
            <span className="text-[8px] font-mono text-emerald-500/40 flex items-center gap-2 italic tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                NEURAL_LINK: ENCRYPTED
            </span>
            <span className="text-[8px] font-mono text-slate-800 uppercase tracking-widest italic hidden md:block">LATENCY: 14MS / CLUSTER_NODE_7</span>
        </div>
        <span className="text-[8px] font-mono text-slate-700 uppercase tracking-widest italic font-bold">V4.5_TABLET_READY</span>
      </footer>

      <style>{`
        .tech-font { font-family: 'Orbitron', sans-serif; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        @keyframes pulse-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.98); opacity: 0.95; }
        }
        .animate-pulse-slow { animation: pulse-slow 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default ChessApp;
