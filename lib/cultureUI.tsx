import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, Cloud, Eye, History, Info, ListFilter, RotateCcw, Search, Send, Square, Target, Volume2, X } from 'lucide-react';
import { Workbench, IconButton } from '../components/ModuleWorkbench';
import CloudLibrary from '../components/CloudLibrary';
import { cultureLibraryCollection } from './contentLibrary';
import { useModuleState } from './moduleSession';
import type { ExperienceEvidence } from './explorerStore';
import type { CultureBook, CultureUnit } from './cultureContent';
import { allCultureQuestions, questionsForUnit, shuffledIndices, type CultureQuestion } from './culturePractice';
import { cultureStorageKey, cultureUnitLearned, dueCultureQuestions, emptyCultureDraft, filterCultureUnits, loadCultureProgress, submitCultureQuestion, validCultureProgress, type CultureDraft, type CultureProgress, type CultureShelf, type CultureView } from './cultureProgress';
import { useCultureSpeech } from './cultureSpeech';
import { originalCharacterCount } from './cultureOriginal';
import { CultureOriginalReader } from './cultureOriginalUI';
import '../components/culture.css';

export interface CultureAppProps { onClose: () => void; onDiscover?: (evidence: ExperienceEvidence) => void }
const dateLabel = (time: number) => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(time);
const readInitial = (book: CultureBook) => {
  try { return loadCultureProgress(book, window.localStorage); }
  catch { return loadCultureProgress(book); }
};

