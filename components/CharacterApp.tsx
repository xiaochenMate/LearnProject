import React, { useState } from 'react';
import { ArrowRight, BookOpen, Check, Lightbulb, RotateCcw, Volume2, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { PRACTICE_CHARACTERS } from '../lib/practiceData';
import { answerCharacter, characterQuestion, initialCharacter, validCharacter } from '../lib/practiceSessions';
import { shuffle } from '../lib/practiceCore';
import { usePracticeSpeech } from '../lib/practiceHooks';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

const CharacterApp: React.FC<{ onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [state, setState, storage] = useModuleState('exbeam.practice.character.v1', initialCharacter, validCharacter);
  const [view, setView] = useState<'build' | 'library' | 'review'>('build');
  const [search, setSearch] = useState('');
  const [radical, setRadical] = useState('all');
  const speech = usePracticeSpeech();
  const item = PRACTICE_CHARACTERS.find(c => c.result === state.target)!;
  const entries = PRACTICE_CHARACTERS.filter(c => (radical === 'all' || c.radical === radical) && (view !== 'review' || state.wrong.includes(c.result)) && `${c.result}${c.name}${c.pinyin}${c.meaning}${c.examples.join('')}`.toLowerCase().includes(search.toLowerCase().trim()));
  const next = (target?: string) => {
    const pool = PRACTICE_CHARACTERS.filter(c => (radical === 'all' || c.radical === radical) && c.result !== state.target);
    const fresh = pool.filter(c => !state.learned.includes(c.result));
    const chosen = target || shuffle(fresh.length ? fresh : pool)[0]?.result || item.result;
    setState(s => ({ ...s, ...characterQuestion(chosen) })); setView('build');
  };
  const choose = (candidate: string) => {
    if (state.solved) return;
    const nextState = answerCharacter(state, candidate); setState(nextState);
    if (nextState.solved) onDiscover?.({ key: `character-${item.result}`, kind: 'challenge', title: `组出了“${item.result}”`, detail: `${item.radical}与${item.candidate}组成${item.result}（${item.pinyin}）。${item.meaning}` });
  };
  return <Workbench title="汉字构造所" eyebrow="LANGUAGE / 01" className="practice practice-character" toolbar={<>
    <IconButton label="朗读当前汉字" disabled={!speech.available || !state.solved} onClick={() => speech.speak(item.result)}><Volume2 size={18} /></IconButton>
    <IconButton label="关闭汉字练习" onClick={onClose}><X size={18} /></IconButton>
  </>} status={<><span>{storage ? '进度保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>{speech.notice || (!speech.available ? '此浏览器无语音朗读' : `${PRACTICE_CHARACTERS.length} 个常用字`)}</span></>}>
    <nav className="wb-tabs" aria-label="汉字视图">{([['build', '部件组字'], ['library', '汉字字库'], ['review', `错字复习 ${state.wrong.length}`]] as const).map(([id, text]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{text}</button>)}</nav>
    <div className="wb-grid"><aside className="wb-sidebar">
      <label className="wb-field">偏旁<select value={radical} onChange={e => setRadical(e.target.value)}><option value="all">全部偏旁</option>{[...new Map(PRACTICE_CHARACTERS.map(c => [c.radical, c.name])).entries()].map(([r, name]) => <option key={r} value={r}>{r} · {name}</option>)}</select></label>
      <div className="practice-stack"><span className="wb-muted">已组出的不同汉字</span><strong className="practice-count">{state.learned.length} / {PRACTICE_CHARACTERS.length}</strong><progress className="practice-progress" value={state.learned.length} max={PRACTICE_CHARACTERS.length} aria-label="汉字学习进度" /></div>
      {state.legacyLearned > 0 && <small className="wb-muted">旧版累计 {state.legacyLearned} 次已保留，未计入去重字数。</small>}
      <div className="wb-list">{[...new Set(PRACTICE_CHARACTERS.map(c => c.radical))].map(r => <div key={r} className="practice-meta"><span>{r} 部</span><span>{PRACTICE_CHARACTERS.filter(c => c.radical === r && state.learned.includes(c.result)).length} / {PRACTICE_CHARACTERS.filter(c => c.radical === r).length}</span></div>)}</div>
    </aside><main className="wb-main">{view === 'build' ? <>
      <div className="practice-meta"><span>{item.name} · {item.level}</span><span>{item.pinyin}</span></div>
      <div className="practice-stage"><p className="practice-prompt">{item.meaning}</p><div className="practice-equation"><span className="practice-glyph">{item.radical}</span><span>+</span><span className="practice-glyph">{state.selection || '?'}</span>{state.solved && <><span>=</span><span className="practice-glyph">{item.result}</span></>}</div>{state.hinted && <p className="wb-muted">组词线索：{item.examples[0].split(item.result).join('□')}</p>}</div>
      <div className="practice-choices" aria-label="选择组字部件">{state.options.map(c => <button key={c} aria-label={`选择部件${c}`} aria-pressed={state.selection === c} disabled={state.solved} onClick={() => choose(c)}>{c}</button>)}</div>
      {state.selection && <div className={`practice-feedback ${state.solved ? '' : 'is-wrong'}`} role="status">{state.solved ? <><strong className="practice-good">组合正确：{item.result} · {item.pinyin}</strong><p>{item.meaning}</p><p>{item.examples.join(' / ')}</p></> : <p>这个部件不是本题的答案。结合字音和字义，再试一次。</p>}</div>}
      <div className="practice-actions"><button className="wb-button" disabled={state.hinted || state.solved} onClick={() => setState(s => ({ ...s, hinted: true }))}><Lightbulb size={16} />组词线索</button><button className="wb-button is-primary" onClick={() => next()}><ArrowRight size={16} />下一字</button><button className="wb-button" onClick={() => setView('library')}><BookOpen size={16} />查字库</button></div>
    </> : <>
      <label className="wb-field">搜索汉字、拼音或释义<input value={search} onChange={e => setSearch(e.target.value)} placeholder="汉字 / pinyin" /></label>
      {entries.length ? <div className="practice-catalog">{entries.map(c => <article key={c.result} className="practice-entry"><div className="practice-entry-head"><span className="practice-glyph">{c.result}</span><IconButton label={`朗读${c.result}`} disabled={!speech.available} onClick={() => speech.speak(c.result)}><Volume2 size={17} /></IconButton></div><strong>{c.pinyin}</strong><small className="wb-muted">{c.radical} + {c.candidate} · {c.name}</small><p>{c.meaning}</p><small>{c.examples.join(' / ')}</small><button className="wb-button" onClick={() => next(c.result)}><RotateCcw size={15} />{state.learned.includes(c.result) ? '再练一次' : '练这个字'}</button></article>)}</div> : <div className="wb-empty">{view === 'review' ? '没有待复习的错字。' : '没有找到匹配的汉字。'}</div>}
    </>}</main></div>
  </Workbench>;
};
export default CharacterApp;
