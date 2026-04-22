
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { X, RotateCcw, Undo2, Trophy, Settings2, ChevronLeft, ChevronRight, Lightbulb, Timer, Footprints, Volume2, VolumeX, Eye, EyeOff, Palette } from 'lucide-react';
// Fix: Bypassing broken framer-motion types in this environment
import { motion as motionBase, AnimatePresence } from 'framer-motion';
const motion = motionBase as any;
import { Player, Board, checkWin, getBestMove } from '../lib/gobangAI';

type GameState = 'SELECTION' | 'PLAYING' | 'SETTLEMENT';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type BoardTheme = 'classic' | 'jade' | 'dark';

// --- 性能优化：将子组件移出主组件，防止重新定义导致的重绘闪烁 ---

const Stone = memo(({ type, isLast, theme }: { type: Player, isLast: boolean, theme: BoardTheme }) => (
  <motion.div 
    initial={isLast ? { scale: 0, opacity: 0 } : { scale: 1, opacity: 1 }} 
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    className={`
      w-[94%] h-[94%] rounded-full shadow-stone relative z-20
      ${type === 1 ? 'bg-stone-black shadow-stone-black-inner' : (theme === 'dark' ? 'bg-slate-300' : 'bg-stone-white')} 
      ${type === 2 && theme !== 'dark' ? 'shadow-stone-white-inner' : ''}
      ${isLast ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent' : ''}
    `}
  >
     <div className={`absolute top-1 left-2 w-1.5 h-1.5 rounded-full blur-[1px] ${type === 1 ? 'bg-white/20' : 'bg-black/5'}`}></div>
  </motion.div>
));

// 静态网格背景，完全避免重绘
const BoardGrid = memo(({ theme, lineClass }: { theme: BoardTheme, lineClass: string }) => (
  <div 
    className="absolute inset-4 sm:inset-6 grid border border-black/5 z-10"
    style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
  >
    {Array.from({ length: 225 }).map((_, i) => (
      <div key={i} className="relative w-full h-full pointer-events-none">
        <div className={`absolute w-[1px] h-full ${lineClass} left-1/2 -translate-x-1/2`}></div>
        <div className={`absolute h-[1px] w-full ${lineClass} top-1/2 -translate-y-1/2`}></div>
      </div>
    ))}
  </div>
));

const GobangApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [gameState, setGameState] = useState<GameState>('SELECTION');
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [board, setBoard] = useState<Board>(Array(15).fill(null).map(() => Array(15).fill(0)));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1); 
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
  const [history, setHistory] = useState<Board[]>([]); 
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCoords, setShowCoords] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('classic');

  const [timers, setTimers] = useState({ p1: 300, p2: 300 });
  const timerRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playStoneSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }, [soundEnabled]);

  const startNewGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setBoard(Array(15).fill(null).map(() => Array(15).fill(0)));
    setHistory([]);
    setCurrentPlayer(1);
    setWinner(null);
    setLastMove(null);
    setHint(null);
    setTimers({ p1: 300, p2: 300 });
    setGameState('PLAYING');
  };

  const triggerAiMove = useCallback((currentBoard: Board) => {
    setIsAiThinking(true);
    const depth = difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 4;
    const thinkingDelay = 1000 + Math.random() * 1000; 

    setTimeout(() => {
      const [aiR, aiC] = getBestMove(currentBoard, depth);
      if (aiR !== -1) {
        const aiBoard = currentBoard.map(row => [...row]);
        aiBoard[aiR][aiC] = 2;
        setBoard(aiBoard);
        setLastMove([aiR, aiC]);
        playStoneSound();
        if (checkWin(aiBoard, aiR, aiC)) {
          setWinner(2);
          setTimeout(() => setGameState('SETTLEMENT'), 800);
        } else {
          setCurrentPlayer(1);
        }
      }
      setIsAiThinking(false);
    }, thinkingDelay);
  }, [difficulty, playStoneSound]);

  const handlePlaceStone = (r: number, c: number) => {
    if (winner || board[r][c] !== 0 || isAiThinking || currentPlayer !== 1) return;
    const boardBeforeMove = board.map(row => [...row]);
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = 1;
    setHistory(prev => [...prev, boardBeforeMove]);
    setBoard(newBoard);
    setLastMove([r, c]);
    setHint(null);
    playStoneSound();
    if (checkWin(newBoard, r, c)) {
      setWinner(1);
      setTimeout(() => setGameState('SETTLEMENT'), 800);
      return;
    }
    setCurrentPlayer(2);
    triggerAiMove(newBoard);
  };

  const undoMove = () => {
    if (history.length === 0 || isAiThinking || winner) return;
    const lastHistory = [...history];
    const previousState = lastHistory.pop();
    if (previousState) {
      setBoard(previousState);
      setHistory(lastHistory);
      setLastMove(null);
      setWinner(null);
      setCurrentPlayer(1);
      setHint(null);
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING' && !winner) {
      timerRef.current = setInterval(() => {
        setTimers(prev => {
          if (currentPlayer === 1) return { ...prev, p1: Math.max(0, prev.p1 - 1) };
          return { ...prev, p2: Math.max(0, prev.p2 - 1) };
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, currentPlayer, winner]);

  const themeConfig = {
    classic: { bg: 'bg-[#e3d5c6]', border: 'border-[#917b5e]', line: 'bg-[#a69b91]/50' },
    jade: { bg: 'bg-[#d1e5d9]', border: 'border-[#6b8e7b]', line: 'bg-[#8ba696]/40' },
    dark: { bg: 'bg-[#2c3e50]', border: 'border-[#1a252f]', line: 'bg-white/10' }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-morandi-oatmeal dark:bg-dark-bg flex flex-col items-center overflow-hidden">
      <header className="w-full flex items-center justify-between px-6 pt-12 pb-6 z-10 shrink-0 bg-morandi-oatmeal/80 dark:bg-dark-bg/80 backdrop-blur-md">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-white dark:bg-dark-card rounded-full shadow-sm text-slate-400 transition-all hover:scale-105 active:scale-95">
          <ChevronLeft size={24} />
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold tracking-tight text-morandi-charcoal dark:text-slate-100 serif-font italic">博弈禅 · 五子棋</h1>
          {gameState === 'PLAYING' && (
            <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-3 py-0.5 rounded-full mt-1 tracking-widest border border-primary/20">
              难度: {difficulty === 'EASY' ? '入门' : difficulty === 'MEDIUM' ? '中等' : '大师'}
            </span>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setShowSettings(true); }} 
          className="w-10 h-10 flex items-center justify-center bg-white dark:bg-dark-card rounded-full shadow-sm text-slate-300 transition-all hover:text-primary active:scale-90"
        >
          <Settings2 size={20} />
        </button>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 relative overflow-y-auto no-scrollbar">
         {gameState === 'SELECTION' && (
           <SelectionView onStart={startNewGame} />
         )}
         
         {gameState === 'PLAYING' && (
           <PlayingView 
             board={board}
             currentPlayer={currentPlayer}
             isAiThinking={isAiThinking}
             lastMove={lastMove}
             hint={hint}
             timers={timers}
             boardTheme={boardTheme}
             showCoords={showCoords}
             themeConfig={themeConfig}
             historyLength={history.length}
             onPlaceStone={handlePlaceStone}
             onUndo={undoMove}
             onGetHint={() => {
                if (isAiThinking || winner || currentPlayer !== 1) return;
                const [hintR, hintC] = getBestMove(board, 2);
                setHint([hintR, hintC]);
                setTimeout(() => setHint(null), 3000);
             }}
             onReset={() => setGameState('SELECTION')}
             winner={winner}
           />
         )}

         <AnimatePresence>
            {gameState === 'SETTLEMENT' && (
              <SettlementView 
                winner={winner} 
                difficulty={difficulty} 
                onRestart={() => startNewGame(difficulty)} 
                onHome={() => setGameState('SELECTION')} 
              />
            )}
         </AnimatePresence>
      </main>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowSettings(false)} className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]" />
            <SettingsDrawer 
              boardTheme={boardTheme} setBoardTheme={setBoardTheme}
              showCoords={showCoords} setShowCoords={setShowCoords}
              soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled}
              onClose={() => setShowSettings(false)}
            />
          </>
        )}
      </AnimatePresence>

      <style>{`
        .serif-font { font-family: 'Noto Serif SC', serif; }
        .shadow-stone { box-shadow: 1px 4px 6px rgba(0,0,0,0.35); }
        .bg-stone-black { background: radial-gradient(circle at 35% 35%, #555, #000); }
        .bg-stone-white { background: radial-gradient(circle at 35% 35%, #fff, #ddd); }
        .shadow-stone-black-inner { box-shadow: inset 2px 2px 4px rgba(255,255,255,0.15); }
        .shadow-stone-white-inner { box-shadow: inset -2px -2px 4px rgba(0,0,0,0.15); }
      `}</style>
    </div>
  );
};

