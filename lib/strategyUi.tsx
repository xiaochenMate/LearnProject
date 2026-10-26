import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowLeftRight, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Eye, Maximize2, Minimize2, Pause, Play, RotateCcw, Undo2, X } from 'lucide-react';
import { IconButton } from '../components/ModuleWorkbench';
import { useModuleState } from './moduleSession';
import { Difficulty, MatchBase, MatchSettings, Point, Side, TIME_OPTIONS, chargeClock, coordinate, formatClock, pointKey, recoverStrategySession } from './strategyCore';

export function useStrategyMatch<T extends MatchBase>(key: string, initial: () => T, validate: (value: unknown) => boolean) {
  const [read] = useState(() => {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { /* The in-memory match remains available. */ }
    return recoverStrategySession(storage, key, initial(), validate);
  });
  const [match, setMatch, available] = useModuleState<T>(key, read.value, validate);
  const saveNow = useCallback((value: T) => {
    try {
      const raw = JSON.stringify(value);
      localStorage.setItem(key, raw);
      localStorage.setItem(`${key}.backup`, raw);
    } catch { /* The shared hook exposes storage failure in the footer. */ }
  }, [key]);
  useEffect(() => {
    try { localStorage.setItem(`${key}.backup`, JSON.stringify(match)); } catch { /* Primary storage may still be available. */ }
  }, [key, match]);
  return { match, setMatch, available, storageMessage: read.message, saveNow };
}

export function useStrategyClock<T extends MatchBase>(match: T, setMatch: React.Dispatch<React.SetStateAction<T>>, turn: Side, ended: boolean, saveNow: (value: T) => void) {
  const [running, setRunning] = useState(false);
  const anchor = useRef(Date.now());
  const latest = useRef({ match, turn, running, saveNow });
  latest.current = { match, turn, running, saveNow };
  const commit = useCallback((change: (value: T) => T, keepRunning = true) => {
    const now = Date.now();
    const elapsed = running ? now - anchor.current : 0;
    anchor.current = now;
    setMatch(previous => {
      const charged = chargeClock(previous, turn, elapsed);
      return charged.timeout === null ? change(charged) : charged;
    });
    setRunning(keepRunning);
  }, [running, turn, setMatch]);
  const pause = useCallback(() => {
    const current = latest.current;
    const elapsed = current.running ? Date.now() - anchor.current : 0;
    anchor.current = Date.now();
    const charged = chargeClock(current.match, current.turn, elapsed);
    latest.current = { ...current, match: charged, running: false };
    current.saveNow(charged);
    setMatch(charged);
    setRunning(false);
  }, [setMatch]);
  const start = useCallback(() => {
    if (ended) return;
    anchor.current = Date.now();
    setRunning(true);
  }, [ended]);
  useEffect(() => {
    if (!running || ended) return;
    const timer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - anchor.current;
      anchor.current = now;
      setMatch(previous => chargeClock(previous, turn, elapsed));
    }, 250);
    return () => window.clearInterval(timer);
  }, [running, ended, turn, setMatch]);
  useEffect(() => { if (ended) setRunning(false); }, [ended]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', pause);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('pagehide', pause);
    };
  }, [pause]);
  useEffect(() => () => {
    const current = latest.current;
    current.saveNow(chargeClock(current.match, current.turn, current.running ? Date.now() - anchor.current : 0));
  }, []);
  return { running: running && !ended, start, pause, commit };
}

export function StrategyToolbar({ onClose, onNew, onUndo, onFlip, onHints, onPause, canUndo, canRun, running, hints, flipped, children }: {
  onClose: () => void; onNew: () => void; onUndo: () => void; onFlip: () => void; onHints: () => void; onPause: () => void;
  canUndo: boolean; canRun: boolean; running: boolean; hints: boolean; flipped: boolean; children?: React.ReactNode;
}) {
  return <>
    <IconButton label="返回探索" onClick={onClose}><ArrowLeft size={17} /></IconButton>
    <IconButton label="新对局" onClick={onNew}><RotateCcw size={17} /></IconButton>
    <IconButton label="悔棋" onClick={onUndo} disabled={!canUndo}><Undo2 size={17} /></IconButton>
    <IconButton label="翻转棋盘" onClick={onFlip} aria-pressed={flipped}><ArrowLeftRight size={17} /></IconButton>
    <IconButton label="合法落点提示" onClick={onHints} aria-pressed={hints}><Eye size={17} /></IconButton>
    <IconButton label={running ? '暂停对局' : '继续对局'} onClick={onPause} disabled={!canRun}>{running ? <Pause size={17} /> : <Play size={17} />}</IconButton>
    {children}
  </>;
}

