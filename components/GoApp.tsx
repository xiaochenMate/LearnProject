import React, { useMemo, useState } from 'react';
import { Check, Play, SkipForward, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { MatchSettings, Point, coordinate } from '../lib/strategyCore';
import { GO_KEY, GoSize, legalGoPoints, newGoMatch, playGo, replayGo, scoreGo, toggleDeadGroup, validGoMatch } from '../lib/strategyGo';
import { MatchSettingsFields, PlayerClock, ReviewPanel, StoneBoard, StrategyDialog, StrategyToolbar, useStrategyClock, useStrategyMatch } from '../lib/strategyUi';
import './strategy.css';

const COLORS: [string, string] = ['黑方', '白方'];

export default function GoApp({ onClose }: { onClose: () => void }) {
  const { match, setMatch, available, storageMessage, saveNow } = useStrategyMatch(GO_KEY, newGoMatch, validGoMatch);
  const [notice, setNotice] = useState(storageMessage);
  const [newDialog, setNewDialog] = useState(false);
  const [resumeDialog, setResumeDialog] = useState(false);
  const [review, setReview] = useState<number | null>(null);
  const live = useMemo(() => replayGo(match.size, match.moves), [match.size, match.moves]);
  const view = useMemo(() => review === null ? live : replayGo(match.size, match.moves, review), [live, match.size, match.moves, review]);
  const scoring = live.passes >= 2;
  const finalScore = scoring && match.accepted.every(Boolean);
  const score = useMemo(() => scoreGo(live.board, match.dead, match.komi), [live, match.dead, match.komi]);
  const difference = score.black - score.white;
  const outcome = match.timeout !== null ? `${COLORS[match.timeout]}超时，${COLORS[match.timeout === 0 ? 1 : 0]}获胜`
    : finalScore ? difference === 0 ? '双方确认：和棋' : `${difference > 0 ? '黑方' : '白方'}胜 ${Math.abs(difference)} 点` : null;
  const clock = useStrategyClock(match, setMatch, live.turn, scoring || Boolean(outcome), saveNow);
  const canMove = clock.running && !scoring && !outcome && review === null && !newDialog && !resumeDialog;
  const legal = useMemo(() => match.hints && review === null && !scoring ? legalGoPoints(live) : new Set<string>(), [match.hints, live, scoring, review]);
  const board = useMemo(() => view.board.signMap.map(row => row.map(value => value === -1 ? 2 : value)), [view]);

  function place(point: Point) {
    if (scoring && !outcome && review === null) {
      if (!live.board.get(point)) return;
      setMatch(current => ({ ...current, dead: toggleDeadGroup(live.board, current.dead, point), accepted: [false, false] }));
      return;
    }
    if (!canMove) return;
    try {
      playGo(live, point);
      const expected = match.moves;
      clock.commit(current => current.moves === expected ? { ...current, moves: [...current.moves, point], dead: [], accepted: [false, false] } : current);
      setNotice('');
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : '此处不能落子。'); }
  }

  function pass() {
    if (!canMove) return;
    const expected = match.moves;
    clock.commit(current => current.moves === expected ? { ...current, moves: [...current.moves, null], dead: [], accepted: [false, false] } : current);
    setNotice(live.passes === 1 ? '双方连续停一手，进入数子确认。死子须双方协商标记，不能自动判死活。' : `${COLORS[live.turn]}停一手，轮到${COLORS[live.turn === 0 ? 1 : 0]}。`);
  }

  function goTo(index: number) {
    clock.pause();
    setReview(index === match.moves.length ? null : Math.max(0, Math.min(index, match.moves.length)));
  }

  function undo() {
    clock.pause();
    setMatch(current => ({ ...current, moves: current.moves.slice(0, -1), dead: [], accepted: [false, false], timeout: null }));
    setReview(null);
    setNotice('已悔一手，提子与劫局已随棋谱还原；已消耗的用时不返还。');
  }

  const status = review !== null ? `复盘 · 第 ${review} 手` : outcome || (scoring ? '终局 · 双方确认死子与数子' : clock.running ? `${COLORS[live.turn]}落子${live.passes ? ' · 对方已停一手' : ''}` : '对局已暂停');
  const clockRow = (side: 0 | 1) => <PlayerClock label={COLORS[side]} color={side === 0 ? 'black' : 'white'} remaining={match.remaining[side]} minutes={match.settings.minutes} active={clock.running && live.turn === side} detail={`提子 ${view.board.getCaptures(side === 0 ? 1 : -1)}`} />;

  return <Workbench title="围棋" eyebrow="ExBeam / Strategy" className="strategy-workbench"
    toolbar={<StrategyToolbar onClose={() => { clock.pause(); onClose(); }} onNew={() => { clock.pause(); setNewDialog(true); }} onUndo={undo} canUndo={match.moves.length > 0 && review === null && !outcome}
      onFlip={() => setMatch(s => ({ ...s, flipped: !s.flipped }))} flipped={match.flipped} hints={match.hints} onHints={() => setMatch(s => ({ ...s, hints: !s.hints }))}
      running={clock.running} canRun={!scoring && !outcome && review === null && !newDialog} onPause={() => clock.running ? clock.pause() : clock.start()}>
      <IconButton label="停一手" onClick={pass} disabled={!canMove}><SkipForward size={17} /></IconButton>
    </StrategyToolbar>}
    status={<><span>Sabaki · 本地双人</span><span>面积数子 · 白贴 {match.komi} 点</span><span>{available ? '本机自动存档' : '存储不可用：离开后不能续局'}</span></>}>
    <div className="strategy-layout">
      <main className="strategy-arena">
        {notice && <div className="wb-notice strategy-notice" role="status"><span>{notice}</span><IconButton label="关闭提示" onClick={() => setNotice('')}><X size={14} /></IconButton></div>}
        <div className="strategy-board-column">
          <div className="strategy-match-state"><div><strong role="status" aria-live="polite">{status}</strong><small>{match.size} 路 · 本地双人</small></div>
            {!clock.running && !outcome && !scoring && review === null && <button type="button" className="wb-button is-primary" onClick={clock.start}><Play size={15} />{match.moves.length ? '继续' : '开始对局'}</button>}
            {review !== null && <button type="button" className="wb-button" onClick={() => goTo(match.moves.length)}>回到实战</button>}
          </div>
          {clockRow(match.flipped ? 0 : 1)}
          <StoneBoard board={board} last={match.moves[(review ?? match.moves.length) - 1] || null} flipped={match.flipped} legal={legal} onPoint={place}
            disabled={!(canMove || scoring && !outcome && review === null)} dead={review === null && scoring ? match.dead : []} territory={review === null && scoring ? score.territory : undefined} name="围棋棋盘" />
          {clockRow(match.flipped ? 1 : 0)}
          {canMove && <div className="strategy-actions"><button className="wb-button" type="button" onClick={pass}><SkipForward size={16} />停一手</button></div>}
        </div>
      </main>
      <aside className="strategy-aside">
        {outcome && <div className="strategy-result">{outcome}</div>}
        {scoring && review === null && <section aria-label="数子确认">
          <h3>数子{finalScore ? '结果' : '确认'}</h3>
          <div className="strategy-score"><div><small>黑方 · 子 + 空</small><strong>{score.black}</strong><small>{score.stones[0]} + {score.empty[0]}</small></div><div><small>白方 · 子 + 空 + 贴点</small><strong>{score.white}</strong><small>{score.stones[1]} + {score.empty[1]} + {match.komi}</small></div></div>
          <p className="strategy-caption">中立点 {score.neutral}；已标死子 {match.dead.length}。提子不额外计分。死子由双方协商，点棋子整组标记；改动后双方确认重置。此为面积计分，不自动判断死活、双活或未收完的官子。</p>
          {!finalScore && <div className="strategy-actions">{COLORS.map((color, side) => <button key={color} className={`wb-button ${match.accepted[side] ? 'is-primary' : ''}`} type="button" aria-pressed={match.accepted[side]} onClick={() => setMatch(current => {
            const accepted: [boolean, boolean] = [...current.accepted];
            accepted[side] = !accepted[side];
            return { ...current, accepted };
          })}><Check size={15} />{color}{match.accepted[side] ? '已确认' : '确认'}</button>)}</div>}
          {!finalScore && <button type="button" className="wb-button" onClick={() => setResumeDialog(true)}><Play size={15} />恢复对弈</button>}
        </section>}
        {!scoring && <div className="strategy-summary"><span>手数 <b>{match.moves.length}</b></span><span>白贴 <b>{match.komi}</b> 点</span></div>}
        <details className="strategy-rule"><summary>本局规则与计分约定</summary><p>黑先白后，采用 Sabaki 引擎处理气、提子、禁自杀和立即劫回提；额外禁止任何落子重现此前棋盘（全局同形），停一手不受同形限制。双方连续停一手进入数子。</p><p>采用中国式面积思路的本地约定：存活棋子 + 仅被单色包围的空点，白方加贴点；混合边界与无边界空点中立。双方协商并标记死子后分别确认。不做自动死活裁决，未解决的争议应恢复对弈。</p><p>仅提供本地双人，不提供围棋 AI 或棋力评级。计时暂停后不累计离线用时；悔棋保留已用时间。</p></details>
        <ReviewPanel labels={match.moves.map((point, i) => `${i % 2 === 0 ? '黑' : '白'} ${point ? coordinate(point, match.size) : '停一手'}`)} index={review ?? match.moves.length} onChange={goTo} />
      </aside>
    </div>
    {newDialog && <GoNewDialog settings={match.settings} size={match.size} komi={match.komi} onClose={() => setNewDialog(false)} onConfirm={(settings, size, komi) => {
      clock.pause();
      setMatch(newGoMatch(settings, size, komi));
      setNewDialog(false);
      setReview(null);
      setNotice('新对局已就绪，计时已暂停。');
    }} />}
    {resumeDialog && <StrategyDialog title="恢复对弈" onClose={() => setResumeDialog(false)}><p>撤回最后两次停一手，清除死子标记和双方确认。双方已用时间保持不变。</p><footer><button type="button" className="wb-button" onClick={() => setResumeDialog(false)}>取消</button><button type="button" className="wb-button is-primary" onClick={() => {
      setMatch(current => ({ ...current, moves: current.moves.slice(0, -2), dead: [], accepted: [false, false] }));
      setResumeDialog(false);
      setNotice('已恢复对弈，计时已暂停。');
    }}>确认恢复</button></footer></StrategyDialog>}
  </Workbench>;
}

