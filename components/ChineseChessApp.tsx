import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, BookOpen, Check, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Download, Flag, Lightbulb, Loader2, RotateCcw, Swords, Undo2, Upload, Volume2, VolumeX } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import ExplorerDialog from './ExplorerDialog';
import { downloadModuleFile, useModuleState } from '../lib/moduleSession';
import { Chess, XIANGQI_STORAGE, XIANGQI_PUZZLES, XQ_PIECES, createXiangqiSession, moveXiangqi, restoreXiangqi, validXiangqiSession, xiangqiResult, type Color, type Move, type PieceSymbol, type Square, type XiangqiSession } from '../lib/xiangqi';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './xiangqi.css';

const sideName = (side: Color) => side === 'w' ? '红方' : '黑方';
const pieceName = (type: PieceSymbol, side: Color) => side === 'w' ? XQ_PIECES[type].red : XQ_PIECES[type].black;
const piecePath = (type: PieceSymbol, side: Color) => `/images/pieces/xiangqi-${side === 'w' ? 'red' : 'black'}-${XQ_PIECES[type].asset}.svg`;
const clockText = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
interface Training { solved: string[]; attempts: Record<string, number> }
const validTraining = (v: unknown): v is Training => Boolean(v && typeof v === 'object' && Array.isArray((v as Training).solved) && (v as Training).solved.every((id) => XIANGQI_PUZZLES.some((p) => p.id === id)) && (v as Training).attempts && typeof (v as Training).attempts === 'object');