export function CultureWorkspace({ book, onClose, onDiscover }: CultureAppProps & { book: CultureBook }) {
  const [progress, setProgress, storageAvailable] = useModuleState<CultureProgress>(cultureStorageKey(book), () => readInitial(book), value => validCultureProgress(value, book));
  const latest = useRef(progress);
  latest.current = progress;
  const commit = useCallback((update: (current: CultureProgress) => CultureProgress) => {
    const next = update(latest.current);
    latest.current = next;
    setProgress(next);
  }, [setProgress]);
  const [notice, setNotice] = useState('');
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [cloudLibraryOpen, setCloudLibraryOpen] = useState(false);
  const cloudCollection = cultureLibraryCollection(book.id);
  const readingMain = useRef<HTMLElement>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const questions = useMemo(() => allCultureQuestions(book), [book]);
  const filtered = useMemo(() => filterCultureUnits(book, progress), [book, progress]);
  const due = useMemo(() => dueCultureQuestions(book, progress, now), [book, progress, now]);
  const pinnedPractice = progress.view === 'practice' && questions.some(q => q.id === progress.draft.questionId && q.unitId === progress.selectedId)
    ? book.units.find(unit => unit.id === progress.selectedId) : undefined;
  const readingUnit = filtered.find(unit => unit.id === progress.selectedId) || pinnedPractice || filtered[0];
  const retainedReview = questions.find(q => progress.draftView === 'review' && q.id === progress.draft.questionId && progress.review[q.id]
    && (progress.review[q.id].dueAt <= now || progress.draft.result));
  const reviewQuestion = retainedReview || due[0];
  const unit = progress.view === 'review' ? book.units.find(u => u.id === reviewQuestion?.unitId) : readingUnit;
  const unitQuestions = useMemo(() => unit ? questionsForUnit(book, unit) : [], [book, unit]);
  const question = progress.view === 'review' ? reviewQuestion
    : unitQuestions.find(q => q.id === progress.draft.questionId) || unitQuestions.find(q => !progress.credits.includes(q.id)) || unitQuestions[0];
  const draft = question?.id === progress.draft.questionId ? progress.draft : emptyCultureDraft(question?.id);
  const learned = book.units.filter(item => cultureUnitLearned(book, item, progress)).length;
  const speech = useCultureSpeech(`${book.id}:${progress.view}:${progress.readingScope}:${progress.original.page}:${progress.original.query}:${unit?.id || ''}:${progress.view === 'read' ? '' : question?.id || ''}`);

  useEffect(() => { setSelectedChar(null); setNotice(''); }, [unit?.id, progress.view]);
  useEffect(() => {
    setDirectoryOpen(false);
    readingMain.current?.closest('.wb-content')?.scrollTo({ top: 0 });
  }, [progress.view, progress.readingScope]);
  useEffect(() => {
    if (progress.view === 'review') return;
    if (readingUnit && progress.selectedId !== readingUnit.id) commit(current => ({ ...current, selectedId: readingUnit.id, draft: emptyCultureDraft() }));
  }, [progress.view, progress.selectedId, readingUnit?.id, commit]);
  useEffect(() => {
    if (progress.view !== 'read' && question && progress.draft.questionId !== question.id) commit(current => ({ ...current, draft: emptyCultureDraft(question.id) }));
  }, [progress.view, progress.draft.questionId, question?.id, commit]);

  const switchView = (view: CultureView) => {
    commit(current => ({ ...current, view,
      draft: view === 'read' || view === current.draftView ? current.draft : emptyCultureDraft(),
      draftView: view === 'read' ? current.draftView : view,
    }));
    setNow(Date.now());
  };
  const selectUnit = (id: string) => {
    commit(current => ({ ...current, selectedId: id, draft: emptyCultureDraft() }));
    setDirectoryOpen(false);
    readingMain.current?.closest('.wb-content')?.scrollTo({ top: 0 });
  };
  const setDraft = (update: (current: CultureDraft) => CultureDraft) => {
    if (!question) return;
    commit(current => ({ ...current, draft: update(current.draft.questionId === question.id ? current.draft : emptyCultureDraft(question.id)) }));
  };
  const resetFilters = () => commit(current => ({ ...current, query: '', category: '全部', dynasty: '全部', shelf: 'all' }));
  const publish = (evidence: ExperienceEvidence) => {
    if (!onDiscover) return false;
    try { onDiscover(evidence); return true; }
    catch { setNotice('本机记录已保留，但探索记录暂未写入。'); return false; }
  };
  const submit = (reveal = false) => {
    if (!question) return;
    const before = latest.current;
    const result = submitCultureQuestion(before, question, Date.now(), reveal);
    if (result.state === before) return;
    commit(() => result.state);
    setNow(Date.now());
    if (result.newCredit && unit) publish({
      key: `culture-${question.id}`, kind: 'challenge', title: `${book.title} · ${unit.title} · ${question.label}`,
      detail: `独立答对「${question.label}」。\n${question.explanation}\n来源：${book.source}`,
    });
  };
  const nextQuestion = () => {
    if (!question || !unit) return;
    if (progress.view === 'review') {
      const next = due.find(q => q.id !== question.id);
      if (next) commit(current => ({ ...current, draft: emptyCultureDraft(next.id) }));
      else if (due.some(q => q.id === question.id)) setDraft(() => emptyCultureDraft(question.id));
      else commit(current => ({ ...current, draft: emptyCultureDraft() }));
      return;
    }
    const remaining = unitQuestions.find(q => !progress.credits.includes(q.id) && q.id !== question.id);
    if (remaining) { setDraft(() => emptyCultureDraft(remaining.id)); return; }
    if (!progress.credits.includes(question.id)) { setDraft(() => emptyCultureDraft(question.id)); return; }
    const index = filtered.findIndex(u => u.id === unit.id);
    const ordered = [...filtered.slice(index + 1), ...filtered.slice(0, index + 1)];
    const next = ordered.find(u => !cultureUnitLearned(book, u, progress)) || ordered[0];
    if (next) selectUnit(next.id);
  };
  const startPractice = () => commit(current => ({ ...current, view: 'practice', readingScope: 'annotated', draftView: 'practice', draft: emptyCultureDraft(unitQuestions.find(q => !current.credits.includes(q.id))?.id || unitQuestions[0]?.id) }));
  const toggleSaved = () => { if (unit) commit(current => ({ ...current, saved: current.saved.includes(unit.id) ? current.saved.filter(id => id !== unit.id) : [...current.saved, unit.id] })); };
  const moveReading = (direction: number) => {
    if (!unit) return;
    const index = filtered.findIndex(item => item.id === unit.id);
    if (filtered[index + direction]) selectUnit(filtered[index + direction].id);
  };
  const categories = ['全部', ...new Set(book.units.map(item => item.category))];
  const dynasties = ['全部', ...new Set(book.units.flatMap(item => item.dynasty ? [item.dynasty] : []))];
  const nextDue = Object.values(progress.review).filter(item => item.dueAt > now).sort((a, b) => a.dueAt - b.dueAt)[0];
  const unitCreditCount = unitQuestions.filter(q => progress.credits.includes(q.id)).length;
  const hiddenTitles = progress.view !== 'read' && book.id !== 'poetry';

  return <Workbench title={book.title} eyebrow={book.eyebrow} className={`culture-workspace culture-${book.id}${directoryOpen ? ' culture-directory-open' : ''}`}
    toolbar={<><button type="button" className="wb-button culture-directory-toggle" aria-expanded={directoryOpen} onClick={event => {
      if (!directoryOpen) event.currentTarget.closest('.workbench')?.querySelector('.wb-content')?.scrollTo({ top: 0 });
      setDirectoryOpen(value => !value);
    }}><BookOpen size={15} />目录</button>{cloudCollection && <button type="button" className="wb-button" onClick={() => { speech.stop(); setCloudLibraryOpen(true); }}><Cloud size={15} />云端资料库</button>}<span className="culture-local"><BookOpen size={14} />本地内容</span><IconButton label="关闭模块" onClick={onClose}><X size={18} /></IconButton></>}
    status={<><span>{storageAvailable ? '本机进度自动保存' : '存储不可用，本次进度仅在当前窗口保留'}</span>{book.original && progress.readingScope === 'original' && progress.view === 'read' && <span>原文已读 {progress.original.read.length} / {book.original.paragraphs.length} 行</span>}<span>{progress.credits.length} / {questions.length} 个独立挑战已通过</span></>}>
    {cloudLibraryOpen && cloudCollection && <CloudLibrary collection={cloudCollection} onClose={() => setCloudLibraryOpen(false)} />}
    <div className="culture-summary">
      <img src={`/images/covers/${book.cover}-480.webp`} alt="" width="96" height="72" />
      <div className="culture-collection"><span>{book.original ? '完整原典' : '当前收录'}</span><strong>{book.original ? originalCharacterCount(book.original) : book.units.length}<small>{book.original ? '字' : book.noun}</small></strong></div>
      <div className="wb-stat"><strong>{progress.read.length}</strong><span>{book.original ? '精选已读' : '已读'}</span></div>
      <div className="wb-stat"><strong>{learned}</strong><span>全题通关</span></div>
      <div className="wb-stat"><strong>{due.length}</strong><span>到期复习</span></div>
      <div className="culture-total-progress"><span>独立挑战</span><progress max={questions.length || 1} value={progress.credits.length} /><small>{progress.credits.length} / {questions.length}</small></div>
    </div>
    {!storageAvailable && <p className="wb-notice is-error" role="status">设备未允许保存数据。收藏、答题和笔记在关闭后可能丢失，旧记录未被删除。</p>}
    {(progress.legacyScore > 0 || progress.legacyReflections.length > 0) && <p className="wb-notice culture-legacy"><History size={15} />
      {book.id === 'poetry' ? `旧版累计积分 ${progress.legacyScore}，单独保留，不计入独立挑战。` : `已保留 ${progress.legacyReflections.length} 段旧版阅读自评；已有自评只标为已读，不算测验通关。`}
    </p>}
    <nav className="wb-tabs culture-tabs" aria-label="学习视图">
      {([{ id: 'read', label: '阅读', Icon: BookOpen }, { id: 'practice', label: '练习', Icon: Target }, { id: 'review', label: `复习${due.length ? ` · ${due.length}` : ''}`, Icon: History }] as const).map(({ id, label, Icon }) =>
        <button key={id} type="button" aria-pressed={progress.view === id} onClick={() => switchView(id)}><Icon size={15} />{label}</button>)}
    </nav>
    {book.original && progress.view === 'read' && <nav className="wb-tabs culture-tabs culture-reading-scope" aria-label="阅读范围"><button type="button" aria-pressed={progress.readingScope === 'annotated'} onClick={() => commit(current => ({ ...current, readingScope: 'annotated' }))}><BookOpen size={14} />精选导读 · {book.units.length} 段</button><button type="button" aria-pressed={progress.readingScope === 'original'} onClick={() => commit(current => ({ ...current, readingScope: 'original' }))}><BookOpen size={14} />完整原文 · {book.original.paragraphs.length} 行</button></nav>}
    {book.original && progress.view === 'read' && progress.readingScope === 'original' ? <CultureOriginalReader original={book.original} progress={progress} commit={commit} speech={speech} closeDirectory={() => setDirectoryOpen(false)} /> : <div className="wb-grid culture-layout">
      <aside className="wb-sidebar culture-library" aria-label={progress.view === 'review' ? '复习队列' : '内容目录'}>
        {progress.view === 'review' ? <>
          <h3><History size={15} />到期队列 · {due.length}</h3>
          <p className="culture-muted">{nextDue ? `下一次复习：${dateLabel(nextDue.dueAt)}` : '独立答对后按 1、3、7、14 天间隔复习。'}</p>
          <ul className="wb-list culture-items">{due.map(q => {
            const u = book.units.find(item => item.id === q.unitId)!;
            return <li key={q.id}><button aria-current={question?.id === q.id ? 'true' : undefined} onClick={() => { commit(current => ({ ...current, draft: emptyCultureDraft(q.id) })); setDirectoryOpen(false); readingMain.current?.closest('.wb-content')?.scrollTo({ top: 0 }); }}>
              <strong>{book.id === 'poetry' ? u.title : `${book.title} · 第 ${book.units.indexOf(u) + 1} ${book.noun}`}</strong><span>{q.label} · {progress.review[q.id].wrong ? '错题待巩固' : '间隔复习'}</span>
            </button></li>;
          })}</ul>
          {!due.length && <div className="culture-small-empty"><CheckCircle2 size={22} /><p>当前没有到期题目</p></div>}
        </> : <>
          <label className="wb-field culture-search"><span><Search size={14} />搜索内容</span><input type="search" maxLength={200} placeholder={book.id === 'poetry' ? '诗名、作者、诗句、赏析' : '原文、释义、拼音或首字母'} value={progress.query} onChange={e => commit(current => ({ ...current, query: e.target.value, draft: emptyCultureDraft() }))} /></label>
          <div className="culture-filter-grid">
            <label className="wb-field">分类<select value={progress.category} onChange={e => commit(current => ({ ...current, category: e.target.value, draft: emptyCultureDraft() }))}>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
            <label className="wb-field">书架<select value={progress.shelf} onChange={e => commit(current => ({ ...current, shelf: e.target.value as CultureShelf, draft: emptyCultureDraft() }))}><option value="all">全部</option><option value="saved">收藏 · {progress.saved.length}</option><option value="unread">未读</option><option value="learned">已通关</option></select></label>
          </div>
          {book.id === 'poetry' && <label className="wb-field">朝代<select value={progress.dynasty} onChange={e => commit(current => ({ ...current, dynasty: e.target.value, draft: emptyCultureDraft() }))}>{dynasties.map(value => <option key={value}>{value}</option>)}</select></label>}
          <div className="culture-list-heading"><span><ListFilter size={13} />{filtered.length} / {book.units.length} {book.noun}</span><IconButton label="重置筛选" onClick={resetFilters}><RotateCcw size={14} /></IconButton></div>
          <ul className="wb-list culture-items">{filtered.map(item => {
            const count = questionsForUnit(book, item).filter(q => progress.credits.includes(q.id)).length;
            return <li key={item.id}><button aria-current={unit?.id === item.id ? 'true' : undefined} onClick={() => selectUnit(item.id)}>
              <strong>{hiddenTitles ? `第 ${book.units.indexOf(item) + 1} ${book.noun} · ${item.category}` : item.title}{progress.saved.includes(item.id) && <Bookmark size={13} fill="currentColor" />}</strong>
              <span>{book.id === 'poetry' ? item.subtitle : item.category}<small>{count}/{questionsForUnit(book, item).length}{progress.read.includes(item.id) ? ' · 已读' : ''}</small></span>
            </button></li>;
          })}</ul>
          {!filtered.length && <div className="culture-small-empty"><Search size={22} /><p>没有匹配内容</p><button className="wb-button" onClick={resetFilters}><RotateCcw size={14} />重置筛选</button></div>}
        </>}
      </aside>
      <main ref={readingMain} className="wb-main culture-main">
        {notice && <p className="wb-notice" role="status">{notice}</p>}
        {progress.view === 'read' && unit ? <>
          <header className="culture-reading-header">
            <div><span className="culture-kicker">{unit.subtitle}</span><h3>{unit.title}</h3><div className="culture-tags">{unit.tags.map((tag, i) => <span key={`${tag}-${i}`}>{tag}</span>)}</div></div>
            <div className="wb-toolbar"><IconButton label={progress.saved.includes(unit.id) ? '取消收藏' : '收藏本篇'} aria-pressed={progress.saved.includes(unit.id)} onClick={toggleSaved}><Bookmark size={18} fill={progress.saved.includes(unit.id) ? 'currentColor' : 'none'} /></IconButton>
              <IconButton label={speech.speaking ? '停止朗读' : speech.available ? '朗读原文' : speech.message} disabled={!speech.available} onClick={() => speech.speaking ? speech.stop() : speech.speak(book.id === 'idiom' ? unit.title : unit.lines.join('，'), progress.speechRate)}>{speech.speaking ? <Square size={17} /> : <Volume2 size={18} />}</IconButton>
            </div>
          </header>
          <div className="culture-reading-tools">
            {unit.pinyin && <label><input type="checkbox" checked={progress.showPinyin} onChange={e => commit(current => ({ ...current, showPinyin: e.target.checked }))} />拼音</label>}
            <label className="culture-rate">朗读速度<select aria-label="朗读速度" value={progress.speechRate} onChange={e => { speech.stop(); commit(current => ({ ...current, speechRate: Number(e.target.value) })); }}><option value={0.65}>慢速</option><option value={0.8}>舒缓</option><option value={1}>常速</option></select></label>
            <span className="culture-muted" role="status">{speech.message}</span>
          </div>
          <div className={`culture-text culture-text-${book.id}`}>
            {book.id === 'poetry' ? unit.lines.map((line, i) => <p key={i}><span>{String(i + 1).padStart(2, '0')}</span>{line}</p>)
              : <div className="culture-characters">{(book.id === 'idiom' ? [unit.chars || []] : unit.lines.map((_, lineIndex) => unit.chars!.slice(lineIndex * (book.id === 'sanzijing' ? 3 : 4), (lineIndex + 1) * (book.id === 'sanzijing' ? 3 : 4)))).map((line, lineIndex) => <div className="culture-character-line" key={lineIndex}>{line.map((char, i) => {
                const index = lineIndex * (book.id === 'sanzijing' ? 3 : 4) + i;
                return <button type="button" key={index} aria-label={`查看「${char}」字解`} aria-pressed={selectedChar === char} className={speech.character === index ? 'is-speaking' : ''} onClick={() => setSelectedChar(char)}>
                  {progress.showPinyin && <small>{unit.pinyin?.[index] || '—'}</small>}<span>{char}</span><i aria-hidden="true">{unit.lexicon[char] ? '·' : ''}</i>
                </button>;
              })}</div>)}</div>}
          </div>
          {selectedChar && <div className="culture-lexicon">
            <div className="culture-section-heading"><h4>字解 · {selectedChar}</h4><IconButton label="关闭字解" onClick={() => setSelectedChar(null)}><X size={14} /></IconButton></div>
            {unit.lexicon[selectedChar] ? <><p className="culture-muted">{unit.lexicon[selectedChar].pinyin} · {unit.lexicon[selectedChar].radical}部 · {unit.lexicon[selectedChar].strokes}画 · {unit.lexicon[selectedChar].formation}</p><p>本义：{unit.lexicon[selectedChar].original_meaning}</p><p>{unit.lexicon[selectedChar].evolution_story}</p></> : <p className="culture-muted">当前条目未收录「{selectedChar}」的字解。</p>}
          </div>}
          <article className="culture-interpretation">
            <div><h4>{book.id === 'poetry' ? '诗意与赏析' : '现代释义'}</h4><p>{unit.meaning}</p></div>
            {unit.interpretation && <div><h4>阅读导引</h4><p>{unit.interpretation}</p></div>}
            {unit.example && <div><h4>例句 · 项目原创</h4><p className="culture-example">{unit.example}</p></div>}
            {unit.reference && <a className="culture-reference" href={unit.reference.url} target="_blank" rel="noreferrer"><Info size={14} />词义参考：{unit.reference.label}</a>}
            {book.context && <p className="culture-context"><Info size={15} />{book.context}</p>}
            {unit.english && <details><summary>英文对照</summary><p lang="en">{unit.english}</p></details>}
            {book.id !== 'poetry' && <details><summary>{book.id === 'idiom' ? '典籍出处' : '典故与出处'}</summary>{unit.allusion ? <><h4>{unit.allusion.title}</h4><p>{unit.allusion.text}</p><small>{unit.allusion.source ? `本地条目标注出处：${unit.allusion.source}` : '本地条目未标注典籍出处。'}</small></> : <p className="culture-muted">当前条目未收录典故或典籍出处。</p>}</details>}
          </article>
          <div className="culture-reading-actions">
            <button className="wb-button" disabled={progress.read.includes(unit.id)} onClick={() => commit(current => ({ ...current, read: [...new Set([...current.read, unit.id])] }))}><Check size={15} />{progress.read.includes(unit.id) ? '已读' : '标记已读'}</button>
            <button className="wb-button is-primary" onClick={startPractice}><Target size={15} />{unitCreditCount ? `继续练习 · ${unitCreditCount}/${unitQuestions.length}` : '开始练习'}</button>
            <span className="culture-muted">阅读记录与独立挑战分别保留</span>
          </div>
          <div className="culture-note">
            <label className="wb-field">我的理解<textarea maxLength={2000} rows={3} placeholder="记下一点诗意、一个疑问，或生活中的用法……" value={progress.notes[unit.id] || ''} onChange={e => commit(current => ({ ...current, notes: { ...current.notes, [unit.id]: e.target.value } }))} /></label>
            <div><small>{(progress.notes[unit.id] || '').length}/2000</small>{onDiscover && <button className="wb-button" disabled={!progress.notes[unit.id]?.trim()} onClick={() => { if (publish({ key: `culture-note-${book.id}-${unit.id}`, kind: 'note', title: `${book.title} · ${unit.title}`, detail: progress.notes[unit.id].trim() })) setNotice('这段理解已提交到探索记录，本机笔记仍保留。'); }}><Send size={14} />记入探索</button>}</div>
          </div>
          <footer className="culture-reading-nav"><IconButton label="上一篇" disabled={filtered.indexOf(unit) <= 0} onClick={() => moveReading(-1)}><ChevronLeft size={18} /></IconButton><span>{filtered.indexOf(unit) + 1} / {filtered.length}</span><IconButton label="下一篇" disabled={filtered.indexOf(unit) >= filtered.length - 1} onClick={() => moveReading(1)}><ChevronRight size={18} /></IconButton></footer>
        </> : progress.view !== 'read' && question && unit ? <>
          <div className="culture-practice-heading"><div><span className="culture-kicker">{progress.view === 'review' ? '间隔复习' : '独立挑战'} · {book.id === 'poetry' ? unit.title : `第 ${book.units.indexOf(unit) + 1} ${book.noun}`}</span><h3>{question.label}</h3></div><span className="culture-practice-count">{unitCreditCount}/{unitQuestions.length} 已通过</span></div>
          {progress.view === 'practice' && <label className="wb-field culture-question-select">练习题型<select aria-label="练习题型" value={question.id} onChange={e => setDraft(() => emptyCultureDraft(e.target.value))}>{unitQuestions.map(q => <option key={q.id} value={q.id}>{q.label}{progress.credits.includes(q.id) ? ' · 已通过' : ''}</option>)}</select></label>}
          <PracticeQuestion key={question.id} question={question} draft={draft} setDraft={setDraft} submit={submit} />
          {draft.hinted && !draft.result && <p className="wb-notice">提示：{unit.meaning} 本轮使用了提示，不计独立通关。</p>}
          {!draft.result ? <div className="culture-practice-tools"><button className="wb-button" disabled={draft.hinted} onClick={() => setDraft(current => ({ ...current, hinted: true }))}><CircleHelp size={15} />提示</button><button className="wb-button" onClick={() => submit(true)}><Eye size={15} />查看答案</button><button className="wb-button" onClick={() => setDraft(() => emptyCultureDraft(question.id))}><RotateCcw size={15} />重排 / 重填</button></div>
            : <div className={`culture-feedback ${draft.result === 'correct' ? 'is-correct' : 'is-correction'}`} role="status">
              <h4>{draft.result === 'correct' ? '回答正确' : draft.result === 'wrong' ? '还没对应上，看看原文' : draft.result === 'assisted' ? '在提示帮助下答对了' : '答案已展开'}</h4>
              <p className="culture-answer">正确答案：{question.answer}</p><p>{question.explanation}</p>
              <small>{draft.result === 'correct' ? progress.review[question.id] ? `首次成功只记一次；下次复习 ${dateLabel(progress.review[question.id].dueAt)}` : '首次成功只记一次' : '已加入待复习；重新独立作答后才计通关。'}</small>
              <div className="wb-toolbar">{draft.result !== 'correct' && <button className="wb-button" onClick={() => setDraft(() => emptyCultureDraft(question.id))}><RotateCcw size={15} />独立重试</button>}<button className="wb-button is-primary" onClick={nextQuestion}><ArrowRight size={15} />{progress.view === 'review' ? '下一题 / 完成复习' : '继续挑战'}</button></div>
            </div>}
          {unitCreditCount === unitQuestions.length && <p className="culture-completed"><CheckCircle2 size={17} />本{book.noun}全部题型已通关，重做不重复计分。</p>}
          <button className="wb-button culture-back-reading" onClick={() => { commit(current => ({ ...current, selectedId: unit.id, query: '', category: '全部', dynasty: '全部', shelf: 'all', view: 'read', readingScope: 'annotated' })); }}><ArrowLeft size={15} />回到原文</button>
        </> : <div className="wb-empty"><BookOpen size={32} /><h3>{progress.view === 'review' ? '本轮复习已完成' : '当前筛选没有内容'}</h3><p>{progress.view === 'review' ? nextDue ? `下次复习：${dateLabel(nextDue.dueAt)}` : '完成独立挑战后，题目会进入间隔复习。' : '可以更换分类或查看全部本地内容。'}</p><button className="wb-button" onClick={() => { resetFilters(); switchView('read'); }}><BookOpen size={15} />回到阅读</button></div>}
        <details className="culture-source"><summary><Info size={14} />内容来源与收录范围</summary><p>{book.source}</p></details>
      </main>
    </div>}
  </Workbench>;
}