// --- 子视图组件定义 ---

const SelectionView = memo(({ onStart }: { onStart: (d: Difficulty) => void }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md flex flex-col gap-6 px-4">
    <div className="text-center mb-4">
      <h2 className="text-4xl font-extrabold text-slate-800 dark:text-white mb-2 serif-font italic">博弈禅</h2>
      <p className="text-slate-500 font-medium">请选择您的挑战难度</p>
    </div>
    <div className="space-y-4">
      <DifficultyCard title="入门级" desc="适合新手学习规则" icon="spa" color="emerald" onClick={() => onStart('EASY')} />
      <DifficultyCard title="进阶级" desc="挑战自我对弈策略" icon="grid_on" color="orange" onClick={() => onStart('MEDIUM')} />
      <DifficultyCard title="大师级" desc="顶尖算力对决" icon="military_tech" color="purple" onClick={() => onStart('HARD')} />
    </div>
  </motion.div>
));

const PlayingView = memo(({ 
  board, currentPlayer, isAiThinking, lastMove, hint, timers, 
  boardTheme, showCoords, themeConfig, historyLength, 
  onPlaceStone, onUndo, onGetHint, onReset, winner 
}: any) => {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="w-full max-w-md flex flex-col items-center px-4">
      <div className="w-full flex justify-between gap-3 mb-6 shrink-0">
        <PlayerCard name="你" time={formatTime(timers.p1)} active={currentPlayer === 1} stone="black" round={historyLength + 1} />
        <PlayerCard name="AI对手" time={formatTime(timers.p2)} active={currentPlayer === 2} stone="white" status={isAiThinking ? "思考中..." : "等待中..."} />
      </div>

      <div className="w-full max-w-[400px] mb-12 shrink-0">
        <div className={`relative w-full ${themeConfig[boardTheme].bg} rounded-xl shadow-2xl border-[8px] ${themeConfig[boardTheme].border} overflow-hidden`} style={{ paddingBottom: '100%', height: 0 }}>
          {boardTheme === 'classic' && <div className="absolute inset-0 opacity-[0.15] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/wood-pattern-with-fine-lines.png')] z-0"></div>}
          
          <div className="absolute inset-0 p-4 sm:p-6 overflow-visible">
             {showCoords && (
                <div className="pointer-events-none">
                    <div className="absolute -bottom-8 left-4 right-4 flex justify-between text-[10px] font-bold text-slate-400 font-mono">
                       {Array.from({length: 15}).map((_, i) => <span key={i} className="w-full text-center">{String.fromCharCode(65+i)}</span>)}
                    </div>
                    <div className="absolute -left-8 top-4 bottom-4 flex flex-col justify-between text-[10px] font-bold text-slate-400 font-mono">
                       {Array.from({length: 15}).map((_, i) => <span key={i} className="h-full flex items-center">{15-i}</span>)}
                    </div>
                </div>
             )}

             <BoardGrid theme={boardTheme} lineClass={themeConfig[boardTheme].line} />

             <div 
               className="absolute inset-4 sm:inset-6 grid z-10"
               style={{ gridTemplateColumns: 'repeat(15, 1fr)', gridTemplateRows: 'repeat(15, 1fr)' }}
             >
                {board.map((row: any[], r: number) => row.map((cell: any, c: any) => {
                  const isLast = lastMove?.[0] === r && lastMove?.[1] === c;
                  return (
                    <div 
                      key={`${r}-${c}`} 
                      onClick={() => onPlaceStone(r, c)} 
                      className="relative w-full h-full flex items-center justify-center cursor-pointer group/cell"
                    >
                      {cell === 0 && !winner && !isAiThinking && (
                        <div className={`w-[85%] h-[85%] rounded-full opacity-0 group-hover/cell:opacity-20 transition-opacity z-10 ${currentPlayer === 1 ? 'bg-black' : 'bg-white'}`}></div>
                      )}
                      {hint && hint[0] === r && hint[1] === c && (
                        <div className="absolute w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping z-30"></div>
                      )}
                      {cell !== 0 && <Stone type={cell as Player} isLast={isLast} theme={boardTheme} />}
                    </div>
                  );
                }))}
             </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-xs bg-white dark:bg-dark-card rounded-[2rem] p-2 shadow-lg border border-morandi-border dark:border-white/5 flex items-center justify-between gap-1 shrink-0">
         <ActionButton icon={<Undo2 size={20}/>} label="悔棋" onClick={onUndo} disabled={historyLength === 0 || isAiThinking} />
         <div className="w-px h-10 bg-morandi-border dark:bg-white/5"></div>
         <ActionButton icon={<Lightbulb size={20}/>} label="提示" onClick={onGetHint} color="primary" disabled={isAiThinking || winner} />
         <div className="w-px h-10 bg-morandi-border dark:bg-white/5"></div>
         <ActionButton icon={<RotateCcw size={20}/>} label="重置" onClick={onReset} danger />
      </div>
    </div>
  );
});