export default function ChineseChessApp({ onDiscover }: { onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }) {
  const [session, setSession, canSave] = useModuleState<XiangqiSession>(XIANGQI_STORAGE, createXiangqiSession, validXiangqiSession);
  const [training, setTraining] = useModuleState<Training>('exbeam.xiangqi.training.v1', { solved: [], attempts: {} }, validTraining);
  const [sound, setSound] = useModuleState('exbeam.xiangqi.sound.v1', false);
  const [tab, setTab] = useState<'match' | 'training' | 'pieces'>('match');
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleMove, setPuzzleMove] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(session.human === 'b');
  const [replay, setReplay] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<'new' | 'import' | 'resign' | null>(null);
  const [draftMode, setDraftMode] = useState(session.mode);
  const [draftSide, setDraftSide] = useState(session.human);
  const [draftLevel, setDraftLevel] = useState(session.level);
  const [draftClock, setDraftClock] = useState(session.clock);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const boardRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const sessionRef = useRef(session);
  const audioRef = useRef<AudioContext | null>(null);
  sessionRef.current = session;
  const puzzle = XIANGQI_PUZZLES[puzzleIndex];
  const game = useMemo(() => restoreXiangqi(session), [session.initialFen, session.moves]);
  const result = xiangqiResult(session, game);
  const history = useMemo(() => game.history({ verbose: true }) as Move[], [game]);
  const viewGame = useMemo(() => {
    if (tab === 'training') { const g = new Chess(puzzle.fen); if (puzzleMove) g.move(puzzleMove); return g; }
    return replay === null ? game : restoreXiangqi(session, replay);
  }, [tab, puzzle.fen, puzzleMove, replay, game, session.initialFen, session.moves]);
  const legal = useMemo(() => selected ? (viewGame.moves({ square: selected, verbose: true }) as Move[]).map((m) => m.to) : [], [viewGame, selected]);
  const last = tab === 'training' ? puzzleMove : history[(replay ?? history.length) - 1]?.lan;
  const frozen = tab === 'pieces' || (tab === 'match' && (replay !== null || !!result || busy || (session.mode === 'computer' && game.turn() !== session.human))) || (tab === 'training' && !!puzzleMove);
  const cancelSearch = useCallback(() => { workerRef.current?.terminate(); workerRef.current = null; setBusy(false); }, []);
  const playSound = useCallback(() => {
    if (!sound) return;
    try { const c = audioRef.current ||= new AudioContext(); void c.resume(); const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(380, c.currentTime); o.frequency.exponentialRampToValueAtTime(170, c.currentTime + .09); g.gain.setValueAtTime(.07, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .12); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .13); } catch { /* Audio must not block a move. */ }
  }, [sound]);
  useEffect(() => () => { workerRef.current?.terminate(); void audioRef.current?.close(); }, []);
  useEffect(() => { setSelected(null); setHint(null); }, [tab, puzzleIndex, replay]);
  useEffect(() => {
    if (tab !== 'match' || session.mode !== 'computer' || game.turn() === session.human || result || replay !== null) return;
    const expected = game.fen();
    let worker: Worker;
    try { worker = new Worker(new URL('../lib/xiangqi.worker.ts', import.meta.url), { type: 'module' }); } catch { setNotice('本地电脑对手不可用，可切换为双人对弈。'); return; }
    workerRef.current = worker; setBusy(true);
    worker.onmessage = (event: MessageEvent<{ move: string | null }>) => {
      if (workerRef.current !== worker) return;
      worker.terminate(); workerRef.current = null; setBusy(false);
      if (!event.data.move) { setNotice('电脑未找到着法，请悔棋或重新开局。'); return; }
      setSession((current) => restoreXiangqi(current).fen() !== expected || xiangqiResult(current) ? current : moveXiangqi(current, event.data.move!.slice(0, 2) as Square, event.data.move!.slice(2, 4) as Square));
      playSound();
    };
    worker.onerror = () => { worker.terminate(); workerRef.current = null; setBusy(false); setNotice('电脑计算中断，可悔棋或切换双人模式。'); };
    worker.postMessage({ fen: expected, level: session.level });
    return () => { worker.terminate(); if (workerRef.current === worker) { workerRef.current = null; setBusy(false); } };
  }, [game, session.mode, session.human, session.level, tab, replay, result?.reason, result?.winner, playSound]);
  useEffect(() => {
    if (tab !== 'match' || result || replay !== null || !session.clock || !session.moves.length) return;
    let previous = performance.now();
    const tick = window.setInterval(() => {
      const now = performance.now(), elapsed = document.hidden ? 0 : Math.min(2, Math.floor((now - previous) / 1000));
      if (!elapsed) { if (document.hidden) previous = now; return; }
      previous += elapsed * 1000;
      setSession((current) => { if (xiangqiResult(current)) return current; const turn = restoreXiangqi(current).turn(); return { ...current, clocks: { ...current.clocks, [turn]: Math.max(0, current.clocks[turn] - elapsed) } }; });
    }, 250);
    return () => clearInterval(tick);
  }, [tab, replay, session.clock, session.id, !!session.moves.length, result?.reason]);
  useEffect(() => {
    if (!result || session.counted) return;
    setSession((s) => ({ ...s, counted: true }));
    onDiscover?.({ key: `xiangqi-match-${session.id}`, kind: 'challenge', title: `象棋对局 · ${result.winner === 'draw' ? '和棋' : `${sideName(result.winner)}胜`}`, detail: `${result.reason} · ${session.moves.length} 手 · ${session.mode === 'local' ? '本地双人' : '本地电脑对弈'}` });
  }, [result?.winner, result?.reason, session.counted, session.id, onDiscover]);
  const selectSquare = (square: Square) => {
    if (frozen) return;
    const piece = viewGame.get(square);
    if (selected && legal.includes(square)) {
      const lan = selected + square;
      if (tab === 'training') {
        setTraining((c) => ({ ...c, attempts: { ...c.attempts, [puzzle.id]: Math.max(0, Number(c.attempts[puzzle.id]) || 0) + 1 } }));
        if (!puzzle.solutions.includes(lan)) { setNotice('这一步合法，但还没有达到本题目标。再观察一下。'); setSelected(null); return; }
        setPuzzleMove(lan); setNotice(puzzle.explanation);
        if (!revealed) { setTraining((c) => ({ ...c, solved: [...new Set([...c.solved, puzzle.id])] })); onDiscover?.({ key: `xiangqi-puzzle-${puzzle.id}`, kind: 'challenge', title: `象棋训练 · ${puzzle.title}`, detail: puzzle.explanation }); }
      } else { try { setSession((c) => moveXiangqi(c, selected, square)); } catch { setNotice('这一步不能保护本方将帅，请重新选择。'); } }
      setSelected(null); setHint(null); playSound();
    } else if (piece?.color === viewGame.turn()) { setSelected(square); setHint(null); setNotice(''); } else setSelected(null);
  };
  const undo = () => {
    cancelSearch(); setSession((c) => { const count = c.mode === 'computer' && restoreXiangqi(c).turn() === c.human ? 2 : 1; return { ...c, moves: c.moves.slice(0, Math.max(0, c.moves.length - count)), resigned: null, counted: false }; });
    setSelected(null); setReplay(null); setHint(null); setNotice('已回退着法；用时不返还。');
  };
  const askHint = () => {
    if (tab === 'training') { setRevealed(true); setHint(puzzle.solutions[0]); setSelected(puzzle.solutions[0].slice(0, 2) as Square); setNotice('提示已显示，本次练习不计入独立完成。'); return; }
    if (busy || result || replay !== null) return;
    cancelSearch(); const expected = game.fen();
    let worker: Worker;
    try { worker = new Worker(new URL('../lib/xiangqi.worker.ts', import.meta.url), { type: 'module' }); } catch { setNotice('暂时无法计算提示。'); return; }
    workerRef.current = worker; setBusy(true);
    worker.onmessage = (event: MessageEvent<{ move: string | null }>) => {
      if (workerRef.current !== worker) return;
      worker.terminate(); workerRef.current = null; setBusy(false);
      if (restoreXiangqi(sessionRef.current).fen() !== expected || !event.data.move) return;
      setHint(event.data.move); setSelected(event.data.move.slice(0, 2) as Square);
      const g = new Chess(expected), move = g.move(event.data.move); setNotice(`本地分析建议：${move.zh}。这不是专业棋力评估。`);
    };
    worker.onerror = () => { cancelSearch(); setNotice('暂时无法计算提示。'); }; worker.postMessage({ fen: expected, level: 2 });
  };
  const newMatch = () => { cancelSearch(); setSession(createXiangqiSession({ mode: draftMode, human: draftSide, level: draftLevel, clock: draftClock, clocks: { w: draftClock, b: draftClock } })); setFlipped(draftSide === 'b'); setSelected(null); setReplay(null); setHint(null); setTab('match'); setDialog(null); setNotice(''); };
  const importMatch = () => {
    try {
      if (!importText.trim() || importText.length > 100000) throw new Error('请粘贴有效 FEN 或棋谱（不超过 100 KB）。');
      let loaded: XiangqiSession;
      if (importText.trim().startsWith('{')) { const parsed = JSON.parse(importText); if (!validXiangqiSession(parsed)) throw new Error('存档格式或走法不合法。'); loaded = { ...parsed, id: createXiangqiSession().id }; }
      else { const g = new Chess(); if (/^[rnbakcpRNBAKCP1-9/]+\s[wb]\s/.test(importText.trim())) g.load(importText.trim()); else g.loadPgn(importText.trim()); const moves = g.history({ verbose: true }) as Move[]; loaded = createXiangqiSession({ mode: 'local', initialFen: moves[0]?.before || g.fen(), moves: moves.map((m) => m.lan), clock: 0, clocks: { w: 0, b: 0 } }); }
      cancelSearch(); setSession(loaded); setReplay(null); setTab('match'); setSelected(null); setDialog(null); setNotice('棋谱已载入。');
    } catch (e) { setImportError(e instanceof Error ? e.message : '无法读取这份棋谱。'); }
  };
  const loadPuzzle = (index: number) => { cancelSearch(); setPuzzleIndex(index); setPuzzleMove(null); setRevealed(false); setSelected(null); setHint(null); setNotice(''); setTab('training'); };
  const currentStatus = tab === 'training' ? puzzleMove ? '目标达成' : puzzle.task : replay !== null ? `复盘 · 第 ${replay} 手` : result ? result.winner === 'draw' ? `和棋 · ${result.reason}` : `${sideName(result.winner)}获胜 · ${result.reason}` : busy ? '本地棋手正在思考' : `${sideName(viewGame.turn())}走棋${viewGame.isCheck() ? ' · 被将军' : ''}`;
  const shownLast = last ? [last.slice(0, 2), last.slice(2, 4)] : [];
  const player = (side: Color) => <div className={`xq-player ${viewGame.turn() === side ? 'is-active' : ''}`}><img src={piecePath('k', side)} alt="" width={38} height={38} /><div><strong>{sideName(side)}</strong><span>{tab === 'training' ? '训练局面' : session.mode === 'computer' ? session.human === side ? '你' : `本地棋手 · ${['初识', '进阶', '挑战'][session.level - 1]}` : '本地棋手'}</span></div><time>{session.clock ? clockText(session.clocks[side]) : '不限时'}</time></div>;
  return <Workbench title="楚河汉界" eyebrow="EXBEAM / STRATEGY 05" className="xiangqi-workbench" toolbar={<>
    <IconButton label="新对局" onClick={() => { setDraftMode(session.mode); setDraftSide(session.human); setDraftLevel(session.level); setDraftClock(session.clock); setDialog('new'); }}><RotateCcw size={17} /></IconButton>
    <IconButton label="翻转棋盘" onClick={() => setFlipped(!flipped)}><ArrowLeftRight size={17} /></IconButton>
    <IconButton label={sound ? '关闭落子音效' : '开启落子音效'} aria-pressed={sound} onClick={() => setSound(!sound)}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}</IconButton>
    <IconButton label="导入棋谱" onClick={() => { setImportText(''); setImportError(''); setDialog('import'); }}><Upload size={17} /></IconButton>
    <IconButton label="导出对局存档" onClick={() => downloadModuleFile('exbeam-xiangqi.json', JSON.stringify(session, null, 2))}><Download size={17} /></IconButton>
  </>} status={<><span>{canSave ? '本机自动存档' : '无法保存，请先导出存档'}</span><span>标准走法 · 困毙判负 · 长将与重复按规则引擎判定</span></>}>
    <nav className="wb-tabs" aria-label="象棋工作区"><button role="tab" aria-selected={tab === 'match'} onClick={() => { cancelSearch(); setTab('match'); }}>对局</button><button role="tab" aria-selected={tab === 'training'} onClick={() => loadPuzzle(puzzleIndex)}>训练 · {training.solved.length}/{XIANGQI_PUZZLES.length}</button><button role="tab" aria-selected={tab === 'pieces'} onClick={() => { cancelSearch(); setTab('pieces'); }}>棋子图鉴</button></nav>
    {tab === 'pieces' ? <div className="xq-piece-library">{Object.entries(XQ_PIECES).map(([type, e]) => <article key={type} className="xq-piece-entry"><div>{(['w', 'b'] as Color[]).map((c) => <img key={c} src={piecePath(type as PieceSymbol, c)} alt={`${sideName(c)}${pieceName(type as PieceSymbol, c)}`} width={82} height={82} />)}</div><h3>{e.name}</h3><p>{e.rule}</p></article>)}<p className="wb-notice">棋子只在交叉点上落子。合法着法会同时检查蹩马腿、塞象眼、九宫、河界和本方将帅安全。</p></div> : <div className="xq-layout"><div className="xq-arena">{player(flipped ? 'w' : 'b')}
      <div className="xq-board" ref={boardRef} role="grid" aria-label="中国象棋棋盘"><div className="xq-lines"><svg viewBox="0 0 8 9" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".018">{Array.from({ length: 10 }, (_, i) => <line key={`h${i}`} x1="0" x2="8" y1={i} y2={i} />)}{Array.from({ length: 9 }, (_, i) => <React.Fragment key={`v${i}`}><line x1={i} x2={i} y1="0" y2="4" /><line x1={i} x2={i} y1="5" y2="9" />{(i === 0 || i === 8) && <line x1={i} x2={i} y1="4" y2="5" />}</React.Fragment>)}<path d="M3 0l2 2m0-2L3 2m0 5l2 2m0-2L3 9" /></g><text x="2" y="4.65" textAnchor="middle">楚河</text><text x="6" y="4.65" textAnchor="middle">汉界</text></svg>
        {Array.from({ length: 90 }, (_, index) => { const col = index % 9, row = Math.floor(index / 9), square = `${'abcdefghi'[flipped ? 8 - col : col]}${flipped ? row : 9 - row}` as Square; const p = viewGame.get(square), possible = legal.includes(square); return <button key={square} type="button" role="gridcell" data-square={square} aria-label={`${p ? `${sideName(p.color)}${pieceName(p.type, p.color)}` : '空位'} ${square}${possible ? ' 可走' : ''}`} aria-selected={selected === square} className={`xq-square ${selected === square ? 'is-selected' : ''} ${shownLast.includes(square) ? 'is-last' : ''} ${possible ? 'is-possible' : ''} ${hint?.slice(2, 4) === square ? 'is-hint' : ''}`} style={{ left: `${col / 8 * 100}%`, top: `${row / 9 * 100}%` }} onClick={() => selectSquare(square)} onKeyDown={(event) => { const steps: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }; if (!(event.key in steps)) return; event.preventDefault(); boardRef.current?.querySelectorAll<HTMLButtonElement>('.xq-square')[Math.max(0, Math.min(89, index + steps[event.key]))]?.focus(); }}>{p && <img src={piecePath(p.type, p.color)} alt="" draggable={false} />}{!p && possible && <i />}</button>; })}
      </div><div className="xq-file-coordinates" aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <span key={i}>{'abcdefghi'[flipped ? 8 - i : i]}</span>)}</div></div>
      {player(flipped ? 'b' : 'w')}<div className="xq-state" role="status">{busy && <Loader2 size={15} className="animate-spin" />}{currentStatus}</div>
    </div><aside className="xq-sidebar">{tab === 'match' ? <><div className="xq-section-title"><h3>本局棋谱</h3><span>{history.length} 手</span></div><div className="wb-actions"><button className="wb-button" disabled={!history.length || replay !== null} onClick={undo}><Undo2 size={14} />悔棋</button><button className="wb-button" disabled={busy || !!result || replay !== null} onClick={askHint}><Lightbulb size={14} />提示</button><IconButton label="认输" disabled={!!result || !session.moves.length} onClick={() => setDialog('resign')}><Flag size={15} /></IconButton></div>
      <div className="xq-replay-controls"><IconButton label="回到开局" disabled={!history.length} onClick={() => { cancelSearch(); setReplay(0); }}><ChevronFirst size={16} /></IconButton><IconButton label="上一步棋谱" disabled={!history.length || replay === 0} onClick={() => { cancelSearch(); setReplay(Math.max(0, (replay ?? history.length) - 1)); }}><ChevronLeft size={16} /></IconButton><IconButton label="下一步棋谱" disabled={replay === null || replay >= history.length} onClick={() => setReplay(Math.min(history.length, (replay ?? 0) + 1))}><ChevronRight size={16} /></IconButton><IconButton label="返回当前对局" disabled={replay === null} onClick={() => setReplay(null)}><ChevronLast size={16} /></IconButton></div>
      {replay !== null && <button className="wb-button" onClick={() => setReplay(null)}>返回对局</button>}
      <ol className="xq-move-list">{history.map((move, i) => <li key={`${i}-${move.lan}`}><button aria-current={replay === i + 1 ? 'step' : undefined} onClick={() => { cancelSearch(); setReplay(i + 1); }}><span>{i + 1}</span><strong>{move.zh}</strong><small>{move.lan}{move.isCheck ? ' +' : ''}</small></button></li>)}</ol>{!history.length && <div className="wb-empty"><Swords size={25} /><p>红先行</p></div>}<button className="wb-button" disabled={!history.length} onClick={() => downloadModuleFile('exbeam-xiangqi.pgn', game.pgn(), 'text/plain')}><Download size={14} />导出棋谱</button>
    </> : <><div className="xq-section-title"><h3>战术训练</h3><span>{training.solved.length}/{XIANGQI_PUZZLES.length}</span></div><p className="xq-training-task">{puzzle.task}</p><div className="xq-puzzle-list">{XIANGQI_PUZZLES.map((p, i) => <button key={p.id} aria-pressed={i === puzzleIndex} onClick={() => loadPuzzle(i)}><span>{String(i + 1).padStart(2, '0')}</span><div><strong>{p.title}</strong><small>{p.category}</small></div>{training.solved.includes(p.id) && <Check size={15} />}</button>)}</div><div className="wb-actions"><button className="wb-button" disabled={!!puzzleMove} onClick={askHint}><Lightbulb size={14} />看提示</button><button className="wb-button" onClick={() => loadPuzzle((puzzleIndex + 1) % XIANGQI_PUZZLES.length)}>下一题<ChevronRight size={14} /></button></div>{puzzleMove && <p className="wb-notice">{puzzle.explanation}</p>}</>}
      {notice && <p className="wb-notice" role="status">{notice}</p>}<div className="xq-rules-summary"><BookOpen size={15} /><p>将军时必须应将。无合法着法且未被将军属于困毙，也判负。电脑对手在本机计算，不联网。</p></div>
    </aside></div>}
    {dialog === 'new' && <ExplorerDialog title="新对局" onClose={() => setDialog(null)}><div className="xq-dialog"><p>开始后替换当前续局，已有对局可先导出。</p><label className="wb-field">对弈模式<select value={draftMode} onChange={(e) => setDraftMode(e.target.value as XiangqiSession['mode'])}><option value="computer">本地电脑对弈</option><option value="local">同屏双人</option></select></label><label className="wb-field">执子<select value={draftSide} onChange={(e) => setDraftSide(e.target.value as Color)}><option value="w">执红 · 先手</option><option value="b">执黑 · 后手</option></select></label><label className="wb-field">电脑难度<select value={draftLevel} onChange={(e) => setDraftLevel(Number(e.target.value) as 1 | 2 | 3)} disabled={draftMode === 'local'}><option value="1">初识 · 一层分析</option><option value="2">进阶 · 两层分析</option><option value="3">挑战 · 最多三层分析</option></select></label><label className="wb-field">每方用时<select value={draftClock} onChange={(e) => setDraftClock(Number(e.target.value))}><option value="0">不限时</option><option value="300">5 分钟</option><option value="600">10 分钟</option><option value="1200">20 分钟</option></select></label><button className="wb-button is-primary" onClick={newMatch}><Swords size={16} />开始对局</button></div></ExplorerDialog>}
    {dialog === 'import' && <ExplorerDialog title="导入棋谱" onClose={() => setDialog(null)}><div className="xq-dialog"><label className="wb-field">FEN、PGN 或 ExBeam 对局存档<textarea rows={12} value={importText} onChange={(e) => setImportText(e.target.value)} /></label>{importError && <p className="wb-notice is-error" role="alert">{importError}</p>}<p>载入成功后替换当前续局。棋谱走法会先经过规则校验。</p><button className="wb-button is-primary" onClick={importMatch}><Upload size={16} />校验并载入</button></div></ExplorerDialog>}
    {dialog === 'resign' && <ExplorerDialog title="确认认输" onClose={() => setDialog(null)}><div className="xq-dialog"><p>{sideName(session.mode === 'computer' ? session.human : game.turn())}将认输，本局仍可导出或复盘。</p><button className="wb-button is-danger" onClick={() => { cancelSearch(); setSession((c) => ({ ...c, resigned: c.mode === 'computer' ? c.human : game.turn() })); setDialog(null); }}>确认认输</button></div></ExplorerDialog>}
  </Workbench>;
}
