
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { 
  X, 
  RotateCcw, 
  Undo2, 
  Trophy, 
  Settings2, 
  ChevronLeft, 
  Info, 
  History,
  Timer,
  Volume2,
  VolumeX,
  Maximize2,
  BookOpen
} from 'lucide-react';
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { GoEngine, BoardState, StoneColor } from '../lib/goLibrary';

type GameState = 'SELECTION' | 'PLAYING' | 'SETTLEMENT' | 'SCORING';
type BoardSize = 9 | 13 | 19;

const STONE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';

// --- Sub-components ---

const Stone = memo(({ type, isLast, isTerritory }: { type: number, isLast: boolean, isTerritory?: boolean }) => {
  if (isTerritory) {
    return (
      <motion.div 
        initial={{ scale: 0 }}
        animate={{ scale: 0.4 }}
        className={`w-[60%] h-[60%] rounded-sm ${type === 11 ? 'bg-slate-900' : 'bg-white'} shadow-sm opacity-60`}
      />
    );
  }

  return (
    <motion.div 
      initial={isLast ? { scale: 0.3, opacity: 0 } : { scale: 1, opacity: 1 }} 
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={`
        w-[92%] h-[92%] rounded-full relative z-20 flex items-center justify-center
        ${type === 1 
          ? 'bg-gradient-to-br from-slate-700 to-slate-950 shadow-black-stone' 
          : 'bg-gradient-to-br from-white to-slate-200 shadow-white-stone'
        }
        ${isLast ? 'ring-1 ring-red-500/60 ring-offset-1 ring-offset-transparent' : ''}
      `}
    >
      {/* 增强3D光泽感 */}
      <div className={`absolute top-1 left-1.5 w-[30%] h-[30%] rounded-full blur-[2px] ${type === 1 ? 'bg-white/20' : 'bg-white/60'}`}></div>
      {isLast && <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>}
    </motion.div>
  );
});

const GoApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [board, setBoard] = useState<BoardState>(GoEngine.createBoard(19));
  const [territoryMap, setTerritoryMap] = useState<number[][]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<StoneColor>(1);
  const [captures, setCaptures] = useState({ b: 0, w: 0 });
  const [lastMove, setLastMove] = useState<{r: number, c: number} | null>(null);
  const [passCount, setPassCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [scores, setScores] = useState({ b: 0, w: 0 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [hoverPos, setHoverPos] = useState<{r: number, c: number} | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // AI State
  const [isPvE, setIsPvE] = useState(true);
  const [playerPreferredColor, setPlayerPreferredColor] = useState<StoneColor>(1);
  const [aiColor, setAiColor] = useState<StoneColor>(2); // AI is White by default
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  const engineRef = useRef<GoEngine>(new GoEngine(19));
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(STONE_SOUND_URL);
  }, []);

  const showToast = useCallback((msg: string) => {
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (gameState === 'PLAYING') {
      interval = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // AI Turn Logic
  useEffect(() => {
    if (gameState === 'PLAYING' && isPvE && currentPlayer === aiColor) {
      setIsAiThinking(true);
      
      // Dynamic thinking time based on board state (randomized 600ms - 1500ms)
      const thinkingTime = 600 + Math.random() * 900;
      
      const timerId = setTimeout(() => {
        const move = engineRef.current.getBestMove(board, aiColor, history[history.length - 1]);
        if (move) {
          handlePlaceStone(move.r, move.c, true);
        } else {
          handlePass(true);
        }
        setIsAiThinking(false);
      }, thinkingTime);
      return () => clearTimeout(timerId);
    }
  }, [gameState, currentPlayer, isPvE, aiColor, board, history]);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const playSound = () => {
    if (soundEnabled && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    }
  };

  const startNewGame = (size: BoardSize) => {
    setBoardSize(size);
    engineRef.current = new GoEngine(size);
    setBoard(GoEngine.createBoard(size));
    
    if (isPvE) {
        setAiColor(playerPreferredColor === 1 ? 2 : 1);
    }
    
    setHistory([]);
    setPassCount(0);
    setTimer(0);
    setCurrentPlayer(1);
    setCaptures({ b: 0, w: 0 });
    setLastMove(null);
    setTerritoryMap([]);
    setIsAiThinking(false);
    setToastMessage(null);
    setGameState('PLAYING');
  };

  const handlePlaceStone = (r: number, c: number, isAiMove = false) => {
    if (gameState !== 'PLAYING') return;
    if (isPvE && !isAiMove && currentPlayer === aiColor) return;

    const result = engineRef.current.validateMove(
        board, 
        r, 
        c, 
        currentPlayer, 
        history[history.length - 1]
    );

    if (!result) return;

    playSound();
    const nextBoard = board.map(row => [...row]);
    nextBoard[r][c] = currentPlayer;
    
    // Apply captures
    if (result.captured.length > 0) {
        for (const stone of result.captured) {
            nextBoard[stone.r][stone.c] = 0;
        }
        setCaptures(prev => ({
            ...prev,
            [currentPlayer === 1 ? 'b' : 'w']: prev[currentPlayer === 1 ? 'b' : 'w'] + result.captured.length
        }));
    }

    setHistory(prev => [...prev, JSON.stringify(board)]);
    setBoard(nextBoard);
    setLastMove({ r, c });
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    setPassCount(0);
  };

  const handlePass = (isAiMove = false) => {
    if (gameState !== 'PLAYING') return;
    if (isPvE && !isAiMove && currentPlayer === aiColor) return;
    
    const colorName = currentPlayer === 1 ? '黑方' : '白方';
    showToast(`${colorName} 停着 (Pass)`);
    
    const newPassCount = passCount + 1;
    setPassCount(newPassCount);
    setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    setLastMove(null);
    
    if (newPassCount >= 2) {
      showToast('双方停着，对局结束');
      setTimeout(finishGame, 1500);
    }
  };

  const finishGame = () => {
    const result = engineRef.current.estimateScore(board);
    setScores({ b: result.black, w: result.white });
    setTerritoryMap(result.territory);
    setGameState('SCORING');
  };

  const handleResign = () => {
    if (confirm('确认认输吗？诚实即是围棋之道。')) {
      const winner = currentPlayer === 1 ? 'White' : 'Black';
      alert(`${winner === 'White' ? '白方' : '黑方'}不战而胜。`);
      setGameState('SELECTION');
    }
  };

  const undoMove = () => {
    if (history.length === 0) return;
    const prevHistory = [...history];
    const rawBoard = prevHistory.pop();
    if (rawBoard) {
        setBoard(JSON.parse(rawBoard));
        setHistory(prevHistory);
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        setLastMove(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a1a1a] flex flex-col items-center overflow-hidden font-sans">
      {/* Header - Recipe 3 Hardware/Specialist Tool style labels */}
      <header className="w-full flex items-center justify-between px-6 pt-10 pb-6 z-50 shrink-0">
        <button 
          onClick={onClose} 
          className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-full transition-all active:scale-95 border border-white/10"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1">
                <BookOpen size={14} className="text-amber-500/60" />
                <h1 className="text-xl font-bold tracking-[0.2em] text-white serif-font italic">棋语 · ECHOES</h1>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-amber-500/40 bg-amber-500/5 px-3 py-0.5 rounded-full border border-amber-500/10">
                    Board: {boardSize}x{boardSize}
                </span>
            </div>
        </div>

        <button 
          className="w-10 h-10 flex items-center justify-center bg-white/5 text-white/40 rounded-full border border-white/10 transition-all hover:text-white"
          onClick={() => setSoundEnabled(!soundEnabled)}
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 relative">
         <AnimatePresence mode="wait">
            {gameState === 'SELECTION' ? (
              <motion.div 
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm"
              >
                  <div className="text-center mb-8">
                      <h2 className="text-3xl font-light text-white mb-3 serif-font italic">挑选棋局</h2>
                      <p className="text-white/30 text-xs font-black uppercase tracking-widest mb-6">Select Match Type</p>
                      
                      <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 mb-6">
                          <button 
                              onClick={() => setIsPvE(true)}
                              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${isPvE ? 'bg-amber-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                          >
                              人机对奕 (PvE)
                          </button>
                          <button 
                              onClick={() => setIsPvE(false)}
                              className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${!isPvE ? 'bg-amber-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
                          >
                              双人同屏 (PvP)
                          </button>
                      </div>

                      <AnimatePresence>
                          {isPvE && (
                              <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden mb-6"
                              >
                                  <div className="flex justify-center gap-4">
                                      <button 
                                          onClick={() => setPlayerPreferredColor(1)}
                                          className={`px-6 py-2 rounded-full text-xs font-bold transition-all border ${playerPreferredColor === 1 ? 'bg-slate-900 border-amber-500 text-white shadow-md' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                      >
                                          执黑 (先走)
                                      </button>
                                      <button 
                                          onClick={() => setPlayerPreferredColor(2)}
                                          className={`px-6 py-2 rounded-full text-xs font-bold transition-all border ${playerPreferredColor === 2 ? 'bg-white border-amber-500 text-slate-900 shadow-md' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                                      >
                                          执白 (后走)
                                      </button>
                                  </div>
                              </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
                  <div className="space-y-4">
                      {[
                        { s: 9, label: '九路·入门', desc: '练习死活与快速局', icon: '01' },
                        { s: 13, label: '十三路·进阶', desc: '战略与局部的平衡', icon: '02' },
                        { s: 19, label: '十九路·终焉', desc: '正规赛事规格，智慧之海', icon: '03' }
                      ].map((opt) => (
                        <button 
                          key={opt.s}
                          onClick={() => startNewGame(opt.s as BoardSize)}
                          className="w-full group p-6 bg-white/5 border border-white/10 rounded-3xl flex items-center gap-6 transition-all hover:bg-white/10 hover:-translate-y-1 active:scale-95"
                        >
                            <div className="text-2xl font-bold font-serif text-white/10 group-hover:text-amber-500/40 transition-colors uppercase italic">{opt.icon}</div>
                            <div className="text-left flex-1">
                                <h3 className="text-lg font-bold text-white mb-1">{opt.label}</h3>
                                <p className="text-[10px] text-white/40 font-medium">{opt.desc}</p>
                            </div>
                            <Maximize2 size={18} className="text-white/20 group-hover:text-amber-500 transition-all" />
                        </button>
                      ))}
                  </div>
              </motion.div>
            ) : (
                <motion.div 
                  key="playing"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-3xl flex flex-col items-center lg:flex-row lg:items-start lg:justify-center gap-10"
                >
                    {/* Game Stats Panel - Left Side on Desktop */}
                    <div className="flex flex-row lg:flex-col gap-4 w-full lg:w-48 order-2 lg:order-1">
                        <PlayerStats 
                            name={isPvE && aiColor === 1 ? "AI大师·黑" : "执黑·Black"} 
                            captures={captures.b} 
                            active={currentPlayer === 1} 
                            stoneColor="bg-slate-950" 
                            score={gameState === 'SCORING' ? scores.b : undefined}
                            isThinking={isPvE && aiColor === 1 && isAiThinking}
                        />
                        <PlayerStats 
                            name={isPvE && aiColor === 2 ? "AI大师·白" : "执白·White"} 
                            captures={captures.w} 
                            active={currentPlayer === 2} 
                            stoneColor="bg-slate-100" 
                            score={gameState === 'SCORING' ? scores.w : undefined}
                            isThinking={isPvE && aiColor === 2 && isAiThinking}
                        />
                        
                        <div className="hidden lg:flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl">
                             <Timer size={14} className="text-white/30" />
                             <span className="text-sm font-mono font-bold text-white/60 tracking-wider">
                                {formatTime(timer)}
                             </span>
                        </div>
                    </div>

                    {/* The Board - Center */}
                    <div className="relative order-1 lg:order-2 shrink-0">
                        {/* Toast Notification */}
                        <AnimatePresence>
                            {toastMessage && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] pointer-events-none"
                                >
                                    <div className="bg-slate-900/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl border border-white/10 font-bold tracking-widest uppercase text-sm">
                                        {toastMessage}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div 
                            className="bg-[#DAB671] rounded-sm shadow-2xl relative border-[6px] border-[#8a6b38]"
                            style={{ 
                                width: 'min(90vw, 520px)', 
                                height: 'min(90vw, 520px)',
                                backgroundImage: `url('https://images.unsplash.com/photo-1544208062-331ae1872df0?auto=format&fit=crop&q=80&w=800')`,
                                backgroundSize: 'cover',
                                backgroundBlendMode: 'overlay'
                            }}
                        >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 p-[5%] overflow-visible grid" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)`, gridTemplateRows: `repeat(${boardSize}, 1fr)` }}>
                                {Array.from({ length: boardSize * boardSize }).map((_, i) => {
                                    const r = Math.floor(i / boardSize);
                                    const c = i % boardSize;
                                    
                                    // Calculate star points (Hosshi)
                                    const isStarPoint = (size: number, r: number, c: number) => {
                                        if (size === 19) {
                                            const pts = [3, 9, 15];
                                            return pts.includes(r) && pts.includes(c);
                                        } else if (size === 13) {
                                            const pts = [3, 6, 9];
                                            return pts.includes(r) && pts.includes(c);
                                        } else if (size === 9) {
                                            const pts = [2, 4, 6];
                                            return pts.includes(r) && pts.includes(c);
                                        }
                                        return false;
                                    };

                                    return (
                                        <div key={i} className="relative w-full h-full flex items-center justify-center">
                                            {/* Intersection lines */}
                                            <div className={`absolute w-[1.5px] h-full bg-slate-900/40 ${r === 0 ? 'top-1/2' : r === boardSize - 1 ? 'bottom-1/2' : 'h-full'}`}></div>
                                            <div className={`absolute h-[1.5px] w-full bg-slate-900/40 ${c === 0 ? 'left-1/2' : c === boardSize - 1 ? 'right-1/2' : 'w-full'}`}></div>
                                            
                                            {/* Star points */}
                                            {isStarPoint(boardSize, r, c) && (
                                                <div className="absolute w-2 h-2 bg-slate-900/80 rounded-full z-10"></div>
                                            )}

                                            {/* Interaction Area */}
                                            <div 
                                                className="absolute inset-0 z-30 cursor-pointer flex items-center justify-center group"
                                                onClick={() => handlePlaceStone(r, c)}
                                                onMouseEnter={() => setHoverPos({r, c})}
                                                onMouseLeave={() => setHoverPos(null)}
                                            >
                                                {board[r][c] === 0 && gameState === 'PLAYING' && (
                                                    <div className={`w-[85%] h-[85%] rounded-full opacity-0 group-hover:opacity-40 transition-opacity transform group-hover:scale-95 shadow-lg ${currentPlayer === 1 ? 'bg-black' : 'bg-white'}`}></div>
                                                )}
                                                {board[r][c] !== 0 && (
                                                    <Stone type={board[r][c]} isLast={lastMove?.r === r && lastMove?.c === c} />
                                                )}
                                                {gameState === 'SCORING' && territoryMap[r][c] > 10 && (
                                                    <Stone type={territoryMap[r][c]} isLast={false} isTerritory />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Coords labels */}
                        {showCoords && (
                            <>
                                <div className="absolute -bottom-8 left-0 right-0 p-[5%] flex justify-between px-2 text-[10px] font-black text-white/30 font-mono tracking-tighter">
                                    {Array.from({length: boardSize}).map((_, i) => <span key={i} className="w-full text-center">{String.fromCharCode(65 + (i >= 8 ? i + 1 : i))}</span>)}
                                </div>
                                <div className="absolute top-0 bottom-0 -left-8 p-[5%] flex flex-col justify-between py-2 text-[10px] font-black text-white/30 font-mono tracking-tighter">
                                    {Array.from({length: boardSize}).map((_, i) => <span key={i} className="h-full flex items-center">{boardSize - i}</span>)}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions Drawer - Bottom on mobile/side on lg */}
                    <div className="flex flex-col gap-3 w-full lg:w-48 order-3">
                         {gameState === 'PLAYING' && (
                            <>
                                <GameAction 
                                    icon={<History size={18}/>} 
                                    title="停着" 
                                    desc="Pass Turn" 
                                    onClick={handlePass}
                                    color="white"
                                />
                                <GameAction 
                                    icon={<Undo2 size={18}/>} 
                                    title="悔棋" 
                                    desc="Undo (1)" 
                                    disabled={history.length === 0}
                                    onClick={undoMove}
                                    color="white"
                                />
                                <GameAction 
                                    icon={<RotateCcw size={18}/>} 
                                    title="认输" 
                                    desc="Resign Match" 
                                    onClick={handleResign}
                                    color="red"
                                />
                            </>
                         )}

                         {gameState === 'SCORING' && (
                             <div className="bg-amber-500 p-6 rounded-2xl shadow-xl shadow-amber-500/10">
                                <Trophy size={20} className="text-white mb-2" />
                                <h3 className="text-lg font-black text-white leading-tight">即兴结算</h3>
                                <p className="text-[10px] text-white/60 font-bold uppercase mb-4 tracking-tighter">Final Scoring</p>
                                <div className="space-y-4">
                                     <div className="bg-black/10 rounded-xl p-3 flex justify-between items-center">
                                         <span className="text-[11px] font-bold text-white/80">Black</span>
                                         <span className="text-xl font-black text-white">{scores.b}</span>
                                     </div>
                                     <div className="bg-black/10 rounded-xl p-3 flex justify-between items-center">
                                         <span className="text-[11px] font-bold text-white/80">White (贴)</span>
                                         <span className="text-xl font-black text-white">{scores.w}</span>
                                     </div>
                                </div>
                                <button 
                                    onClick={() => setGameState('SELECTION')}
                                    className="w-full mt-6 py-3 bg-white text-amber-600 rounded-xl font-black text-[11px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                                >
                                    返回大厅
                                </button>
                             </div>
                         )}

                         <div className="p-5 bg-white/5 border border-white/5 rounded-2xl lg:mt-auto">
                            <Info size={14} className="text-amber-500/40 mb-3" />
                            <p className="text-[10px] leading-relaxed text-amber-500/50 font-bold uppercase tracking-tight">
                                中国围棋规则: 黑棋需贴7.5目。双停则进入简易点目自动结算。为计算精确，请确信盘面已无死子后再停着。
                            </p>
                         </div>
                    </div>
                </motion.div>
            )}
         </AnimatePresence>
      </main>

      {/* Internal Shadow styles for stones */}
      <style>{`
        .shadow-black-stone { 
            box-shadow: 
                inset 1px 1px 3px rgba(255,255,255,0.1),
                inset -3px -3px 8px rgba(0,0,0,0.8),
                3px 6px 10px rgba(0,0,0,0.4);
        }
        .shadow-white-stone { 
            box-shadow: 
                inset 1px 1px 4px rgba(255,255,255,1),
                inset -2px -2px 5px rgba(0,0,0,0.1),
                3px 5px 8px rgba(0,0,0,0.15);
        }
        .serif-font { font-family: 'Noto Serif SC', serif; }
      `}</style>
    </div>
  );
};

const PlayerStats = ({ name, captures, active, stoneColor, score, isThinking }: any) => (
    <div className={`flex-1 p-5 rounded-3xl border transition-all relative overflow-hidden ${active ? 'bg-white/5 border-amber-500/40 shadow-lg' : 'bg-white/5 border-white/5 opacity-40'}`}>
        {isThinking && (
           <motion.div 
               animate={{ x: ['-100%', '100%'] }} 
               transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent z-10" 
           />
        )}
        <div className="flex items-center gap-3 mb-2">
            <div className={`w-3.5 h-3.5 rounded-full ${stoneColor} shadow-md`}></div>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{name} {isThinking && <span className="animate-pulse ml-1 text-amber-400">(思考中...)</span>}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{score !== undefined ? score : captures}</span>
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">
                {score !== undefined ? 'Score' : 'Captures'}
            </span>
        </div>
        {active && !isThinking && (
            <motion.div 
                layoutId="active-indicator"
                className="mt-3 h-0.5 w-full bg-amber-500 rounded-full"
            />
        )}
    </div>
);

const GameAction = ({ icon, title, desc, onClick, disabled, color }: any) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center gap-4 transition-all group disabled:opacity-20 active:scale-95 ${color === 'red' ? 'hover:bg-red-500/10' : ''}`}
    >
        <div className={`${color === 'red' ? 'text-red-400' : 'text-amber-500/60'} group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div className="text-left">
            <div className="text-xs font-black text-white">{title}</div>
            <div className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{desc}</div>
        </div>
    </button>
);

export default GoApp;
