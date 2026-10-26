import React, { useState } from 'react';
import { ArrowRight, Bookmark, Check, Lightbulb, RotateCcw, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { PRACTICE_PUZZLES, PUZZLE_CATEGORIES } from '../lib/practiceData';
import { checkPuzzle, initialPuzzle, openPuzzle, validPuzzle } from '../lib/practiceSessions';
import { shuffle, unique } from '../lib/practiceCore';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

const levels = { EASY: '入门', MEDIUM: '进阶', HARD: '挑战' };
const BrainTeaseApp: React.FC<{ onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [state, setState, storage] = useModuleState('exbeam.practice.puzzle.v1', initialPuzzle, validPuzzle);
  const [view, setView] = useState<'play' | 'saved' | 'review'>('play');
  const [search, setSearch] = useState('');
  const current = PRACTICE_PUZZLES.find(p => p.id === state.current)!;
  const pool = PRACTICE_PUZZLES.filter(p => (state.category === 'all' || p.category === state.category) && (state.difficulty === 'all' || p.difficulty === state.difficulty));
  const entries = pool.filter(p => (view === 'saved' ? state.saved.includes(p.id) : view === 'review' ? state.wrong.includes(p.id) : true) && p.question.includes(search.trim()));
  const open = (id: string, retry = false) => {
    setState(s => { const opened = openPuzzle(s, id); return retry ? { ...opened, selected: '', hints: 0, submitted: false } : opened; }); setView('play');
  };
  const next = () => {
    const available = pool.filter(p => p.id !== current.id), fresh = available.filter(p => !state.solved.includes(p.id) && !state.drafts[p.id]?.submitted);
    const chosen = shuffle(fresh.length ? fresh : available)[0]; if (chosen) open(chosen.id);
  };
  const changeFilter = (field: 'category' | 'difficulty', value: string) => setState(s => {
    const nextState = { ...s, [field]: value };
    const chosen = PRACTICE_PUZZLES.find(p => (nextState.category === 'all' || p.category === nextState.category) && (nextState.difficulty === 'all' || p.difficulty === nextState.difficulty));
    return chosen ? openPuzzle(nextState, chosen.id) : nextState;
  });
  const submit = () => {
    const nextState = checkPuzzle(state); setState(nextState);
    if (!state.submitted && nextState.submitted && state.selected === current.answer) onDiscover?.({ key: `puzzle-${current.id}`, kind: 'challenge', title: '解开一道思维谜题', detail: `${current.question} 答案：${current.answer}。${state.hints ? `使用${state.hints}条提示。` : '独立作答。'}` });
  };
  const bookmark = () => setState(s => ({ ...s, saved: s.saved.includes(current.id) ? s.saved.filter(id => id !== current.id) : unique([...s.saved, current.id]) }));
  return <Workbench title="思维谜题" eyebrow="REASONING / 05" className="practice practice-brain" toolbar={<><IconButton label={state.saved.includes(current.id) ? '取消收藏此题' : '收藏此题'} aria-pressed={state.saved.includes(current.id)} onClick={bookmark}><Bookmark size={18} fill={state.saved.includes(current.id) ? 'currentColor' : 'none'} /></IconButton><IconButton label="关闭谜题练习" onClick={onClose}><X size={18} /></IconButton></>} status={<><span>{storage ? '作答、收藏与复习保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>{PRACTICE_PUZZLES.length}道本地谜题</span></>}>
    <nav className="wb-tabs" aria-label="谜题视图">{([['play', '解题'], ['saved', `收藏 ${state.saved.length}`], ['review', `错题 ${state.wrong.length}`]] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</nav>
    <div className="wb-grid"><aside className="wb-sidebar">
      <label className="wb-field">分类<select value={state.category} onChange={e => changeFilter('category', e.target.value)}>{Object.entries(PUZZLE_CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="wb-field">难度<select value={state.difficulty} onChange={e => changeFilter('difficulty', e.target.value)}><option value="all">全部难度</option>{Object.entries(levels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div className="practice-stack"><span className="wb-muted">解开不同谜题</span><strong className="practice-count">{state.solved.length} / {PRACTICE_PUZZLES.length}</strong><progress className="practice-progress" value={state.solved.length} max={PRACTICE_PUZZLES.length} aria-label="谜题进度" /></div>
      <div className="wb-list">{pool.map(p => <div className="practice-meta" key={p.id}><button className="wb-button" onClick={() => open(p.id)}>{p.id.replace('BT_', '#')}</button><span>{state.solved.includes(p.id) ? '已解' : state.wrong.includes(p.id) ? '待复习' : '待解'}</span></div>)}</div>
    </aside><main className="wb-main">{view === 'play' ? pool.length ? <>
      <div className="practice-meta"><span>{PUZZLE_CATEGORIES[current.category]} · {levels[current.difficulty]}</span><span>{current.id.replace('BT_', '#')}</span></div>
      <div className="practice-stage"><h3 className="practice-prompt">{current.question}</h3></div>
      <div className="practice-options" aria-label="谜题答案选项">{state.options.map((option, i) => <button className={`practice-option ${state.selected === option ? 'is-selected' : ''} ${state.submitted && option === current.answer ? 'is-correct' : state.submitted && state.selected === option ? 'is-incorrect' : ''}`} key={option} aria-pressed={state.selected === option} disabled={state.submitted} onClick={() => setState(s => ({ ...s, selected: option }))}><span>{String.fromCharCode(65 + i)}</span><span>{option}</span></button>)}</div>
      {current.hints.slice(0, state.hints).map((hint, i) => <p key={hint} className="wb-notice">提示 {i + 1}：{hint}</p>)}
      <div className="practice-actions"><button className="wb-button is-primary" disabled={!state.selected || state.submitted} onClick={submit}><Check size={16} />提交答案</button><button className="wb-button" disabled={state.hints >= current.hints.length || state.submitted} onClick={() => setState(s => ({ ...s, hints: s.hints + 1 }))}><Lightbulb size={16} />提示 {state.hints}/{current.hints.length}</button><button className="wb-button" disabled={pool.length < 2} onClick={next}><ArrowRight size={16} />下一题</button></div>
      {state.submitted && <section className={`practice-feedback ${state.selected !== current.answer ? 'is-wrong' : ''}`} role="status"><strong>{state.selected === current.answer ? '答对了' : `正确答案：${current.answer}`}</strong><p>{current.explanation}</p>{state.selected !== current.answer && <button className="wb-button" onClick={() => open(current.id, true)}><RotateCcw size={16} />重新作答</button>}</section>}
    </> : <div className="wb-empty">这一分类与难度组合暂无题目，请调整筛选。</div> : <>
      <label className="wb-field">搜索题目<input value={search} onChange={e => setSearch(e.target.value)} placeholder="输入题目关键词" /></label>
      {entries.length ? <div className="practice-catalog">{entries.map(p => <article className="practice-entry" key={p.id}><small className="wb-muted">{PUZZLE_CATEGORIES[p.category]} · {levels[p.difficulty]}</small><p>{p.question}</p><button className="wb-button" onClick={() => open(p.id, view === 'review')}><RotateCcw size={16} />{view === 'review' ? '重新作答' : '打开题目'}</button></article>)}</div> : <div className="wb-empty">{search || state.category !== 'all' || state.difficulty !== 'all' ? '当前筛选没有匹配的题目。' : view === 'saved' ? '尚未收藏谜题。' : '没有待复习的错题。'}</div>}
    </>}</main></div>
  </Workbench>;
};
export default BrainTeaseApp;
