import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, RotateCcw, Shuffle, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { HISTORY_ERAS, HISTORY_SOURCES, PRACTICE_HISTORY } from '../lib/practiceData';
import { checkHistory, historyQuestion, initialHistory, validHistory, type Era } from '../lib/practiceSessions';
import { moveItem, yearLabel } from '../lib/practiceCore';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

const HistorySortingApp: React.FC<{ onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [state, setState, storage] = useModuleState('exbeam.practice.history.v1', initialHistory, validHistory);
  const [view, setView] = useState<'sort' | 'review'>('sort');
  const [dragging, setDragging] = useState<number | null>(null);
  const events = state.order.map(id => PRACTICE_HISTORY.find(e => e.id === id)!);
  const expected = [...events].sort((a, b) => a.year - b.year);
  const next = (era = state.era, count = state.count, review = false) => {
    if (era === 'Ancient') count = Math.min(4, count);
    setState(s => ({ ...s, era, count, order: historyQuestion(era, count, review ? s.wrong : []), result: 'pending' })); setView('sort');
  };
  const move = (from: number, to: number) => setState(s => s.result === 'correct' ? s : { ...s, order: moveItem(s.order, from, to), result: 'pending' });
  const submit = () => {
    const result = checkHistory(state); setState(result);
    if (state.result !== 'correct' && result.result === 'correct') onDiscover?.({ key: `history-${expected.map(e => e.id).join('-')}`, kind: 'challenge', title: `还原${events.length}个历史事件的顺序`, detail: expected.map(e => `${yearLabel(e.year, e.approximate)} ${e.name}`).join(' → ') });
  };
  return <Workbench title="历史时间线" eyebrow="HISTORY / 02" className="practice practice-history" toolbar={<IconButton label="关闭历史练习" onClick={onClose}><X size={18} /></IconButton>} status={<><span>{storage ? '排序和复习进度保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>按年代从早到晚</span></>}>
    <nav className="wb-tabs" aria-label="历史视图"><button aria-pressed={view === 'sort'} onClick={() => setView('sort')}>排序挑战</button><button aria-pressed={view === 'review'} onClick={() => setView('review')}>史实复习 {state.wrong.length}</button></nav>
    <div className="wb-grid"><aside className="wb-sidebar">
      <label className="wb-field">历史分期<select value={state.era} onChange={e => next(e.target.value as Era)}>{Object.entries(HISTORY_ERAS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="wb-field">每轮事件<select value={state.count} onChange={e => next(state.era, Number(e.target.value))}><option value="3">3个 · 热身</option><option value="4">4个 · 标准</option><option value="6" disabled={state.era === 'Ancient'}>6个 · 挑战</option></select></label>
      <div className="practice-stack"><span className="wb-muted">已掌握不同事件</span><strong className="practice-count">{state.learned.length} / {PRACTICE_HISTORY.length}</strong><progress className="practice-progress" value={state.learned.length} max={PRACTICE_HISTORY.length} aria-label="历史掌握进度" /></div>
      <small className="wb-muted">完成 {state.completed.length} 组不同排序 · 已提交 {state.attempts} 次</small>
      <details><summary>年代参考</summary><div className="practice-stack">{HISTORY_SOURCES.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}</div></details>
    </aside><main className="wb-main">{view === 'sort' ? <>
      <div className="practice-meta"><span>{HISTORY_ERAS[state.era]} · {events.length}个事件</span><span>最早 → 最晚</span></div>
      <ol className="practice-order" aria-label="待排序历史事件">{events.map((event, i) => <li key={event.id} draggable={state.result !== 'correct'} onDragStart={e => { setDragging(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); }} onDragEnd={() => setDragging(null)} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragging !== null) move(dragging, i); setDragging(null); }} className={state.result === 'pending' ? '' : event.id === expected[i].id ? 'is-correct' : 'is-incorrect'}>
        <span className="wb-muted">{i + 1}</span><div><strong>{event.name}</strong>{state.result !== 'pending' && <small>{yearLabel(event.year, event.approximate)}</small>}</div><div className="practice-actions"><IconButton label={`上移${event.name}`} disabled={i === 0 || state.result === 'correct'} onClick={() => move(i, i - 1)}><ArrowUp size={16} /></IconButton><IconButton label={`下移${event.name}`} disabled={i === events.length - 1 || state.result === 'correct'} onClick={() => move(i, i + 1)}><ArrowDown size={16} /></IconButton></div>
      </li>)}</ol>
      <div className="practice-actions"><button className="wb-button is-primary" disabled={state.result === 'correct'} onClick={submit}><Check size={16} />核对顺序</button><button className="wb-button" onClick={() => next()}><Shuffle size={16} />换一组</button></div>
      {state.result !== 'pending' && <section className={`practice-feedback ${state.result === 'wrong' ? 'is-wrong' : ''}`} role="status"><strong>{state.result === 'correct' ? '时间线已还原' : '还有事件位置不对，正确时间线如下'}</strong><ol className="wb-list">{expected.map(e => <li key={e.id}><strong>{yearLabel(e.year, e.approximate)} · {e.name}</strong><p>{e.description}</p><small className="wb-muted">{e.significance}</small></li>)}</ol>{state.result === 'wrong' && <button className="wb-button" onClick={() => setState(s => ({ ...s, result: 'pending' }))}><RotateCcw size={16} />调整顺序再试</button>}</section>}
    </> : <>
      <div className="practice-meta"><span>需要巩固的事件</span><button className="wb-button" disabled={!state.wrong.length} onClick={() => next('mixed', state.wrong.length > 4 ? 6 : state.wrong.length === 4 ? 4 : 3, true)}><RotateCcw size={16} />错题重排</button></div>
      {state.wrong.length ? <div className="wb-list">{PRACTICE_HISTORY.filter(e => state.wrong.includes(e.id)).sort((a, b) => a.year - b.year).map(e => <article key={e.id} className="practice-stack"><strong>{yearLabel(e.year, e.approximate)} · {e.name}</strong><p>{e.description}</p><small className="wb-muted">{e.significance}</small></article>)}</div> : <div className="wb-empty">还没有待复习的历史事件。</div>}
    </>}</main></div>
  </Workbench>;
};
export default HistorySortingApp;
