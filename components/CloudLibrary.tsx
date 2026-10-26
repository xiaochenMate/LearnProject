import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookMarked, BookOpen, ChevronLeft, ChevronRight, Cloud, CloudOff, LoaderCircle, RotateCcw, Search, X } from 'lucide-react';
import { IconButton, Workbench } from './ModuleWorkbench';
import { createLibrarySearch, libraryEntry, LIBRARY_COLLECTIONS, LIBRARY_PAGE_SIZE, LIBRARY_QUERY_LIMIT, type LibraryCollection, type LibraryEntry, type LibraryLoadState } from '../lib/contentLibrary';
import './cloud-library.css';

export default function CloudLibrary({ collection, onClose }: { collection: LibraryCollection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const layout = useRef<HTMLDivElement>(null);
  const active = useRef<ReturnType<typeof createLibrarySearch> | null>(null);
  const [request, setRequest] = useState({ collection, q: '', offset: 0, debounce: false });
  const [composing, setComposing] = useState(false);
  const [state, setState] = useState<LibraryLoadState>({ phase: 'loading' });
  const [selected, setSelected] = useState<LibraryEntry | null>(null);
  const entries = useMemo(() => state.phase === 'ready'
    ? state.page.items.map((item, index) => libraryEntry(request.collection, item, state.page.offset + index)) : [], [state, request.collection]);
  const label = LIBRARY_COLLECTIONS[request.collection];
  const page = state.phase === 'ready' ? state.page : null;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const panel = dialog.current;
    panel?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      if (panel?.open) panel.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (composing) return;
    const loader = createLibrarySearch(setState);
    active.current = loader;
    loader.load(request.collection, request.q, request.offset, request.debounce);
    return () => loader.dispose();
  }, [request, composing]);

  useEffect(() => { layout.current?.scrollTo({ top: 0 }); }, [selected?.id, state.phase]);

  const change = (next: typeof request) => {
    active.current?.dispose();
    setSelected(null);
    setState({ phase: 'loading' });
    setRequest(next);
  };
  const retry = () => change({ ...request, debounce: false });

  return createPortal(<dialog ref={dialog} className="cloud-library-dialog" aria-label="云端资料库"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <Workbench title="云端资料库" eyebrow={`阅读 / ${label.label}`} className="cloud-library"
      toolbar={<><button type="button" className="wb-button" onClick={onClose}><ArrowLeft size={15} />本地精选</button><IconButton label="关闭资料库" onClick={onClose}><X size={18} /></IconButton></>}
      status={<><span><Cloud size={13} />{page ? '云端只读内容' : '云端连接尚未确认'}</span><span>本地精选与练习记录保留</span></>}>
      <div className="cl-searchbar">
        <label className="wb-field">资料分类<select value={request.collection} onChange={event => change({ collection: event.target.value as LibraryCollection, q: '', offset: 0, debounce: false })}>
          {Object.entries(LIBRARY_COLLECTIONS).map(([id, item]) => <option key={id} value={id}>{item.label}</option>)}
        </select></label>
        <label className="wb-field cl-search"><span><Search size={14} />搜索{label.label}</span><div>
          <input type="search" autoFocus maxLength={LIBRARY_QUERY_LIMIT} placeholder="关键词" value={request.q}
            onCompositionStart={() => { active.current?.dispose(); setSelected(null); setState({ phase: 'loading' }); setComposing(true); }}
            onCompositionEnd={() => setComposing(false)}
            onChange={event => change({ ...request, q: event.target.value, offset: 0, debounce: true })} />
          {request.q && <IconButton label="清空搜索" onClick={() => change({ ...request, q: '', offset: 0, debounce: false })}><X size={16} /></IconButton>}
        </div></label>
      </div>
      <div className="cl-result-heading" role="status" aria-live="polite">
        <span>{page ? `${request.q.trim() ? '搜索结果' : '云端共'} ${page.total.toLocaleString('zh-CN')} ${label.noun}` : state.phase === 'error' ? '云端内容未载入' : '正在查询云端…'}</span>
        {page && <IconButton label="刷新当前页" onClick={retry}><RotateCcw size={15} /></IconButton>}
      </div>
      {state.phase === 'loading' ? <div className="wb-empty cl-state" role="status"><LoaderCircle className="cl-loading" size={27} /><p>正在加载{label.label}…</p></div>
        : state.phase === 'error' ? <div className="wb-empty cl-state" role="alert"><CloudOff size={28} /><h3>暂时无法载入</h3><p>{state.message}</p><div className="wb-toolbar"><button type="button" className="wb-button is-primary" onClick={retry}><RotateCcw size={16} />重试</button><button type="button" className="wb-button" onClick={onClose}><ArrowLeft size={16} />返回本地精选</button></div></div>
          : entries.length === 0 ? <div className="wb-empty cl-state"><Search size={28} /><h3>{request.q.trim() ? '没有匹配的内容' : page?.total ? '这一页没有内容' : '云端暂未收录内容'}</h3><div className="wb-toolbar">{(request.q || request.offset > 0) && <button type="button" className="wb-button" onClick={() => change({ ...request, q: '', offset: 0, debounce: false })}><RotateCcw size={16} />查看全部</button>}<button type="button" className="wb-button" onClick={retry}><RotateCcw size={16} />重新查询</button></div></div>
            : <div ref={layout} className={`cl-layout${selected ? ' has-selection' : ''}`}>
              <nav className="cl-results" aria-label={`${label.label}条目`}><ol>
                {entries.map((entry, index) => <li key={`${entry.id}:${index}`}><button type="button" aria-current={selected === entry ? 'true' : undefined} onClick={() => setSelected(entry)}>
                  <span className="cl-item-title">{entry.title}<ChevronRight size={16} /></span>
                  {entry.subtitle && <small>{entry.subtitle}</small>}<p>{entry.preview}</p>
                </button></li>)}
              </ol></nav>
              {selected ? <article className="cl-reader" aria-label="条目精读" key={selected.id}>
                <button type="button" className="wb-button cl-back-list" onClick={() => setSelected(null)}><ArrowLeft size={15} />返回条目</button>
                <header><span className="cl-kicker">{label.label} · 云端条目</span><h3>{selected.title}</h3>{selected.subtitle && <p className="wb-muted">{selected.subtitle}</p>}</header>
                {selected.characters.length > 0 ? <p className="cl-characters">{Array.from({ length: Math.ceil(selected.characters.length / 3) }, (_, row) => <span className="cl-character-line" key={row}>
                  {selected.characters.slice(row * 3, row * 3 + 3).map((char, index) => <ruby key={index}>{char}<rp>（</rp><rt>{selected.pinyin[row * 3 + index] || ''}</rt><rp>）</rp></ruby>)}
                </span>)}</p>
                  : selected.lines.length > 0 && <div className="cl-lines">{selected.lines.map((line, index) => <p key={index}>{line}</p>)}</div>}
                {selected.sections.map(section => section.label === '答案'
                  ? <details key={section.label}><summary>答案</summary><p>{section.text}</p></details>
                  : <section key={section.label}><h4>{section.label}</h4><p>{section.text}</p></section>)}
                <footer className="cl-source"><h4><BookMarked size={15} />出处</h4><p>{selected.source || '本条目未标注出处。'}</p></footer>
              </article> : <div className="wb-empty cl-reader-empty"><BookOpen size={28} /><h3>精读</h3></div>}
            </div>}
      <footer className="cl-pagination" aria-label="资料库分页">
        <span>{page && page.items.length ? `${page.offset + 1}–${page.offset + page.items.length} / ${page.total.toLocaleString('zh-CN')}` : '—'}</span>
        <div><IconButton label="上一页" disabled={!page || page.offset === 0} onClick={() => change({ ...request, offset: Math.max(0, request.offset - LIBRARY_PAGE_SIZE), debounce: false })}><ChevronLeft size={19} /></IconButton>
          <IconButton label="下一页" disabled={!page?.hasMore} onClick={() => change({ ...request, offset: request.offset + LIBRARY_PAGE_SIZE, debounce: false })}><ChevronRight size={19} /></IconButton></div>
      </footer>
    </Workbench>
  </dialog>, document.body);
}
