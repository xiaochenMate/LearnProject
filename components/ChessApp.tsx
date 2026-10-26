import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Play, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { downloadModuleFile } from '../lib/moduleSession';
import { MatchSettings, undoCount } from '../lib/strategyCore';
import { CHESS_KEY, CHESS_PIECES, CHESS_VALUES, ChessMatch, ChessMove, bestChessMove, chessMatchResult, chessSide, exportChessPgn, importChessPgn, initialChessMatch, newChessMatch, replayChess, validChessMatch } from '../lib/strategyChess';
import { MatchSettingsFields, PlayerClock, ReviewPanel, StrategyDialog, StrategyToolbar, boardKey, useStrategyClock, useStrategyMatch } from '../lib/strategyUi';
import './strategy.css';

const COLORS: [string, string] = ['白方', '黑方'];
const LEVELS = [
  '1 层搜索：比较子力、中心与将军；不预判对手回复。',
  '最多 2 层：考虑对手回复，使用子力与位置评分。',
  '最多 3 层，Alpha-Beta 剪枝；单次上限 6,500 节点 / 180 毫秒，不保证达到最大深度。',
];

export default function ChessApp({ onClose }: { onClose: () => void }) {
  const { match, setMatch, available, storageMessage, saveNow } = useStrategyMatch(CHESS_KEY, initialChessMatch, validChessMatch);
  const [notice, setNotice] = useState(storageMessage);
  const [dialog, setDialog] = useState<'new' | 'pgn' | null>(null);
  const [review, setReview] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [focus, setFocus] = useState('e2');
  const [promotion, setPromotion] = useState<{ from: string; to: string; color: string } | null>(null);
  const live = useMemo(() => replayChess(match), [match.startFen, match.moves]);
  const view = useMemo(() => review === null ? live : replayChess(match, review), [live, review]);
  const turn = chessSide(live);
  const outcome = chessMatchResult(match, live);
  const clock = useStrategyClock(match, setMatch, turn, Boolean(outcome), saveNow);
  const thinking = match.settings.mode === 'computer' && turn !== match.settings.human && clock.running && !outcome && review === null && !dialog && !promotion;
  const canMove = clock.running && !outcome && review === null && !dialog && !thinking;
  const history = useMemo(() => view.history({ verbose: true }) as ChessMove[], [view]);
  const last = history[history.length - 1];
  const legal = useMemo(() => selected && canMove ? view.moves({ square: selected, verbose: true }) as ChessMove[] : [], [selected, canMove, view]);
  const legalSquares = new Set(legal.map(move => move.to));
  const board = view.board();
  const indices = Array.from({ length: 8 }, (_, i) => match.flipped ? 7 - i : i);
  const material = board.flat().reduce((score, piece) => score + (piece ? CHESS_VALUES[piece.type] * (piece.color === 'w' ? 1 : -1) : 0), 0) / 100;

  useEffect(() => { setSelected(null); setPromotion(null); }, [match.moves, match.startFen]);
  useEffect(() => { if (outcome) setPromotion(null); }, [outcome]);
  useEffect(() => {
    if (!thinking) return;
    const snapshot = match;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const game = replayChess(snapshot);
      const move = bestChessMove(game, snapshot.settings.level);
      if (!cancelled && move) clock.commit(current => current.moves !== snapshot.moves ? current : { ...current, moves: [...current.moves, move.san] });
    }, 260);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [thinking, match.moves, match.startFen, match.settings, clock.commit]);

  function move(from: string, to: string, promote?: string) {
    if (!canMove || outcome) return;
    const game = replayChess(match);
    const result = game.move({ from, to, ...(promote ? { promotion: promote } : {}) });
    if (!result) return;
    const expected = match.moves;
    clock.commit(current => current.moves === expected ? { ...current, moves: [...current.moves, result.san] } : current);
    setPromotion(null);
    setSelected(null);
    setNotice('');
  }

  function select(square: string) {
    if (!canMove || promotion) return;
    if (selected && legalSquares.has(square)) {
      const candidate = legal.find(m => m.to === square);
      if (candidate?.promotion) setPromotion({ from: selected, to: square, color: view.turn() });
      else move(selected, square);
      return;
    }
    const piece = view.get(square);
    setSelected(piece?.color === view.turn() ? square === selected ? null : square : null);
  }

  function goTo(index: number) {
    clock.pause();
    setSelected(null);
    setReview(index === match.moves.length ? null : Math.max(0, Math.min(index, match.moves.length)));
  }

  function undo() {
    clock.pause();
    const count = undoCount(match.moves.length, match.settings, turn);
    setMatch(current => ({ ...current, moves: current.moves.slice(0, -count), headers: { ...current.headers, Result: '*' }, timeout: null }));
    setReview(null);
    setSelected(null);
    setNotice('已悔棋；已消耗的用时不返还。');
  }

  function replace(next: ChessMatch) {
    clock.pause();
    setMatch(next);
    setDialog(null);
    setReview(null);
    setSelected(null);
    setPromotion(null);
    setNotice('对局已就绪，计时已暂停。');
  }

  const status = review !== null ? `复盘 · 第 ${review} 手` : outcome || (clock.running ? thinking ? '电脑正在计算走子' : `${COLORS[turn]}走棋${live.in_check() ? ' · 将军' : ''}` : '对局已暂停');
  const label = (side: 0 | 1) => `${COLORS[side]}${match.settings.mode === 'computer' ? side === match.settings.human ? ' · 你' : ' · 电脑' : ''}`;
  const clockRow = (side: 0 | 1) => <PlayerClock label={label(side)} color={side === 0 ? 'white' : 'black'} remaining={match.remaining[side]} minutes={match.settings.minutes} active={clock.running && turn === side} detail={side === 0 ? '先行' : '后行'} />;

  return <Workbench title="国际象棋" eyebrow="ExBeam / Strategy" className="strategy-workbench"
    toolbar={<StrategyToolbar onClose={() => { clock.pause(); onClose(); }} onNew={() => { clock.pause(); setDialog('new'); }} onUndo={undo} canUndo={match.moves.length > 0 && review === null && match.timeout === null}
      onFlip={() => setMatch(s => ({ ...s, flipped: !s.flipped }))} flipped={match.flipped} hints={match.hints} onHints={() => setMatch(s => ({ ...s, hints: !s.hints }))}
      onPause={() => { setSelected(null); if (clock.running) clock.pause(); else clock.start(); }} running={clock.running} canRun={!outcome && review === null && !dialog}>
      <IconButton label="导入 PGN" onClick={() => { clock.pause(); setDialog('pgn'); }}><FileUp size={17} /></IconButton>
      <IconButton label="导出 PGN" onClick={() => downloadModuleFile('exbeam-chess.pgn', exportChessPgn(match), 'application/x-chess-pgn')}><Download size={17} /></IconButton>
    </StrategyToolbar>}
    status={<><span>chess.js · 标准棋规</span><span>{available ? '本机自动存档' : '存储不可用：离开后不能续局'}</span><span>离开页面自动暂停</span></>}>
    <div className="strategy-layout">
      <main className="strategy-arena">
        {notice && <div className="wb-notice strategy-notice" role="status"><span>{notice}</span><IconButton label="关闭提示" onClick={() => setNotice('')}><X size={14} /></IconButton></div>}
        <div className="strategy-board-column">
          <div className="strategy-match-state"><div><strong role="status" aria-live="polite">{status}</strong><small>{match.settings.mode === 'local' ? '本地双人' : `本机电脑 · ${match.settings.level} 级`}</small></div>
            {!clock.running && !outcome && review === null && <button type="button" className="wb-button is-primary" onClick={clock.start}><Play size={15} />{match.moves.length ? '继续' : '开始对局'}</button>}
            {review !== null && <button type="button" className="wb-button" onClick={() => goTo(match.moves.length)}>回到实战</button>}
          </div>
          {clockRow(match.flipped ? 0 : 1)}
          <div className="strategy-chess-frame"><div className="strategy-chess-board" role="grid" aria-label="国际象棋棋盘" aria-rowcount={8} aria-colcount={8}>
            {indices.map((r, dr) => <div role="row" key={r} className="strategy-grid-row">{indices.map((c, dc) => {
              const square = `${'abcdefgh'[c]}${8 - r}`;
              const piece = board[r][c];
              const check = piece?.type === 'k' && piece.color === view.turn() && view.in_check();
              return <button type="button" role="gridcell" key={square} data-square={square} aria-rowindex={dr + 1} aria-colindex={dc + 1} aria-selected={selected === square} aria-disabled={!canMove}
                aria-label={`${square} ${piece ? `${piece.color === 'w' ? '白' : '黑'}${CHESS_PIECES[piece.type]}` : '空格'}${legalSquares.has(square) ? ' 可走' : ''}`}
                tabIndex={focus === square ? 0 : -1} onFocus={() => setFocus(square)} onKeyDown={event => { if (event.key === 'Escape') { setSelected(null); return; } boardKey(event, dr * 8 + dc, 8); }} onClick={() => select(square)}
                className={`strategy-chess-square ${(r + c) % 2 ? 'is-dark' : 'is-light'} ${piece ? 'has-piece' : ''} ${selected === square ? 'is-selected' : ''} ${last && (last.from === square || last.to === square) ? 'is-last' : ''} ${match.hints && legalSquares.has(square) ? 'is-legal' : ''} ${check ? 'is-checked' : ''}`}>
                {piece && <img src={`/images/pieces/chess-${piece.color}-${piece.type}.svg`} alt="" draggable={false} />}
                {dr === 7 && <span className="strategy-file" aria-hidden="true">{'abcdefgh'[c]}</span>}{dc === 0 && <span className="strategy-rank" aria-hidden="true">{8 - r}</span>}
              </button>;
            })}</div>)}
          </div></div>
          {clockRow(match.flipped ? 1 : 0)}
        </div>
      </main>
      <aside className="strategy-aside">
        {outcome && <div className="strategy-result">{outcome}</div>}
        <div className="strategy-summary"><span>子力差 <b>{material > 0 ? '+' : ''}{material.toFixed(1)}</b></span><span>第 <b>{Math.floor(match.moves.length / 2) + 1}</b> 回合</span></div>
        {match.settings.mode === 'computer' && <p className="strategy-caption">{LEVELS[match.settings.level - 1]} 本机启发式对手，无等级分，不是专业棋力引擎。</p>}
        <details className="strategy-rule"><summary>对局规则</summary><p>王车易位、吃过路兵、将军与将死均由 chess.js 校验。兵到达底线后可选后、车、象或马。逼和、子力不足、三次重复及五十回合按本机自动和棋规则结算。</p><p>计时在开始后生效；暂停、复盘与离开页面不计时。悔棋保留已消耗用时；超时终局不可悔棋。</p></details>
        <ReviewPanel labels={match.moves} index={review ?? match.moves.length} onChange={goTo} />
      </aside>
    </div>
    {dialog === 'new' && <ChessNewDialog settings={match.settings} onClose={() => setDialog(null)} onConfirm={settings => replace({ ...newChessMatch(settings), flipped: settings.mode === 'computer' && settings.human === 1 })} />}
    {dialog === 'pgn' && <PgnDialog settings={match.settings} onClose={() => setDialog(null)} onImport={replace} />}
    {promotion && <StrategyDialog title="选择升变棋子" onClose={() => setPromotion(null)}><div className="strategy-promotions">{['q', 'r', 'b', 'n'].map(type => <button key={type} type="button" aria-label={`升变为${CHESS_PIECES[type]}`} onClick={() => move(promotion.from, promotion.to, type)}><img src={`/images/pieces/chess-${promotion.color}-${type}.svg`} alt="" /><span>{CHESS_PIECES[type]}</span></button>)}</div></StrategyDialog>}
  </Workbench>;
}