export function StrategyDialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const focused = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); focused?.focus(); };
  }, []);
  return <dialog ref={dialog} className="strategy-modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h3 id={titleId}>{title}</h3><IconButton label="关闭对话框" onClick={onClose}><X size={17} /></IconButton></header>
    {children}
  </dialog>;
}

export function MatchSettingsFields({ value, onChange, colors, computer = true, difficultyText }: { value: MatchSettings; onChange: (value: MatchSettings) => void; colors: [string, string]; computer?: boolean; difficultyText?: string[] }) {
  return <>
    {computer && <fieldset className="strategy-fieldset"><legend>对手</legend><div className="strategy-segments">
      <button type="button" aria-pressed={value.mode === 'local'} onClick={() => onChange({ ...value, mode: 'local' })}>本地双人</button>
      <button type="button" aria-pressed={value.mode === 'computer'} onClick={() => onChange({ ...value, mode: 'computer' })}>本机电脑</button>
    </div></fieldset>}
    {computer && value.mode === 'computer' && <>
      <label className="wb-field">你的执棋<select value={value.human} onChange={event => onChange({ ...value, human: Number(event.target.value) as Side })}><option value="0">{colors[0]}</option><option value="1">{colors[1]}</option></select></label>
      <label className="wb-field">电脑难度<select value={value.level} onChange={event => onChange({ ...value, level: Number(event.target.value) as Difficulty })}><option value="1">一级 · 战术入门</option><option value="2">二级 · 应对搜索</option><option value="3">三级 · 深入搜索</option></select></label>
      {difficultyText && <p className="strategy-caption">{difficultyText[value.level - 1]}</p>}
    </>}
    <label className="wb-field">每方用时<select value={value.minutes} onChange={event => onChange({ ...value, minutes: Number(event.target.value) })}>{TIME_OPTIONS.map(n => <option key={n} value={n}>{n ? `${n} 分钟` : '不限时'}</option>)}</select></label>
  </>;
}

export function PlayerClock({ label, color, remaining, minutes, active, detail }: { label: string; color: 'white' | 'black'; remaining: number; minutes: number; active: boolean; detail?: React.ReactNode }) {
  return <div className={`strategy-player ${active ? 'is-active' : ''}`}>
    <span className={`strategy-player-stone is-${color}`} aria-hidden="true" />
    <div className="strategy-player-name"><strong>{label}</strong>{detail && <small>{detail}</small>}</div>
    <time className={minutes && remaining < 30_000 ? 'is-low' : ''} aria-label={`${label}剩余${formatClock(remaining, minutes)}`}>{formatClock(remaining, minutes)}</time>
  </div>;
}

export function ReviewPanel({ labels, index, onChange }: { labels: string[]; index: number; onChange: (index: number) => void }) {
  return <section className="strategy-record" aria-label="棋谱复盘">
    <header><h3>棋谱</h3><span>{index} / {labels.length} 手</span></header>
    <div className="strategy-review-controls">
      <IconButton label="初始局面" onClick={() => onChange(0)} disabled={!index}><ChevronFirst size={16} /></IconButton>
      <IconButton label="上一步" onClick={() => onChange(index - 1)} disabled={!index}><ChevronLeft size={16} /></IconButton>
      <input aria-label="复盘步数" type="range" min="0" max={labels.length} value={index} onChange={event => onChange(Number(event.target.value))} disabled={!labels.length} />
      <IconButton label="下一步" onClick={() => onChange(index + 1)} disabled={index === labels.length}><ChevronRight size={16} /></IconButton>
      <IconButton label="回到实战" onClick={() => onChange(labels.length)} disabled={index === labels.length}><ChevronLast size={16} /></IconButton>
    </div>
    {labels.length ? <ol className="strategy-moves">{labels.map((label, i) => <li key={i}><button type="button" aria-current={index === i + 1 ? 'step' : undefined} onClick={() => onChange(i + 1)}><span>{i + 1}.</span>{label}</button></li>)}</ol>
      : <div className="strategy-no-moves">尚未落子</div>}
  </section>;
}