const SettlementView = memo(({ winner, difficulty, onRestart, onHome }: any) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-[120] bg-morandi-charcoal/40 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
  >
    <motion.div 
      initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
      className="bg-white dark:bg-dark-bg w-full max-w-sm rounded-[3rem] p-10 shadow-2xl border border-morandi-border dark:border-white/5 text-center relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-2 bg-primary opacity-50"></div>
      <div className="mb-8 relative z-10">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Trophy size={40} className="text-amber-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white serif-font italic">棋局终了</h2>
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-lg font-black text-primary uppercase tracking-widest">
            {winner === 1 ? '旗开得胜' : winner === 2 ? '棋差一招' : '不分伯仲'}
          </p>
          <p className="text-xs text-slate-400 font-medium italic">
            {winner === 1 ? '你在这场博弈中展现了卓越的智慧。' : winner === 2 ? 'AI 算力惊人，再接再厉。' : '精彩的对局，双方势均力敌。'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 relative z-10">
        <button onClick={onRestart} className="w-full py-4 bg-morandi-charcoal dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl font-bold text-sm shadow-xl active:scale-95 transition-all hover:brightness-110">重整旗鼓</button>
        <button onClick={onHome} className="w-full py-4 bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 rounded-2xl font-bold text-sm border border-morandi-border dark:border-white/5 active:scale-95 transition-all">更换难度</button>
      </div>
    </motion.div>
  </motion.div>
));

const SettingsDrawer = memo(({ boardTheme, setBoardTheme, showCoords, setShowCoords, soundEnabled, setSoundEnabled, onClose }: any) => (
  <motion.div 
    initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
    className="fixed inset-y-0 right-0 w-72 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-xl z-[110] shadow-2xl border-l border-morandi-border dark:border-white/5 p-8 flex flex-col"
  >
    <div className="flex justify-between items-center mb-10">
       <h3 className="text-xl font-bold text-slate-800 dark:text-white serif-font italic">棋局设置</h3>
       <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full"><X size={20}/></button>
    </div>
    <div className="space-y-8 flex-1">
      <section>
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">棋盘主题</label>
        <div className="grid grid-cols-3 gap-3">
           <ThemeOption label="木纹" active={boardTheme === 'classic'} color="#e3d5c6" onClick={() => setBoardTheme('classic')} />
           <ThemeOption label="青瓷" active={boardTheme === 'jade'} color="#d1e5d9" onClick={() => setBoardTheme('jade')} />
           <ThemeOption label="墨黑" active={boardTheme === 'dark'} color="#2c3e50" onClick={() => setBoardTheme('dark')} />
        </div>
      </section>
      <section>
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">辅助功能</label>
        <div className="space-y-3">
           <ToggleItem icon={showCoords ? <Eye size={18}/> : <EyeOff size={18}/>} label="显示坐标系" checked={showCoords} onClick={() => setShowCoords(!showCoords)} />
           <ToggleItem icon={soundEnabled ? <Volume2 size={18}/> : <VolumeX size={18}/>} label="对弈音效" checked={soundEnabled} onClick={() => setSoundEnabled(!soundEnabled)} />
        </div>
      </section>
    </div>
    <button onClick={onClose} className="w-full py-4 bg-slate-900 dark:bg-slate-200 text-white dark:text-dark-bg rounded-2xl font-bold text-sm shadow-xl">关闭设置</button>
  </motion.div>
));

