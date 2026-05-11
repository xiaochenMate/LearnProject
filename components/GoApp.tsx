
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

type GameState = 'SELECTION' | 'PLAYING' | 'SETTLEMENT';
type BoardSize = 9 | 13 | 19;

const STONE_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';

// --- Sub-components ---

const Stone = memo(({ type, isLast }: { type: number, isLast: boolean }) => (
  <motion.div 
    initial={isLast ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }} 
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
    className={`
      w-[88%] h-[88%] rounded-full relative z-20 flex items-center justify-center
      ${type === 1 
        ? 'bg-slate-900 shadow-stone-black' 
        : 'bg-white shadow-stone-white'
      }
      ${isLast ? 'ring-2 ring-red-400 ring-offset-2 ring-offset-transparent shadow-lg' : ''}
    `}
  >
    {/* Highlights for 3D effect */}
    <div className={`absolute top-1 left-2 w-1/4 h-1/4 rounded-full blur-[1px] ${type === 1 ? 'bg-white/10' : 'bg-black/5'}`}></div>
    {isLast && <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></div>}
  </motion.div>
));

const GoApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [boardSize, setBoardSize] = useState<BoardSize>(19);
  const [board, setBoard] = useState<BoardState>(GoEngine.createBoard(19));
  const [history, setHistory] = useState<string[]>([]); // Serialized board states for Ko/Undo
  const [currentPlayer, setCurrentPlayer] = useState<StoneColor>(1);
  const [captures, setCaptures] = useState({ b: 0, w: 0 });
  const [lastMove, setLastMove] = useState<{r: number, c: number} | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  
  const engineRef = useRef<GoEngine>(new GoEngine(19));
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(STONE_SOUND_URL);
  }, []);

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
    setHistory([]);
    setCurrentPlayer(1);
    setCaptures({ b: 0, w: 0 });
    setLastMove(null);
    setGameState('PLAYING');
  };

  const handlePlaceStone = (r: number, c: number) => {
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
                  <div className="text-center mb-10">
                      <h2 className="text-3xl font-light text-white mb-3 serif-font italic">挑选棋局</h2>
                      <p className="text-white/30 text-xs font-black uppercase tracking-widest">Select Board Dimension</p>
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
                            name="执黑·Black" 
                            captures={captures.b} 
                            active={currentPlayer === 1} 
                            stoneColor="bg-slate-900" 
                        />
                        <PlayerStats 
                            name="执白·White" 
                            captures={captures.w} 
                            active={currentPlayer === 2} 
                            stoneColor="bg-white" 
                        />
                    </div>

                    {/* The Board - Center */}
                    <div className="relative order-1 lg:order-2 shrink-0">
                        <div 
                            className="bg-[#DAB671] rounded-sm shadow-2xl relative border-[4px] border-[#92713e]"
                            style={{ 
                                width: 'min(85vw, 480px)', 
                                height: 'min(85vw, 480px)',
                                backgroundImage: `url('https://www.transparenttextures.com/patterns/wood-pattern-with-fine-lines.png')`
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
                                            <div className={`absolute w-px h-full bg-slate-800/60 ${r === 0 ? 'top-1/2' : r === boardSize - 1 ? 'bottom-1/2' : 'h-full'}`}></div>
                                            <div className={`absolute h-px w-full bg-slate-800/60 ${c === 0 ? 'left-1/2' : c === boardSize - 1 ? 'right-1/2' : 'w-full'}`}></div>
                                            
                                            {/* Star points */}
                                            {isStarPoint(boardSize, r, c) && (
                                                <div className="absolute w-2 h-2 bg-slate-900 rounded-full z-10 opacity-80"></div>
                                            )}

                                            {/* Interaction Area */}
                                            <div 
                                                className="absolute inset-0 z-30 cursor-pointer flex items-center justify-center group"
                                                onClick={() => handlePlaceStone(r, c)}
                                            >
                                                {board[r][c] === 0 && (
                                                    <div className={`w-[80%] h-[80%] rounded-full opacity-0 group-hover:opacity-30 transition-opacity ${currentPlayer === 1 ? 'bg-black' : 'bg-white'}`}></div>
                                                )}
                                                {board[r][c] !== 0 && (
                                                    <Stone type={board[r][c]} isLast={lastMove?.r === r && lastMove?.c === c} />
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
                                <div className="absolute -bottom-8 left-0 right-0 p-[5%] flex justify-between px-2 text-[10px] font-bold text-white/20 font-mono">
                                    {Array.from({length: boardSize}).map((_, i) => <span key={i} className="w-full text-center">{String.fromCharCode(65 + (i >= 8 ? i + 1 : i))}</span>)}
                                </div>
                                <div className="absolute top-0 bottom-0 -left-8 p-[5%] flex flex-col justify-between py-2 text-[10px] font-bold text-white/20 font-mono">
                                    {Array.from({length: boardSize}).map((_, i) => <span key={i} className="h-full flex items-center">{boardSize - i}</span>)}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions Drawer - Bottom on mobile/side on lg */}
                    <div className="flex flex-col gap-4 w-full lg:w-48 order-3">
                         <button 
                            onClick={undoMove}
                            disabled={history.length === 0}
                            className="bg-white/5 hover:bg-white/10 border border-white/10 p-5 rounded-2xl flex items-center gap-4 transition-all group disabled:opacity-20"
                         >
                            <Undo2 size={20} className="text-amber-500/60 group-hover:text-amber-500" />
                            <div className="text-left">
                                <div className="text-xs font-bold text-white">悔棋</div>
                                <div className="text-[10px] text-white/30 uppercase tracking-tighter">Undo Move</div>
                            </div>
                         </button>

                         <button 
                            onClick={() => setGameState('SELECTION')}
                            className="bg-white/5 hover:bg-red-500/10 border border-white/10 p-5 rounded-2xl flex items-center gap-4 transition-all group"
                         >
                            <RotateCcw size={20} className="text-red-400 group-hover:rotate-45 transition-transform" />
                            <div className="text-left">
                                <div className="text-xs font-bold text-white">重开</div>
                                <div className="text-[10px] text-white/30 uppercase tracking-tighter">New Match</div>
                            </div>
                         </button>

                         <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-2xl lg:mt-auto">
                            <Info size={16} className="text-amber-500/40 mb-3" />
                            <p className="text-[10px] leading-relaxed text-amber-500/60 font-medium">
                                落子无悔。围棋之道在于观全局而弃局部。Capture opponent's stones by depriving them of liberties.
                            </p>
                         </div>
                    </div>
                </motion.div>
            )}
         </AnimatePresence>
      </main>

      {/* Internal Shadow styles for stones */}
      <style>{`
        .shadow-stone-black { 
            box-shadow: 
                inset 2px 2px 5px rgba(255,255,255,0.1),
                inset -5px -5px 15px rgba(0,0,0,0.8),
                4px 6px 10px rgba(0,0,0,0.4);
        }
        .shadow-stone-white { 
            box-shadow: 
                inset 1px 1px 4px rgba(255,255,255,1),
                inset -3px -3px 8px rgba(0,0,0,0.05),
                3px 5px 8px rgba(0,0,0,0.2);
        }
        .serif-font { font-family: 'Noto Serif SC', serif; }
      `}</style>
    </div>
  );
};

const PlayerStats = ({ name, captures, active, stoneColor }: any) => (
    <div className={`flex-1 p-5 rounded-3xl border transition-all ${active ? 'bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-500/5' : 'bg-white/5 border-white/5 opacity-40'}`}>
        <div className="flex items-center gap-3 mb-2">
            <div className={`w-4 h-4 rounded-full ${stoneColor} shadow-md`}></div>
            <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{name}</span>
        </div>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{captures}</span>
            <span className="text-[10px] font-medium text-white/30 uppercase tracking-tighter">Captures</span>
        </div>
        {active && (
            <motion.div 
                layoutId="active-indicator"
                className="mt-3 h-1 w-full bg-amber-500 rounded-full"
            />
        )}
    </div>
);

export default GoApp;