function GoNewDialog({ settings, size, komi, onClose, onConfirm }: { settings: MatchSettings; size: GoSize; komi: number; onClose: () => void; onConfirm: (settings: MatchSettings, size: GoSize, komi: number) => void }) {
  const [value, setValue] = useState(settings);
  const [boardSize, setBoardSize] = useState(size);
  const [whiteKomi, setWhiteKomi] = useState(komi);
  return <StrategyDialog title="新对局" onClose={onClose}><form onSubmit={event => { event.preventDefault(); onConfirm(value, boardSize, whiteKomi); }}>
    <p>本地双人对局。开始新局将替换当前棋谱和数子结果。</p>
    <label className="wb-field">棋盘<select value={boardSize} onChange={event => setBoardSize(Number(event.target.value) as GoSize)}><option value="9">9 路</option><option value="13">13 路</option><option value="19">19 路</option></select></label>
    <label className="wb-field">白方贴点<select value={whiteKomi} onChange={event => setWhiteKomi(Number(event.target.value))}><option value="0">0 点</option><option value="6.5">6.5 点</option><option value="7.5">7.5 点</option></select></label>
    <MatchSettingsFields value={value} onChange={setValue} colors={COLORS} computer={false} />
    <footer><button type="button" className="wb-button" onClick={onClose}>取消</button><button type="submit" className="wb-button is-primary">确认新局</button></footer>
  </form></StrategyDialog>;
}
