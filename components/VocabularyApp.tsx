import React, { useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Check, Eye, Play, RotateCcw, Volume2, X } from 'lucide-react';
import { Workbench, IconButton } from './ModuleWorkbench';
import { useModuleState } from '../lib/moduleSession';
import { PRACTICE_WORDS, WORD_CATEGORIES, type PracticeWord } from '../lib/practiceData';
import { initialVocabulary, validVocabulary, type VocabularySession } from '../lib/practiceSessions';
import { newRunId, normalizeWord, seededRandom, shuffle, updateWordProgress } from '../lib/practiceCore';
import { usePracticeSpeech } from '../lib/practiceHooks';
import type { ExperienceEvidence } from '../lib/explorerStore';
import './practice.css';

function correctAnswer(word: PracticeWord, kind: 'meaning' | 'spelling', answer: string) { return kind === 'spelling' ? normalizeWord(answer) === normalizeWord(word.word) : answer === word.definition; }
const VocabularyApp: React.FC<{ onClose: () => void; userEmail?: string; onDiscover?: (evidence: ExperienceEvidence) => void }> = ({ onClose, onDiscover }) => {
  const [state, setState, storage] = useModuleState('exbeam.practice.vocabulary.v1', initialVocabulary, validVocabulary);
  const [view, setView] = useState<'learn' | 'test' | 'wrong' | 'library'>(() => state.test ? 'test' : 'learn');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'meaning' | 'spelling'>(() => state.test?.kind || 'meaning');
  const speech = usePracticeSpeech();
  const guard = useRef('');
  const reported = useRef('');
  const categoryWords = PRACTICE_WORDS.filter(w => w.category === state.category);
  const word = PRACTICE_WORDS.find(w => w.id === state.current)!;
  const wrongWords = PRACTICE_WORDS.filter(w => state.progress[w.id]?.wrong);
  const seen = PRACTICE_WORDS.filter(w => state.progress[w.id]?.seen).length;
  const mastered = PRACTICE_WORDS.filter(w => (state.progress[w.id]?.correct || 0) >= 2).length;
  const due = categoryWords.filter(w => state.progress[w.id]?.due <= Date.now()).length;
  const test = state.test;
  const testWord = test && test.index < test.ids.length ? PRACTICE_WORDS.find(w => w.id === test.ids[test.index])! : null;
  const choices = useMemo(() => { if (!testWord || !test) return []; const random = seededRandom(`${test.id}-${testWord.id}`); return shuffle([testWord.definition, ...shuffle(PRACTICE_WORDS.filter(w => w.id !== testWord.id), random).slice(0, 3).map(w => w.definition)], random); }, [testWord?.id, test?.id]);
  const results = test ? test.ids.filter(id => Object.prototype.hasOwnProperty.call(test.answers, String(id))).map(id => { const w = PRACTICE_WORDS.find(w => w.id === id)!; return { word: w, response: test.answers[id], correct: correctAnswer(w, test.kind, test.answers[id]) }; }) : [];
  const selectWord = (id: number) => { setState(s => ({ ...s, current: id, revealed: false })); setView('learn'); };
  const nextWord = () => {
    const pool = categoryWords.filter(w => w.id !== state.current);
    const sorted = [...pool].sort((a, b) => (state.progress[a.id]?.due || 0) - (state.progress[b.id]?.due || 0));
    if (sorted[0]) setState(s => ({ ...s, current: sorted[0].id, revealed: false }));
  };
  const selfRate = (known: boolean) => {
    if (!state.revealed) return;
    const updated: VocabularySession['progress'] = { ...state.progress, [word.id]: updateWordProgress(state.progress[word.id], known, false) };
    const next = categoryWords.filter(w => w.id !== word.id).sort((a, b) => (updated[a.id]?.due || 0) - (updated[b.id]?.due || 0))[0];
    setState(s => ({ ...s, progress: updated, current: next?.id || s.current, revealed: false }));
    onDiscover?.({ key: `vocabulary-study-${word.id}`, kind: 'note', title: `学习了${word.word}`, detail: `${word.word}：${word.definition}。自评${known ? '熟悉' : '待复习'}，不代表测验成绩。` });
  };
  const startTest = (wrong = false) => {
    const pool = wrong ? wrongWords.filter(w => w.category === state.category) : [...categoryWords].sort((a, b) => (state.progress[a.id]?.due || 0) - (state.progress[b.id]?.due || 0));
    if (!pool.length) return;
    const ids = shuffle(pool.slice(0, 10)).map(w => w.id);
    guard.current = ''; setState(s => ({ ...s, test: { id: newRunId(), ids, index: 0, answers: {}, input: '', submitted: false, kind } })); setView('test');
  };
  const answer = () => {
    if (!test || !testWord || test.submitted || !test.input.trim() || guard.current === `${test.id}-${test.index}`) return;
    guard.current = `${test.id}-${test.index}`;
    const correct = correctAnswer(testWord, test.kind, test.input);
    setState(s => !s.test || s.test.submitted ? s : ({ ...s, progress: { ...s.progress, [testWord.id]: updateWordProgress(s.progress[testWord.id], correct, true) }, test: { ...s.test, answers: { ...s.test.answers, [testWord.id]: s.test.input.trim() }, submitted: true } }));
  };
  const advance = () => {
    if (!test || !test.submitted) return;
    const finished = test.index + 1 >= test.ids.length;
    if (finished && reported.current !== test.id) {
      reported.current = test.id;
      const correct = results.filter(r => r.correct).length;
      if (correct > 0) onDiscover?.({ key: `vocabulary-test-${test.id}`, kind: 'challenge', title: `完成${WORD_CATEGORIES[state.category]}测验`, detail: `${test.kind === 'spelling' ? '拼写' : '词义'}测验答对${correct}/${test.ids.length}题，错词已进入本机复习。` });
    }
    setState(s => !s.test || !s.test.submitted ? s : { ...s, test: { ...s.test, index: s.test.index + 1, input: '', submitted: false } });
  };
  const list = (view === 'wrong' ? wrongWords.filter(w => w.category === state.category) : categoryWords).filter(w => `${w.word} ${w.definition} ${w.phonetic}`.toLowerCase().includes(query.toLowerCase().trim()));
  return <Workbench title="词汇航线" eyebrow="VOCABULARY / 06" className="practice practice-vocabulary" toolbar={<>
    <IconButton label="朗读当前单词" disabled={!speech.available || (view === 'test' && test?.kind === 'spelling' && !test.submitted)} onClick={() => speech.speak(view === 'test' && testWord ? testWord.word : word.word, 'en-GB')}><Volume2 size={18} /></IconButton><IconButton label="关闭单词练习" onClick={onClose}><X size={18} /></IconButton>
  </>} status={<><span>{storage ? '学习与错词保存在本机' : '本机存储不可用，本次仍可练习'}</span><span>{speech.notice || (!speech.available ? '此浏览器无发音功能' : `${PRACTICE_WORDS.length}个本地词条 · 自评不计入测验成绩`)}</span></>}>
    <nav className="wb-tabs" aria-label="词汇视图">{([['learn', '学习'], ['test', '测验'], ['wrong', `错词 ${wrongWords.length}`], ['library', '词库']] as const).map(([id, label]) => <button key={id} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}</nav>
    <div className="wb-grid"><aside className="wb-sidebar">
      <label className="wb-field">词汇分类<select value={state.category} disabled={!!test && test.index < test.ids.length} onChange={e => { const category = e.target.value as VocabularySession['category']; setState(s => ({ ...s, category, current: PRACTICE_WORDS.find(w => w.category === category)!.id, revealed: false })); }}>{Object.entries(WORD_CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <div className="practice-stack"><span className="wb-muted">已学 / 全部词条</span><strong className="practice-count">{seen} / {PRACTICE_WORDS.length}</strong><progress className="practice-progress" value={seen} max={PRACTICE_WORDS.length} aria-label="单词学习进度" /><small className="wb-muted">连续测对两次 {mastered} 个 · 本分类到期 {due} 个</small></div>
      <label className="wb-field">测验题型<select value={kind} disabled={!!test && test.index < test.ids.length} onChange={e => setKind(e.target.value as 'meaning' | 'spelling')}><option value="meaning">看单词选词义</option><option value="spelling">看词义拼单词</option></select></label>
      {test && test.index < test.ids.length ? <div className="practice-stack"><button className="wb-button" onClick={() => setView('test')}><Play size={16} />继续测验 {test.index + 1}/{test.ids.length}</button><button className="wb-button" onClick={() => { setState(s => !s.test ? s : { ...s, test: { ...s.test, index: s.test.ids.length, input: '', submitted: false } }); setView('test'); }}>结束本次测验</button></div> : <button className="wb-button" onClick={() => startTest()}><Play size={16} />开始10词测验</button>}
    </aside><main className="wb-main">{view === 'learn' ? <>
      <div className="practice-meta"><span>{WORD_CATEGORIES[word.category]}</span><span>{state.progress[word.id]?.seen ? '已学' : '新词'}</span></div>
      <section className="practice-stage"><h3 className="practice-word">{word.word}</h3><p className="wb-muted">{word.phonetic}</p><div className="practice-actions"><button className="wb-button" disabled={!speech.available} onClick={() => speech.speak(word.word, 'en-GB')}><Volume2 size={17} />发音</button><button className="wb-button" onClick={() => setState(s => ({ ...s, revealed: !s.revealed }))}><Eye size={17} />{state.revealed ? '隐藏释义' : '查看释义'}</button></div>{state.revealed && <div className="practice-stack"><strong className="practice-prompt">{word.definition}</strong><p>{word.example}</p><p className="wb-muted">{word.translation}</p><button className="wb-button" disabled={!speech.available} onClick={() => speech.speak(word.example, 'en-GB')}><Volume2 size={16} />例句发音</button></div>}</section>
      <div className="practice-actions"><button className="wb-button" disabled={!state.revealed} onClick={() => selfRate(false)}><RotateCcw size={16} />不熟悉 · 1小时后复习</button><button className="wb-button is-primary" disabled={!state.revealed} onClick={() => selfRate(true)}><Check size={16} />熟悉 · 明天复习</button><IconButton label="下一个单词" onClick={nextWord}><ArrowRight size={18} /></IconButton></div>
    </> : view === 'test' ? !test ? <>
      <div className="practice-stage"><h3 className="practice-word">{word.word}</h3><p className="wb-muted">{kind === 'meaning' ? '选择正确的中文词义' : '根据中文词义拼写英文单词'}</p><button className="wb-button is-primary" onClick={() => startTest()}><Play size={17} />开始测验</button></div>
    </> : testWord ? <>
      <div className="practice-meta"><span>{test.kind === 'meaning' ? '词义选择' : '拼写测验'}</span><span>{test.index + 1} / {test.ids.length}</span></div><progress className="practice-progress" value={test.index} max={test.ids.length} aria-label="测验进度" />
      <form className="practice-stage" onSubmit={e => { e.preventDefault(); test.submitted ? advance() : answer(); }}><h3 className="practice-word">{test.kind === 'meaning' ? testWord.word : testWord.definition}</h3>{test.kind === 'meaning' ? <div className="practice-options">{choices.map((choice, i) => <button key={choice} type="button" className={`practice-option ${test.input === choice ? 'is-selected' : ''} ${test.submitted && choice === testWord.definition ? 'is-correct' : ''}`} aria-pressed={test.input === choice} disabled={test.submitted} onClick={() => setState(s => s.test ? { ...s, test: { ...s.test, input: choice } } : s)}><span>{String.fromCharCode(65 + i)}</span><span>{choice}</span></button>)}</div> : <input className="practice-answer" aria-label="英文拼写" value={test.input} autoComplete="off" autoCapitalize="off" spellCheck={false} maxLength={60} disabled={test.submitted} onChange={e => { const value = e.target.value; setState(s => s.test ? { ...s, test: { ...s.test, input: value } } : s); }} />}<button className="wb-button is-primary" type="submit" disabled={!test.submitted && !test.input.trim()}>{test.submitted ? <><ArrowRight size={16} />{test.index + 1 === test.ids.length ? '查看结果' : '下一词'}</> : <><Check size={16} />提交答案</>}</button></form>
      {test.submitted && <div className={`practice-feedback ${correctAnswer(testWord, test.kind, test.answers[testWord.id] || '') ? '' : 'is-wrong'}`} role="status"><strong>{correctAnswer(testWord, test.kind, test.answers[testWord.id] || '') ? '回答正确' : '已加入错词复习'}</strong><p>{testWord.word} · {testWord.definition}</p><p>{testWord.example}</p></div>}
    </> : <>
      <h3>本轮测验结果</h3><div className="wb-stats"><div className="wb-stat"><span>答对</span><strong>{results.filter(r => r.correct).length} / {results.length}</strong></div><div className="wb-stat"><span>正确率</span><strong>{results.length ? Math.round(results.filter(r => r.correct).length / results.length * 100) : 0}%</strong></div></div><div className="practice-actions"><button className="wb-button is-primary" onClick={() => startTest()}><Play size={16} />新测验</button><button className="wb-button" disabled={!wrongWords.some(w => w.category === state.category)} onClick={() => startTest(true)}><RotateCcw size={16} />错词再测</button></div><div className="wb-list">{results.map(r => <div key={r.word.id} className="practice-stack"><strong className={r.correct ? 'practice-good' : 'practice-bad'}>{r.word.word} · {r.word.definition}</strong><small>你的答案：{r.response}</small><p className="wb-muted">{r.word.example}</p></div>)}</div>
    </> : <>
      <label className="wb-field">搜索单词、音标或词义<input value={query} onChange={e => setQuery(e.target.value)} placeholder="word / 中文词义" /></label>
      {view === 'wrong' && <button className="wb-button" disabled={!list.length || !!test && test.index < test.ids.length} onClick={() => startTest(true)}><RotateCcw size={16} />错词再测</button>}
      {list.length ? <div className="practice-catalog">{list.map(w => <article key={w.id} className="practice-entry"><div className="practice-entry-head"><strong>{w.word}</strong><IconButton label={`朗读${w.word}`} disabled={!speech.available} onClick={() => speech.speak(w.word, 'en-GB')}><Volume2 size={17} /></IconButton></div><small className="wb-muted">{w.phonetic}</small><p>{w.definition}</p><p>{w.example}</p><small className="wb-muted">{w.translation}</small><small>{state.progress[w.id]?.seen ? state.progress[w.id]?.wrong ? '待复习' : `连续测对 ${state.progress[w.id].correct} 次` : '未学习'}</small><button className="wb-button" onClick={() => selectWord(w.id)}><BookOpen size={16} />学习这个词</button></article>)}</div> : <div className="wb-empty">{query ? '没有找到匹配词条。' : '当前分类没有错词。'}</div>}
    </>}</main></div>
  </Workbench>;
};
export default VocabularyApp;