const ThemeOption = memo(({ label, active, color, onClick }: any) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`w-full aspect-square rounded-xl border-2 transition-all ${active ? 'border-primary ring-4 ring-primary/10' : 'border-slate-100 dark:border-white/5'}`} style={{ backgroundColor: color }} />
    <span className={`text-[10px] font-bold ${active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{label}</span>
  </button>
));

const ToggleItem = memo(({ icon, label, checked, onClick }: any) => (
  <button onClick={onClick} className="w-full p-4 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-between group transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
    <div className="flex items-center gap-3">
      <span className="text-slate-400 group-hover:text-primary transition-colors">{icon}</span>
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>
    </div>
    <div className={`w-10 h-5 rounded-full relative transition-colors ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </div>
  </button>
));

const DifficultyCard = memo(({ title, desc, icon, color, onClick }: any) => (
  <button onClick={onClick} className="w-full p-6 bg-white dark:bg-dark-card border border-morandi-border dark:border-white/5 rounded-3xl flex items-center gap-6 transition-all shadow-sm hover:scale-[1.02] active:scale-95 group">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-${color}-50 text-${color}-500 group-hover:bg-morandi-charcoal dark:group-hover:bg-slate-200 group-hover:text-white dark:group-hover:text-dark-bg transition-colors`}>
      <span className="material-icons-outlined text-2xl">{icon}</span>
    </div>
    <div className="text-left flex-1">
      <h4 className="text-lg font-bold text-slate-800 dark:text-white serif-font">{title}</h4>
      <p className="text-xs text-slate-400 font-medium italic">{desc}</p>
    </div>
    <ChevronRight size={18} className="text-morandi-border" />
  </button>
));

const PlayerCard = memo(({ name, time, active, stone, round, status }: any) => (
  <div className={`flex-1 p-5 rounded-[2.2rem] border-2 transition-all ${active ? `bg-white dark:bg-dark-card border-morandi-charcoal dark:border-slate-300 shadow-md scale-105` : `bg-white/50 dark:bg-dark-card/50 border-transparent opacity-50`}`}>
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-3 h-3 rounded-full ${stone === 'black' ? 'bg-black' : 'bg-white border border-slate-200'} shadow-sm`}></div>
      <span className={`text-[10px] font-black uppercase tracking-widest ${active ? 'text-morandi-charcoal dark:text-slate-100' : 'text-slate-500'}`}>{name}</span>
    </div>
    <div className={`text-2xl font-mono font-medium tracking-tighter ${active ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{time}</div>
    <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter italic">{status || `步数: ${round}`}</div>
  </div>
));

const ActionButton = memo(({ icon, label, onClick, disabled, color, danger }: any) => (
  <button onClick={onClick} disabled={disabled} className={`flex-1 flex flex-col items-center gap-1.5 py-4 rounded-2xl transition-all ${disabled ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:bg-morandi-oatmeal dark:hover:bg-white/5 active:scale-90'} ${danger ? 'text-rose-500' : (color === 'primary' ? 'text-primary' : 'text-slate-400')}`}>
    {icon}
    <span className="text-[9px] font-black tracking-[0.2em] uppercase">{label}</span>
  </button>
));

export default GobangApp;
