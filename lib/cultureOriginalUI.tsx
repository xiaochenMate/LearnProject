import React, { useEffect, useMemo, useRef } from 'react';
import { Bookmark, BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, Info, RotateCcw, Search, Square, Volume2 } from 'lucide-react';
import { IconButton } from '../components/ModuleWorkbench';
import type { CultureOriginal } from './cultureContent';
import type { CultureProgress } from './cultureProgress';
import { cultureOriginalPages, filterCultureOriginal, originalCharacterCount } from './cultureOriginal';
import type { useCultureSpeech } from './cultureSpeech';

export function CultureOriginalReader({ original, progress, commit, speech, closeDirectory }: {
  original: CultureOriginal; progress: CultureProgress;
  commit: (update: (state: CultureProgress) => CultureProgress) => void;
  speech: ReturnType<typeof useCultureSpeech>; closeDirectory: () => void;
}) {
  const state = progress.original;
  const filtered = useMemo(() => filterCultureOriginal(original, state), [original, state]);
  const pages = useMemo(() => cultureOriginalPages(filtered), [filtered]);
  const pageIndex = Math.min(state.page, Math.max(0, pages.length - 1));
  const page = pages[pageIndex] || [];
  const main = useRef<HTMLDivElement>(null);
  useEffect(() => { main.current?.closest('.wb-content')?.scrollTo({ top: 0 }); }, []);
  const update = (patch: Partial<CultureProgress['original']>) => commit(current => ({ ...current, original: { ...current.original, ...patch } }));
  const move = (index: number) => {
    update({ page: index }); closeDirectory();
    main.current?.closest('.wb-content')?.scrollTo({ top: 0 });
  };
  useEffect(() => {
    if (state.page !== pageIndex) commit(current => ({ ...current, original: { ...current.original, page: pageIndex } }));
  }, [state.page, pageIndex, commit]);
  const reset = () => update({ query: '', shelf: 'all', page: 0 });
  return <div className="wb-grid culture-layout culture-original-layout">
    <aside className="wb-sidebar culture-library" aria-label="完整原文目录">
      <label className="wb-field culture-search"><span><Search size={14} />搜索完整原文</span><input type="search" maxLength={200} value={state.query} placeholder="简体或繁体原文" onChange={e => update({ query: e.target.value, page: 0 })} /></label>
      <label className="wb-field">原文书架<select value={state.shelf} onChange={e => update({ shelf: e.target.value as typeof state.shelf, page: 0 })}><option value="all">全部原文</option><option value="saved">收藏 · {state.saved.length}</option><option value="unread">未读</option></select></label>
      <div className="culture-list-heading"><span>{filtered.length} / {original.paragraphs.length} 行</span><IconButton label="重置原文筛选" onClick={reset}><RotateCcw size={14} /></IconButton></div>
      <ul className="wb-list culture-items">{pages.map((rows, i) => <li key={rows[0].id}><button aria-current={pageIndex === i ? 'true' : undefined} onClick={() => move(i)}><strong>第 {rows[0].index}–{rows[rows.length - 1].index} 行</strong><span>{(state.script === 'original' ? rows[0].text : rows[0].simplified).slice(0, 16)}</span></button></li>)}</ul>
      <p className="culture-muted">原文已读 {state.read.length} / {original.paragraphs.length} 行</p>
    </aside>
    <div ref={main} className="wb-main culture-main culture-original-main" role="region" aria-label="完整原文阅读">
      <header className="culture-reading-header"><div><span className="culture-kicker">完整原文 · {originalCharacterCount(original)} 字</span><h3>{original.title}</h3><span className="culture-muted">{original.edition}</span></div><IconButton label={speech.speaking ? '停止原文朗读' : speech.available ? '朗读本页原文' : speech.message} disabled={!speech.available || !page.length} onClick={() => speech.speaking ? speech.stop() : speech.speak(page.map(p => state.script === 'original' ? p.text : p.simplified).join('。'), progress.speechRate)}>{speech.speaking ? <Square size={17} /> : <Volume2 size={18} />}</IconButton></header>
      <div className="culture-reading-tools"><label className="culture-rate">字形<select aria-label="原文字形" value={state.script} onChange={e => { speech.stop(); update({ script: e.target.value as typeof state.script }); }}><option value="original">来源原字</option><option value="simplified">简体转换</option></select></label><label className="culture-rate">朗读速度<select aria-label="原文朗读速度" value={progress.speechRate} onChange={e => { speech.stop(); commit(current => ({ ...current, speechRate: Number(e.target.value) })); }}><option value={0.65}>慢速</option><option value={0.8}>舒缓</option><option value={1}>常速</option></select></label><span className="culture-muted" role="status">{speech.message}</span></div>
      <p className="culture-original-caption">全篇原文与精选译注分列；本区不附全篇拼音或译注。</p>
      {page.length ? <>
        <ol className="culture-original-lines">{page.map(paragraph => <li key={paragraph.id} value={paragraph.index}>
          <div className="culture-original-line"><span className="culture-line-number">{paragraph.index}</span><p>{state.script === 'original' ? paragraph.text : paragraph.simplified}</p><div className="wb-toolbar"><IconButton label={`${state.read.includes(paragraph.id) ? '已读' : '标记已读'}第 ${paragraph.index} 行`} aria-pressed={state.read.includes(paragraph.id)} onClick={() => update({ read: [...new Set([...state.read, paragraph.id])] })}><Check size={15} /></IconButton><IconButton label={`${state.saved.includes(paragraph.id) ? '取消收藏' : '收藏'}第 ${paragraph.index} 行`} aria-pressed={state.saved.includes(paragraph.id)} onClick={() => update({ saved: state.saved.includes(paragraph.id) ? state.saved.filter(id => id !== paragraph.id) : [...state.saved, paragraph.id] })}><Bookmark size={15} fill={state.saved.includes(paragraph.id) ? 'currentColor' : 'none'} /></IconButton></div></div>
          {paragraph.variants && <details><summary>来源所列异文</summary><p>{paragraph.variants}</p></details>}
        </li>)}</ol>
        <div className="culture-reading-actions"><button className="wb-button" onClick={() => update({ read: [...new Set([...state.read, ...page.map(p => p.id)])] })} disabled={page.every(p => state.read.includes(p.id))}><Check size={15} />本页已读</button><span className="culture-muted">原文阅读记录不计精选测验成绩</span></div>
        <footer className="culture-reading-nav"><IconButton label="原文上一页" disabled={pageIndex <= 0} onClick={() => move(pageIndex - 1)}><ChevronLeft size={18} /></IconButton><span>第 {pageIndex + 1} / {pages.length} 页</span><IconButton label="原文下一页" disabled={pageIndex >= pages.length - 1} onClick={() => move(pageIndex + 1)}><ChevronRight size={18} /></IconButton></footer>
      </> : <div className="wb-empty"><Search size={28} /><h3>没有匹配的原文</h3><button className="wb-button" onClick={reset}><RotateCcw size={15} />重置原文筛选</button></div>}
      <details className="culture-source"><summary><Info size={14} />版本、来源与异文说明</summary><p>{original.note}</p><p>本地录入：{original.downloadedAt} · 来源修订号：{original.revision}。</p><p>{original.rights}</p><div className="wb-toolbar"><a href={original.sourceUrl} target="_blank" rel="noreferrer"><ExternalLink size={13} />维基文库固定版本</a><a href={original.simplifiedSourceUrl} target="_blank" rel="noreferrer">简体转换来源</a>{original.scanUrl && <a href={original.scanUrl} target="_blank" rel="noreferrer">馆藏扫描本入口</a>}<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.zh-hans" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></div></details>
    </div>
  </div>;
}