function PracticeQuestion({ question, draft, setDraft, submit }: {
  question: CultureQuestion; draft: CultureDraft; setDraft: (update: (current: CultureDraft) => CultureDraft) => void; submit: (reveal?: boolean) => void;
}) {
  const locked = Boolean(draft.result);
  const indices = useMemo(() => shuffledIndices(question.tokens?.length || 0, question.id), [question.id, question.tokens]);
  const ready = question.kind === 'order' ? draft.order.length === question.tokens?.length : Boolean(draft.answer.trim());
  return <form className="culture-question" onSubmit={e => { e.preventDefault(); if (ready && !locked) submit(); }}>
    <h4>{question.prompt}</h4><p className="culture-clue">{question.clue}</p>
    {question.kind === 'order' ? <>
      <ol className="culture-order" aria-label="已选顺序">{draft.order.map((index, slot) => <li key={index}><button type="button" disabled={locked} aria-label={`移除第 ${slot + 1} 项：${question.tokens![index]}`} onClick={() => setDraft(current => ({ ...current, order: current.order.filter(i => i !== index) }))}><span>{slot + 1}</span>{question.tokens![index]}<X size={13} /></button></li>)}
        {Array.from({ length: (question.tokens?.length || 0) - draft.order.length }, (_, slot) => <li className="culture-order-slot" key={`empty-${slot}`}><span>{draft.order.length + slot + 1}</span><span aria-hidden="true">—</span></li>)}
      </ol>
      <div className="culture-candidates" aria-label="候选片段">{indices.map(index => <button className="wb-button" type="button" key={index} disabled={locked || draft.order.includes(index)} aria-label={`候选 ${index + 1}：${question.tokens![index]}`} onClick={() => setDraft(current => current.order.includes(index) ? current : { ...current, order: [...current.order, index] })}>{question.tokens![index]}</button>)}</div>
    </> : question.kind === 'choice' ? <fieldset className="culture-choices"><legend className="culture-sr-only">选择答案</legend>{question.options?.map((option, i) => <label key={option} className={draft.answer === option ? 'is-selected' : ''}><input type="radio" name={question.id} value={option} checked={draft.answer === option} disabled={locked} onChange={() => setDraft(current => ({ ...current, answer: option }))} /><span className="culture-choice-index">{String.fromCharCode(65 + i)}</span><span>{option}</span></label>)}</fieldset>
      : <label className="wb-field culture-answer-field">你的答案<input autoComplete="off" maxLength={100} placeholder="写下答案" aria-label="练习答案" value={draft.answer} disabled={locked} onChange={e => setDraft(current => ({ ...current, answer: e.target.value }))} /></label>}
    {!locked && <button className="wb-button is-primary culture-submit" type="submit" disabled={!ready}><CheckCircle2 size={16} />核对答案</button>}
  </form>;
}