export function boardKey(event: React.KeyboardEvent<HTMLButtonElement>, index: number, size: number) {
  const delta: Record<string, number> = { ArrowUp: -size, ArrowDown: size, ArrowLeft: -1, ArrowRight: 1 };
  let next = index;
  if (event.key in delta) {
    if (event.key === 'ArrowLeft' && index % size === 0 || event.key === 'ArrowRight' && index % size === size - 1) return;
    next = Math.max(0, Math.min(size * size - 1, index + delta[event.key]));
  } else if (event.key === 'Home') next = event.ctrlKey ? 0 : index - index % size;
  else if (event.key === 'End') next = event.ctrlKey ? size * size - 1 : index - index % size + size - 1;
  else return;
  event.preventDefault();
  const grid = event.currentTarget.closest('[role="grid"]');
  (grid?.querySelectorAll<HTMLButtonElement>('[role="gridcell"]')[next])?.focus();
}

export function StoneBoard({ board, last, flipped, legal, onPoint, disabled, winning = [], dead = [], territory, hint, name }: {
  board: number[][]; last: Point | null; flipped: boolean; legal: Set<string>; onPoint: (point: Point) => void; disabled: boolean;
  winning?: Point[]; dead?: Point[]; territory?: number[][]; hint?: Point | null; name: string;
}) {
  const size = board.length;
  const [focus, setFocus] = useState('0,0');
  const [zoom, setZoom] = useState(false);
  useEffect(() => { setFocus('0,0'); setZoom(false); }, [size]);
  const deadKeys = new Set(dead.map(pointKey));
  const winningKeys = new Set(winning.map(pointKey));
  const axes = Array.from({ length: size }, (_, i) => flipped ? size - 1 - i : i);
  const stars = size === 9 ? [2, 4, 6] : size === 13 ? [3, 6, 9] : size === 15 ? [3, 7, 11] : [3, 9, 15];
  return <div className="strategy-stone-stage">
    <div className="strategy-board-heading"><span>{size} × {size}</span><IconButton label={zoom ? '缩小棋盘' : '放大棋盘'} aria-pressed={zoom} onClick={() => setZoom(!zoom)}>{zoom ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</IconButton></div>
    <div className="strategy-board-scroll">
      <div className={`strategy-stone-frame ${zoom ? 'is-zoomed' : ''}`} style={{ '--board-size': size } as React.CSSProperties}>
        <div className="strategy-axis strategy-axis-top">{axes.map(x => <span key={x}>{'ABCDEFGHJKLMNOPQRST'[x]}</span>)}</div>
        <div className="strategy-axis strategy-axis-side">{axes.map(y => <span key={y}>{size - y}</span>)}</div>
        <div className="strategy-stone-board" role="grid" aria-label={name} aria-rowcount={size} aria-colcount={size}>
          {axes.map((y, displayRow) => <div role="row" key={y} className="strategy-grid-row">{axes.map((x, displayCol) => {
            const point: Point = [x, y];
            const key = pointKey(point), cell = board[y][x];
            const isLast = last && pointKey(last) === key;
            const isStar = stars.includes(x) && stars.includes(y) && (size === 19 || x !== stars[1] && y !== stars[1] || x === stars[1] && y === stars[1]);
            const hintHere = hint && pointKey(hint) === key;
            return <button key={key} type="button" role="gridcell" data-point={key} aria-rowindex={displayRow + 1} aria-colindex={displayCol + 1}
              aria-label={`${coordinate(point, size)} ${cell === 1 ? '黑子' : cell ? '白子' : '空点'}${!disabled && legal.has(key) ? ' 可落子' : ''}${deadKeys.has(key) ? ' 已标记死子' : ''}${isLast ? ' 最后一手' : ''}`}
              aria-disabled={disabled} aria-selected={Boolean(isLast)} tabIndex={focus === key ? 0 : -1}
              onFocus={() => setFocus(key)} onKeyDown={event => boardKey(event, displayRow * size + displayCol, size)} onClick={() => { if (!disabled) onPoint(point); }}
              className={`strategy-point ${displayCol === 0 ? 'edge-left' : ''} ${displayCol === size - 1 ? 'edge-right' : ''} ${displayRow === 0 ? 'edge-top' : ''} ${displayRow === size - 1 ? 'edge-bottom' : ''} ${isStar ? 'is-star' : ''} ${hintHere ? 'is-hint' : ''} ${winningKeys.has(key) ? 'is-winning' : ''}`}>
              {cell ? <span className={`strategy-stone is-${cell === 1 ? 'black' : 'white'} ${deadKeys.has(key) ? 'is-dead' : ''}`}>{isLast && <i />}{deadKeys.has(key) && <X aria-hidden="true" />}</span>
                : territory?.[y][x] ? <span className={`strategy-territory is-${territory[y][x] === 1 ? 'black' : 'white'}`} />
                  : legal.has(key) && !disabled ? <span className="strategy-legal-point" /> : null}
            </button>;
          })}</div>)}
        </div>
      </div>
    </div>
  </div>;
}
