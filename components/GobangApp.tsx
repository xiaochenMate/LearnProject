import React, { useEffect, useMemo, useState } from 'react';
import { Lightbulb, Play, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { MatchSettings, Point, coordinate, pointKey, undoCount } from '../lib/strategyCore';
import { getBestMove } from '../lib/gobangAI.ts';
import { GOBANG_KEY, newGobangMatch, replayGobang, validGobangMatch } from '../lib/strategyGobang';
import { MatchSettingsFields, PlayerClock, ReviewPanel, StoneBoard, StrategyDialog, StrategyToolbar, useStrategyClock, useStrategyMatch } from '../lib/strategyUi';
import './strategy.css';

const COLORS: [string, string] = ['黑方', '白方'];
const LEVELS = [
  '先取一步成五或防守对手成五，再按连线与空位评分。',
  '最多 2 层应对搜索，每层优先保留高分候选点。',
  '最多 3 层 Alpha-Beta 搜索，根节点 12 个候选、后续 8 个；上限 3,500 节点 / 160 毫秒。',
];

export default function GobangApp({ onClose }: { onClose: () => void }) {
  const { match, setMatch, available, storageMessage, saveNow } = useStrategyMatch(GOBANG_KEY, newGobangMatch, validGobangMatch);
  const [notice, setNotice] = useState(storageMessage);
  const [newDialog, setNewDialog] = useState(false);
  const [review, setReview] = useState<number | null>(null);
  const [hint, setHint] = useState<Point | null>(null);
  const live = useMemo(() => replayGobang(match.moves), [match.moves]);
  const view = useMemo(() => review === null ? live : replayGobang(match.moves, review), [live, match.moves, review]);
  const outcome = live.winner !== null ? `${COLORS[live.winner]}连五获胜` : live.draw ? '棋盘已满，和棋' : match.timeout !== null ? `${COLORS[match.timeout]}超时，${COLORS[match.timeout === 0 ? 1 : 0]}获胜` : null;
  const clock = useStrategyClock(match, setMatch, live.turn, Boolean(outcome), saveNow);
  const thinking = match.settings.mode === 'computer' && live.turn !== match.settings.human && clock.running && !outcome && review === null && !newDialog;
  const canMove = clock.running && !outcome && review === null && !thinking && !newDialog;
  const legal = useMemo(() => {
    const points = new Set<string>();
    if (match.hints) view.board.forEach((row, y) => row.forEach((stone, x) => { if (!stone) points.add(pointKey([x, y])); }));
    return points;
  }, [match.hints, view]);

  useEffect(() => { setHint(null); }, [match.moves, review]);
  useEffect(() => {
    if (!thinking) return;
    const snapshot = match;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const [r, c] = getBestMove(live.board, snapshot.settings.level, live.turn === 0 ? 1 : 2);
      if (cancelled || r < 0 || c < 0) return;
      clock.commit(current => current.moves === snapshot.moves ? { ...current, moves: [...current.moves, [c, r]] } : current);
    }, 280);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [thinking, live, match.moves, match.settings, clock.commit]);

  function place(point: Point) {
    if (!canMove || live.board[point[1]][point[0]]) return;
    const expected = match.moves;
    clock.commit(current => current.moves === expected ? { ...current, moves: [...current.moves, point] } : current);
    setHint(null);
    setNotice('');
  }

  function goTo(index: number) {
    clock.pause();
    setReview(index === match.moves.length ? null : Math.max(0, Math.min(index, match.moves.length)));
    setHint(null);
  }

  function undo() {
    clock.pause();
    const count = undoCount(match.moves.length, match.settings, live.turn);
    setMatch(current => ({ ...current, moves: current.moves.slice(0, -count), timeout: null }));
    setReview(null);
    setHint(null);
    setNotice('已悔棋；已消耗的用时不返还。');
  }

  const status = review !== null ? `复盘 · 第 ${review} 手` : outcome || (clock.running ? thinking ? '电脑正在计算落点' : `${COLORS[live.turn]}落子` : '对局已暂停');
  const label = (side: 0 | 1) => `${COLORS[side]}${match.settings.mode === 'computer' ? side === match.settings.human ? ' · 你' : ' · 电脑' : ''}`;
  const clockRow = (side: 0 | 1) => <PlayerClock label={label(side)} color={side === 0 ? 'black' : 'white'} remaining={match.remaining[side]} minutes={match.settings.minutes} active={clock.running && live.turn === side} detail={side === 0 ? '先行' : '后行'} />;

  return <Workbench title="五子棋" eyebrow="ExBeam / Strategy" className="strategy-workbench"
    toolbar={<StrategyToolbar onClose={() => { clock.pause(); onClose(); }} onNew={() => { clock.pause(); setNewDialog(true); }} onUndo={undo} canUndo={match.moves.length > 0 && review === null && match.timeout === null}
      onFlip={() => setMatch(s => ({ ...s, flipped: !s.flipped }))} flipped={match.flipped} hints={match.hints} onHints={() => setMatch(s => ({ ...s, hints: !s.hints }))}
      running={clock.running} canRun={!outcome && review === null && !newDialog} onPause={() => clock.running ? clock.pause() : clock.start()}>
      <IconButton label="战术建议" disabled={!canMove} onClick={() => {
        const [r, c] = getBestMove(live.board, 2, live.turn === 0 ? 1 : 2);
        if (r >= 0 && c >= 0) { setHint([c, r]); setNotice(`建议 ${coordinate([c, r], 15)}：基于成五、防守和两层候选搜索，并非必胜点。`); }
      }}><Lightbulb size={17} /></IconButton>
    </StrategyToolbar>}
    status={<><span>自由五子棋 · 无禁手</span><span>{available ? '本机自动存档' : '存储不可用：离开后不能续局'}</span><span>离开页面自动暂停</span></>}>
    <div className="strategy-layout">
      <main className="strategy-arena">
        {notice && <div className="wb-notice strategy-notice" role="status"><span>{notice}</span><IconButton label="关闭提示" onClick={() => setNotice('')}><X size={14} /></IconButton></div>}
        <div className="strategy-board-column">
          <div className="strategy-match-state"><div><strong role="status" aria-live="polite">{status}</strong><small>{match.settings.mode === 'local' ? '本地双人' : `本机电脑 · ${match.settings.level} 级`}</small></div>
            {!clock.running && !outcome && review === null && <button type="button" className="wb-button is-primary" onClick={clock.start}><Play size={15} />{match.moves.length ? '继续' : '开始对局'}</button>}
            {review !== null && <button type="button" className="wb-button" onClick={() => goTo(match.moves.length)}>回到实战</button>}
          </div>
          {clockRow(match.flipped ? 0 : 1)}
          <StoneBoard board={view.board} last={match.moves[(review ?? match.moves.length) - 1] || null} flipped={match.flipped} legal={legal} onPoint={place} disabled={!canMove} winning={view.line} hint={review === null ? hint : null} name="五子棋棋盘" />
          {clockRow(match.flipped ? 1 : 0)}
        </div>
      </main>
      <aside className="strategy-aside">
        {outcome && <div className="strategy-result">{outcome}</div>}
        <div className="strategy-summary"><span>已落 <b>{match.moves.length}</b> 手</span><span>空位 <b>{225 - match.moves.length}</b></span></div>
        {match.settings.mode === 'computer' && <p className="strategy-caption">{LEVELS[match.settings.level - 1]} 本机启发式对手，无段位或等级分承诺。</p>}
        <details className="strategy-rule"><summary>对局规则</summary><p>15 路自由规则，黑方先行，横、竖或斜线连续五子及以上获胜。双方无三三、四四与长连禁手；满盘无胜方为和棋。</p><p>本地双人悔一手；电脑模式退回到你的上一回合。已消耗用时不返还；超时终局不可悔棋。</p></details>
        <ReviewPanel labels={match.moves.map((point, i) => `${i % 2 === 0 ? '黑' : '白'} ${coordinate(point, 15)}`)} index={review ?? match.moves.length} onChange={goTo} />
      </aside>
    </div>
    {newDialog && <GobangNewDialog settings={match.settings} onClose={() => setNewDialog(false)} onConfirm={settings => {
      clock.pause();
      setMatch({ ...newGobangMatch(settings), flipped: settings.mode === 'computer' && settings.human === 1 });
      setNewDialog(false);
      setReview(null);
      setHint(null);
      setNotice('新对局已就绪，计时已暂停。');
    }} />}
  </Workbench>;
}

function GobangNewDialog({ settings, onClose, onConfirm }: { settings: MatchSettings; onClose: () => void; onConfirm: (settings: MatchSettings) => void }) {
  const [value, setValue] = useState(settings);
  return <StrategyDialog title="新对局" onClose={onClose}><form onSubmit={event => { event.preventDefault(); onConfirm(value); }}>
    <p>开始新局将替换当前对局及棋谱。</p>
    <MatchSettingsFields value={value} onChange={setValue} colors={COLORS} difficultyText={LEVELS} />
    <footer><button type="button" className="wb-button" onClick={onClose}>取消</button><button type="submit" className="wb-button is-primary">确认新局</button></footer>
  </form></StrategyDialog>;
}