function ChessNewDialog({ settings, onClose, onConfirm }: { settings: MatchSettings; onClose: () => void; onConfirm: (settings: MatchSettings) => void }) {
  const [value, setValue] = useState(settings);
  return <StrategyDialog title="新对局" onClose={onClose}><form onSubmit={event => { event.preventDefault(); onConfirm(value); }}>
    <p>开始新局将替换当前棋谱。需要保留时，请先导出 PGN。</p>
    <MatchSettingsFields value={value} onChange={setValue} colors={COLORS} difficultyText={LEVELS} />
    <footer><button type="button" className="wb-button" onClick={onClose}>取消</button><button type="submit" className="wb-button is-primary">确认新局</button></footer>
  </form></StrategyDialog>;
}

function PgnDialog({ settings, onClose, onImport }: { settings: MatchSettings; onClose: () => void; onImport: (match: ChessMatch) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  return <StrategyDialog title="导入 PGN" onClose={onClose}><form onSubmit={event => {
    event.preventDefault();
    try { onImport(importChessPgn(text, settings)); } catch (cause) { setError(cause instanceof Error ? cause.message : '无法读取棋谱。'); }
  }}>
    <p>导入会替换当前对局，双方计时重新开始。原 PGN 文件不会修改。</p>
    <label className="wb-field">棋谱文件<input type="file" accept=".pgn,.txt" onChange={async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 250_000) { setError('文件不能超过 250 KB。'); return; }
      try { setText(await file.text()); setError(''); } catch { setError('无法读取文件。'); }
    }} /></label>
    <label className="wb-field">PGN<textarea value={text} onChange={event => { setText(event.target.value); setError(''); }} maxLength={250_000} spellCheck={false} /></label>
    {error && <div className="wb-notice is-error" role="alert">{error}</div>}
    <footer><button type="button" className="wb-button" onClick={onClose}>取消</button><button type="submit" className="wb-button is-primary" disabled={!text.trim()}>确认导入</button></footer>
  </form></StrategyDialog>;
}
