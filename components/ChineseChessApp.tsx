
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Undo2, Lightbulb, Trophy, Layout, Settings2, RefreshCw, Power, Swords, Volume2, VolumeX } from 'lucide-react';
import { INITIAL_BOARD, ChessBoard, isLegalMove, isFacingKing, ChessColor, Piece } from '../lib/chessRules';
import { getBestMove } from '../lib/chessAI';

type GameMode = 'PvP' | 'PvE' | 'Sandbox';
type Difficulty = '入门' | '专业' | '大师';

const ChineseChessApp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [board, setBoard] = useState<ChessBoard>(INITIAL_BOARD);
  const [playerColor, setPlayerColor] = useState<ChessColor>('red');
  const [turn, setTurn] = useState<ChessColor>('red'); 
  const [selected, setSelected] = useState<number | null>(null);
  const [lastMove, setLastMove] = useState<[number, number] | null>(null);
  const [mode, setMode] = useState<GameMode>('PvE');
  const [difficulty, setDifficulty] = useState<Difficulty>('专业');
  const [historyStates, setHistoryStates] = useState<{ board: ChessBoard, turn: ChessColor, lastMove: [number, number] | null }[]>([]);
  const [gameOver, setGameOver] = useState<ChessColor | 'draw' | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const audioCtx = useRef<AudioContext | null>(null);

  const playSound = useCallback((type: 'move' | 'capture' | 'win' | 'loss') => {
    if (!soundEnabled) return;
    if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtx.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    if (type === 'move') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else if (type === 'capture') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    } else {
      osc.frequency.setValueAtTime(type === 'win' ? 440 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
    }
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  }, [soundEnabled]);

  const resetGame = useCallback((targetPlayerColor?: ChessColor) => {
    const color = targetPlayerColor || playerColor;
    setBoard(INITIAL_BOARD);
    setTurn(color === 'black' ? 'black' : 'red'); 
    setSelected(null);
    setLastMove(null);
    setHistoryStates([]);
    setGameOver(null);
    setHint(null);
    setIsAiThinking(false);
    setShowSettings(false);
  }, [playerColor]);

  useEffect(() => {
    if (mode === 'PvE' && turn !== playerColor && !gameOver && !isAiThinking) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        try {
          const depth = difficulty === '入门' ? 1 : difficulty === '专业' ? 3 : 4;
          const [from, to] = getBestMove(board, turn, depth);
          if (from !== -1) executeMove(from, to);
        } catch (e) {
          console.error("AI 决策中断:", e);
        } finally {
          setIsAiThinking(false);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [turn, mode, board, gameOver, difficulty, playerColor]);

  const executeMove = useCallback((from: number, to: number) => {
    const piece = board[from];
    if (!piece) return;
    if (board[to]) playSound('capture'); else playSound('move');

    const newBoard = [...board];
    newBoard[to] = newBoard[from];
    newBoard[from] = null;

    if (mode !== 'Sandbox' && isFacingKing(newBoard)) {
      alert("注意：不能形成将帅照面！");
      return;
    }

    setHistoryStates(prev => [...prev, { board: [...board], turn, lastMove }]);
    setBoard(newBoard);
    setLastMove([from, to]);
    setTurn(turn === 'red' ? 'black' : 'red');
    setSelected(null);
    setHint(null);

    const hasRedKing = newBoard.some(p => p?.type === 'king' && p.color === 'red');
    const hasBlackKing = newBoard.some(p => p?.type === 'king' && p.color === 'black');
    if (!hasRedKing) setGameOver('black');
    if (!hasBlackKing) setGameOver('red');
  }, [board, turn, mode, playSound, lastMove]);

  const handleCellClick = (idx: number) => {
    if (gameOver || isAiThinking) return;
    if (selected === null) {
      if (board[idx] && (mode === 'Sandbox' || board[idx]?.color === turn)) {
        setSelected(idx);
      }
    } else {
      if (board[idx]?.color === board[selected]?.color) {
        setSelected(idx);
      } else if (mode === 'Sandbox' || isLegalMove(board, selected, idx)) {
        executeMove(selected, idx);
      } else {
        setSelected(null);
      }
    }
  };

  const undoMove = useCallback(() => {
    if (historyStates.length === 0 || isAiThinking || gameOver) return;
    const lastState = historyStates[historyStates.length - 1];
    setBoard(lastState.board);
    setTurn(lastState.turn);
    setLastMove(lastState.lastMove);
    setHistoryStates(prev => prev.slice(0, -1));
    setGameOver(null);
    setHint(null);
    setSelected(null);
  }, [historyStates, isAiThinking, gameOver]);

  const getDisplayCoords = (index: number) => {
    let x = index % 9;
    let y = Math.floor(index / 9);
    if (playerColor === 'black') {
      x = 8 - x;
      y = 9 - y;
    }
    return { x, y };
  };

  const getPieceLabel = (p: Piece) => {
    const labels: Record<string, string[]> = {
      king: ['帅', '将'], advisor: ['仕', '士'], elephant: ['相', '象'],
      horse: ['马', '馬'], rook: ['车', '車'], cannon: ['炮', '砲'], soldier: ['兵', '卒']
    };
    return p.color === 'red' ? labels[p.type][0] : labels[p.type][1];
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#1a1c18] flex flex-col font-sans overflow-hidden select-none">
      <div className="absolute inset-0 z-0 opacity-15">
        <img src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1600" className="w-full h-full object-cover blur-[4px]" alt="BG" />
      </div>

      <header className="relative z-20 flex justify-between items-center px-6 pt-10 sm:pt-12 shrink-0">
        <div className={`flex flex-col gap-0.5 transition-all ${turn === 'black' ? 'opacity-100 scale-105' : 'opacity-20 scale-90'}`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${playerColor === 'black' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">黑方</span>
          </div>
          <span className="text-sm sm:text-lg font-black text-white italic">
            {mode === 'PvE' ? (playerColor === 'black' ? '我方' : 'AI 大师') : '乙落子'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5">
          <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
            <Swords size={12} className="text-emerald-500" />
            <span className="text-white/60 text-[8px] sm:text-[9px] font-black tracking-[0.2em] uppercase">
              {mode === 'Sandbox' ? '沙盘模拟' : '对弈中'}
            </span>
          </div>
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="text-white/20 hover:text-white transition-colors">
             {soundEnabled ? <Volume2 size={14}/> : <VolumeX size={14}/>}
          </button>
        </div>

        <div className={`flex flex-col items-end gap-0.5 transition-all ${turn === 'red' ? 'opacity-100 scale-105' : 'opacity-20 scale-90'}`}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">红方</span>
            <div className={`w-2 h-2 rounded-full ${playerColor === 'red' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'}`}></div>
          </div>
          <span className="text-sm sm:text-lg font-black text-white italic">
            {mode === 'PvE' ? (playerColor === 'red' ? '我方' : 'AI 大师') : '甲落子'}
          </span>
        </div>

        <button onClick={onClose} className="fixed top-4 right-4 p-2.5 bg-black/40 hover:bg-rose-500/30 text-white/50 border border-white/10 rounded-full transition-all z-[70] backdrop-blur-md">
          <Power size={18} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 z-10 min-h-0">
        <div className="relative w-full max-w-[440px] max-h-[min(65vh,520px)] aspect-[9/10] bg-[#d6ccbc] rounded-sm shadow-[0_30px_80px_rgba(0,0,0,0.8)] border-[6px] sm:border-[10px] border-[#917b5e]">
           <div className="absolute inset-[5%] border border-[#5d4037]/30">
             <svg className="w-full h-full stroke-[#5d4037]/40 fill-none" viewBox="0 0 8 9">
                {Array.from({ length: 10 }).map((_, i) => (<line key={`h${i}`} x1="0" y1={i} x2="8" y2={i} strokeWidth="0.04" />))}
                {Array.from({ length: 9 }).map((_, i) => (
                  <React.Fragment key={`v${i}`}>
                    <line x1={i} y1="0" x2={i} y2="4" strokeWidth="0.04" />
                    <line x1={i} y1="5" x2={i} y2="9" strokeWidth="0.04" />
                    {(i===0||i===8) && <line x1={i} y1="4" x2={i} y2="5" strokeWidth="0.04" />}
                  </React.Fragment>
                ))}
                <line x1="3" y1="0" x2="5" y2="2" strokeWidth="0.04" /><line x1="5" y1="0" x2="3" y2="2" strokeWidth="0.04" />
                <line x1="3" y1="7" x2="5" y2="9" strokeWidth="0.04" /><line x1="5" y1="7" x2="3" y2="9" strokeWidth="0.04" />
             </svg>
             <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-around text-[#5d4037]/15 font-black text-2xl sm:text-4xl tracking-[1em] pointer-events-none italic">
                <span>楚河</span><span>汉界</span>
             </div>

             <div className="absolute inset-0">
                {Array.from({ length: 90 }).map((_, i) => {
                  const piece = board[i];
                  const { x, y } = getDisplayCoords(i);
                  const isSelected = selected === i;
                  const isPossible = selected !== null && (mode === 'Sandbox' || isLegalMove(board, selected, i));
                  const isLast = lastMove?.includes(i);
                  const isHint = hint?.includes(i);
                  
                  return (
                    <div 
                      key={i} 
                      onClick={() => handleCellClick(i)} 
                      className="absolute w-[11.11%] h-[10%] flex items-center justify-center cursor-pointer"
                      style={{ 
                        left: `${(x / 8) * 100}%`, 
                        top: `${(y / 9) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isSelected ? 50 : (piece ? 20 : 10)
                      }}
                    >
                      {isPossible && !piece && <div className="w-1.5 h-1.5 rounded-full bg-black/10 animate-pulse" />}
                      {isHint && <div className="absolute inset-[-15%] border-[2px] border-emerald-500 rounded-full animate-ping" />}
                      
                      {piece && (
                        <div className={`
                          w-[84%] h-[84%] rounded-full flex items-center justify-center transition-all duration-300 transform piece-skeuo
                          ${isSelected ? '-translate-y-2 scale-110 shadow-[0_20px_40px_rgba(0,0,0,0.6)]' : ''} 
                          ${isLast ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent' : ''}
                        `}
                        style={{
                          background: piece.color === 'red' 
                            ? 'radial-gradient(circle at 35% 35%, #fff9f0 0%, #f7e8d3 40%, #e3c39d 70%, #917b5e 100%)'
                            : 'radial-gradient(circle at 35% 35%, #f7f7f7 0%, #e5e5e5 40%, #d1d1d1 70%, #888888 100%)',
                        }}>
                           <div className="w-[88%] h-[88%] rounded-full flex items-center justify-center border border-black/5 shadow-inner">
                             <span className={`
                               text-[min(4.5vw,22px)] sm:text-2xl font-black select-none leading-none character-carved
                               ${piece.color === 'red' ? 'text-[#991b1b]' : 'text-[#1a1a1a]'}
                             `} style={{ fontFamily: 'serif' }}>
                               {getPieceLabel(piece)}
                             </span>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>

             {gameOver && (
               <div className="absolute inset-0 bg-black/90 backdrop-blur-lg z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in">
                  <Trophy className="text-yellow-500 w-12 h-12 mb-4 animate-bounce" />
                  <h2 className="text-xl font-black text-white italic mb-1 uppercase">战局终了</h2>
                  <p className="text-emerald-500 font-bold tracking-[0.3em] mb-8 text-xs">
                    {gameOver === 'red' ? '红方胜利 · 汉军大捷' : '黑方胜利 · 楚军克敌'}
                  </p>
                  <button onClick={() => resetGame()} className="px-8 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-xl active:scale-95 transition-all text-[10px] uppercase tracking-widest">
                    再启新局
                  </button>
               </div>
             )}
           </div>
        </div>
      </main>

      <footer className="relative z-20 flex flex-col items-center pb-8 sm:pb-12 shrink-0 px-4">
        <div className="flex items-center justify-center gap-4 sm:gap-8 w-full mb-6">
           <ActionButton icon={<Layout size={18}/>} label="沙盘" active={mode === 'Sandbox'} onClick={() => setMode(mode === 'Sandbox' ? 'PvE' : 'Sandbox')} />
           <ActionButton icon={<Undo2 size={18}/>} label="悔棋" onClick={undoMove} />
           <ActionButton icon={<Lightbulb size={18}/>} label="支招" onClick={() => {
             const best = getBestMove(board, turn, 3);
             if (best[0] !== -1) { setHint([best[0], best[1]]); setTimeout(() => setHint(null), 3000); }
           }} />
           <ActionButton icon={<RefreshCw size={18}/>} label="重来" onClick={() => resetGame()} />
           <ActionButton icon={<Settings2 size={18}/>} label="模式" onClick={() => setShowSettings(true)} />
        </div>

        <div className="px-5 py-1.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/5 flex items-center gap-2 mb-[env(safe-area-inset-bottom)]">
           <div className={`w-1 h-1 rounded-full ${isAiThinking ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500 shadow-[0_0_5px_#10b981]'}`}></div>
           <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.1em]">
             {isAiThinking ? 'AI 大师正在布阵...' : `${mode === 'PvE' ? '人机对战' : '沙盘模拟'} / ${difficulty} 难度`}
           </span>
        </div>
      </footer>

      {showSettings && (
        <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#1e231a] border border-white/10 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5"><Swords size={120}/></div>
             <h3 className="text-lg font-black text-white italic mb-8 flex items-center gap-3">
                <Settings2 size={18} className="text-emerald-500" /> 对弈设置
             </h3>
             <div className="space-y-8 relative z-10">
                <section>
                   <p className="text-[9px] text-white/30 font-black uppercase mb-3 tracking-widest">阵营选择 (选黑则先行)</p>
                   <div className="grid grid-cols-2 gap-2.5">
                      <button 
                        onClick={() => { setPlayerColor('red'); resetGame('red'); }}
                        className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${playerColor === 'red' ? 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-white/5 border-white/5 text-white/20'}`}
                      >红方</button>
                      <button 
                        onClick={() => { setPlayerColor('black'); resetGame('black'); }}
                        className={`py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${playerColor === 'black' ? 'bg-slate-700 border-slate-500 text-white shadow-[0_0_15px_rgba(100,116,139,0.3)]' : 'bg-white/5 border-white/5 text-white/20'}`}
                      >黑方 (先)</button>
                   </div>
                </section>

                <section>
                   <p className="text-[9px] text-white/30 font-black uppercase mb-3 tracking-widest">对战模式</p>
                   <div className="grid grid-cols-2 gap-2.5">
                      <ModeItem label="人机" active={mode === 'PvE'} onClick={() => setMode('PvE')} />
                      <ModeItem label="双人" active={mode === 'PvP'} onClick={() => setMode('PvP')} />
                   </div>
                </section>
                {mode === 'PvE' && (
                  <section>
                    <p className="text-[9px] text-white/30 font-black uppercase mb-3 tracking-widest">AI 算力强度</p>
                    <div className="grid grid-cols-3 gap-2">
                       {(['入门', '专业', '大师'] as Difficulty[]).map(d => (
                         <button key={d} onClick={() => { setDifficulty(d); resetGame(); }} className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${difficulty === d ? 'bg-emerald-600 text-white' : 'bg-white/5 text-white/30 hover:text-white'}`}>
                           {d}
                         </button>
                       ))}
                    </div>
                  </section>
                )}
             </div>
             <button onClick={() => setShowSettings(false)} className="w-full mt-10 py-4 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all">
                进入战场
             </button>
          </div>
        </div>
      )}
      <style>{`
        /* 棋子拟物化效果 CSS */
        .piece-skeuo {
          box-shadow: 
            0 2px 0 #917457,
            0 5px 0 #7b6149,
            0 8px 15px rgba(0,0,0,0.5),
            inset 2px 2px 2px rgba(255,255,255,0.4),
            inset -2px -2px 3px rgba(0,0,0,0.1);
        }

        /* 模拟刻字漆艺效果 */
        .character-carved {
          text-shadow: 
            0.5px 0.5px 0px rgba(255,255,255,0.2),
            -0.5px -0.5px 0.5px rgba(0,0,0,0.3);
          filter: contrast(1.2);
        }

        /* 悬停与选中动画增强 */
        .piece-skeuo:hover {
          filter: brightness(1.05);
        }
      `}</style>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, active }: { icon: React.ReactNode, label: string, onClick: () => void, active?: boolean }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 group outline-none">
    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center transition-all border shadow-lg ${active ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-black/40 border-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white'}`}>
      {icon}
    </div>
    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'text-emerald-500' : 'text-white/20 group-hover:text-white/40'}`}>{label}</span>
  </button>
);

const ModeItem = ({ label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center justify-center py-3.5 rounded-2xl font-black text-xs transition-all border ${active ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-white/5 border-white/5 text-white/30'}`}>
    {label}
  </button>
);

export default ChineseChessApp;
