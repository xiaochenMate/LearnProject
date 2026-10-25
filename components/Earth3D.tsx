import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Expand,
  Eye,
  Focus,
  Globe2,
  Info,
  Layers3,
  List,
  Loader2,
  MapPin,
  Minus,
  Network,
  Orbit,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Route,
  Search,
  Sparkles,
  Tags,
  Telescope,
  X,
} from 'lucide-react';
import {
  COSMIC_BY_ID,
  COSMIC_OBJECTS,
  CosmicObject,
  EXPLORATION_ROUTE,
  SCALE_QUESTIONS,
  UNIVERSE_SCALES,
  UniverseScale,
} from '../lib/universeData';
import {
  readUniverseProgress,
  saveUniverseProgress,
} from '../lib/universeProgress';
import {
  createUniverseScene,
  UniverseSceneController,
} from '../lib/universeScene';
import './universe.css';

interface Earth3DProps {
  onClose: () => void;
}
type InspectorTab = 'overview' | 'data' | 'observe';
type CatalogTab = 'objects' | 'route' | 'notebook';
const scaleIcons = [Orbit, Sparkles, Globe2, Network];

const Earth3D: React.FC<Earth3DProps> = () => {
  const [progress, setProgress] = useState(readUniverseProgress);
  const [selectedId, setSelectedId] = useState(progress.selectedId);
  const selected = COSMIC_BY_ID.get(selectedId)!;
  const scale = selected.scale;
  const scaleIndex = UNIVERSE_SCALES.findIndex((item) => item.id === scale);
  const scaleInfo = UNIVERSE_SCALES[scaleIndex];
  const [detailTab, setDetailTab] = useState<InspectorTab>('overview');
  const [catalogTab, setCatalogTab] = useState<CatalogTab>('objects');
  const [query, setQuery] = useState('');
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [labels, setLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [ready, setReady] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [assetError, setAssetError] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [sceneRevision, setSceneRevision] = useState(0);
  const [overview, setOverview] = useState(true);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [modelInfoOpen, setModelInfoOpen] = useState(false);
  const sceneContainer = useRef<HTMLDivElement>(null);
  const scene = useRef<UniverseSceneController | null>(null);
  const selection = useRef({ id: selectedId, overview });
  const selectRef = useRef<(id: string) => void>(() => undefined);
  const photoDialog = useRef<HTMLDivElement>(null);
  selection.current = { id: selectedId, overview };

  const choose = useCallback((id: string) => {
    if (!COSMIC_BY_ID.has(id)) return;
    setSelectedId(id);
    setOverview(false);
    setDetailTab('overview');
    setTourStep(null);
    setCatalogOpen(false);
    setPhotoFailed(false);
    if (
      COSMIC_BY_ID.get(id)?.scale ===
      COSMIC_BY_ID.get(selection.current.id)?.scale
    )
      scene.current?.select(id);
  }, []);
  selectRef.current = choose;

  const changeScale = (id: UniverseScale) => {
    const next = UNIVERSE_SCALES.find((item) => item.id === id)!;
    choose(next.defaultId);
    setOverview(true);
    setQuery('');
    setTourStep(null);
    if (id === scale) scene.current?.overview();
  };

  useEffect(() => {
    setStorageAvailable(saveUniverseProgress(progress));
  }, [progress]);
  useEffect(() => {
    setProgress((current) => ({
      ...current,
      selectedId,
      visited: current.visited.includes(selectedId)
        ? current.visited
        : [...current.visited, selectedId],
    }));
  }, [selectedId]);
  useEffect(() => {
    setQuizAnswer(null);
    setModelInfoOpen(false);
  }, [scale]);

  useEffect(() => {
    const container = sceneContainer.current;
    if (!container) return;
    setReady(false);
    setSceneError('');
    setAssetError(false);
    let controller: UniverseSceneController | null = null;
    try {
      controller = createUniverseScene(container, scale, {
        onSelect: (id) => {
          setTourStep(null);
          selectRef.current(id);
        },
        onReady: () => setReady(true),
        onError: setSceneError,
        onAssetError: () => setAssetError(true),
      });
      controller.select(selection.current.id, !selection.current.overview);
      controller.setPlaying(playing);
      controller.setLabels(labels);
      controller.setAutoRotate(autoRotate);
      scene.current = controller;
    } catch {
      setSceneError(
        '此浏览器暂时无法显示三维场景。你仍可以通过目录阅读、查看影像和记录观察。',
      );
    }
    return () => {
      controller?.dispose();
      scene.current = null;
    };
    // Scene construction only depends on scale; controls update separately.
  }, [scale, sceneRevision]);

  useEffect(() => {
    scene.current?.setPlaying(playing);
  }, [playing]);
  useEffect(() => {
    scene.current?.setLabels(labels);
  }, [labels]);
  useEffect(() => {
    scene.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  useEffect(() => {
    if (!photoOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    photoDialog.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPhotoOpen(false);
      if (event.key !== 'Tab') return;
      const buttons =
        photoDialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === photoDialog.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus?.focus();
    };
  }, [photoOpen]);

  const objectsInScale = COSMIC_OBJECTS.filter(
    (object) => object.scale === scale,
  );
  const search = query.trim().toLowerCase();
  const catalogObjects = search
    ? COSMIC_OBJECTS.filter((object) =>
        `${object.name} ${object.english} ${object.type}`
          .toLowerCase()
          .includes(search),
      )
    : objectsInScale;
  const completed = progress.observed.includes(selectedId);
  const question = SCALE_QUESTIONS[scale];
  const correct = quizAnswer === question.answer;
  const routeIndex = EXPLORATION_ROUTE.indexOf(selectedId);
  const scaleVisited = objectsInScale.filter((object) =>
    progress.visited.includes(object.id),
  ).length;
  const showOverview = () => {
    setOverview(true);
    scene.current?.overview();
  };
  const toggleObserved = () =>
    setProgress((current) => ({
      ...current,
      observed: completed
        ? current.observed.filter((id) => id !== selectedId)
        : [...current.observed, selectedId],
    }));
  const startRoute = (index: number) => {
    choose(EXPLORATION_ROUTE[index]);
    setTourStep(index);
    setCatalogTab('route');
  };
  const handleKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') setCatalogOpen(false);
    const target = event.target as HTMLElement;
    if (target.getAttribute('role') !== 'tab') return;
    const tabs = Array.from(
      target
        .closest('[role="tablist"]')!
        .querySelectorAll<HTMLButtonElement>('[role="tab"]'),
    );
    const index = tabs.indexOf(target as HTMLButtonElement);
    const next =
      event.key === 'ArrowRight'
        ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft'
          ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabs.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
    tabs[next].click();
  };
  const renderObject = (object: CosmicObject, suffix?: React.ReactNode) => (
    <button
      type="button"
      key={object.id}
      className={`universe-object ${selectedId === object.id ? 'is-active' : ''}`}
      onClick={() => {
        choose(object.id);
        if (catalogTab === 'notebook') {
          setDetailTab('observe');
          setDetailsExpanded(true);
        }
      }}
      aria-pressed={selectedId === object.id}
    >
      <span
        className={`universe-object-symbol shape-${object.shape}`}
        style={{ '--object-color': object.color } as React.CSSProperties}
      />
      <span className="universe-object-copy">
        <strong>{object.name}</strong>
        <small>
          {search
            ? UNIVERSE_SCALES.find((item) => item.id === object.scale)?.name
            : object.type}
        </small>
      </span>
      {suffix ||
        (progress.observed.includes(object.id) ? (
          <CheckCircle2 size={14} className="universe-mint" />
        ) : progress.visited.includes(object.id) ? (
          <span className="universe-visited-dot" aria-label="已探索" />
        ) : null)}
    </button>
  );

  return (
    <div className="universe-app" data-scale={scale} onKeyDown={handleKeys}>
      <nav className="universe-scales" aria-label="宇宙探索尺度">
        <span className="universe-scale-heading">
          <Telescope size={19} />
          <span>探索尺度</span>
        </span>
        <div className="universe-scale-tabs" role="tablist" aria-label="尺度">
          {UNIVERSE_SCALES.map((item, index) => {
            const Icon = scaleIcons[index];
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={item.id === scale}
                onClick={() => changeScale(item.id)}
              >
                <Icon size={16} />
                <span>{item.name}</span>
                <span className="universe-scale-number">0{index + 1}</span>
              </button>
            );
          })}
        </div>
        <span className="universe-total">
          <Eye size={14} />
          {progress.visited.length}
          <span>/ {COSMIC_OBJECTS.length}</span>
        </span>
      </nav>
      <div className="universe-workspace">
        {catalogOpen && (
          <button
            type="button"
            className="universe-catalog-backdrop"
            aria-label="关闭天体目录"
            onClick={() => setCatalogOpen(false)}
          />
        )}
        <aside
          className={`universe-catalog ${catalogOpen ? 'is-open' : ''}`}
          aria-label="天体目录"
        >
          <div className="universe-catalog-top">
            <label className="universe-search">
              <Search size={15} />
              <input
                aria-label="搜索宇宙天体"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setCatalogTab('objects');
                }}
                placeholder="搜索天体 / M31"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="清除搜索"
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <button
              type="button"
              className="universe-icon-button universe-catalog-close"
              aria-label="关闭目录"
              onClick={() => setCatalogOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          <div
            className="universe-catalog-tabs"
            role="tablist"
            aria-label="探索目录"
          >
            {(
              [
                ['objects', '天体', Layers3],
                ['route', '路线', Route],
                ['notebook', '手记', BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={catalogTab === id}
                onClick={() => {
                  setCatalogTab(id);
                  setQuery('');
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          <div className="universe-catalog-list">
            {catalogTab === 'objects' && (
              <>
                <div className="universe-list-heading">
                  <span>{search ? '全宇宙搜索' : scaleInfo.name}</span>
                  <span>{catalogObjects.length} 个对象</span>
                </div>
                {catalogObjects.map((object) => renderObject(object))}
                {!catalogObjects.length && (
                  <div className="universe-empty">
                    <Search size={25} />
                    <p>没有找到相关天体</p>
                    <button type="button" onClick={() => setQuery('')}>
                      清除搜索
                    </button>
                  </div>
                )}
              </>
            )}
            {catalogTab === 'route' && (
              <>
                <div className="universe-route-intro">
                  <strong>从家园出发</strong>
                  <p>地球 → 银河 → 深空</p>
                  <span>
                    {
                      EXPLORATION_ROUTE.filter((id) =>
                        progress.visited.includes(id),
                      ).length
                    }{' '}
                    / {EXPLORATION_ROUTE.length} 站已探索
                  </span>
                </div>
                {EXPLORATION_ROUTE.map((id, index) => (
                  <button
                    type="button"
                    key={id}
                    className={`universe-route-stop ${selectedId === id ? 'is-active' : ''}`}
                    onClick={() => startRoute(index)}
                  >
                    <span
                      className={
                        progress.visited.includes(id) ? 'is-visited' : ''
                      }
                    >
                      {progress.visited.includes(id) ? (
                        <Check size={12} />
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </span>
                    <span>
                      {COSMIC_BY_ID.get(id)!.name}
                      <small>
                        {
                          UNIVERSE_SCALES.find(
                            (item) => item.id === COSMIC_BY_ID.get(id)!.scale,
                          )?.name
                        }
                      </small>
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </>
            )}
            {catalogTab === 'notebook' && (
              <>
                <div className="universe-list-heading">
                  <span>我的观察</span>
                  <span>{progress.observed.length} 项</span>
                </div>
                {COSMIC_OBJECTS.filter(
                  (object) =>
                    progress.observed.includes(object.id) ||
                    progress.notes[object.id],
                ).map((object) => renderObject(object, <BookOpen size={13} />))}
                {!progress.observed.length &&
                  !Object.values(progress.notes).some(Boolean) && (
                    <div className="universe-empty">
                      <BookOpen size={27} />
                      <p>
                        第一份宇宙手记
                        <br />
                        从一次观察开始
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setDetailTab('observe');
                          setCatalogOpen(false);
                          setDetailsExpanded(true);
                        }}
                      >
                        记录当前天体
                      </button>
                    </div>
                  )}
              </>
            )}
          </div>
          <div className="universe-progress">
            <div>
              <span>探索足迹</span>
              <strong>
                {progress.visited.length} / {COSMIC_OBJECTS.length}
              </strong>
            </div>
            <progress
              value={progress.visited.length}
              max={COSMIC_OBJECTS.length}
              aria-label="探索总进度"
            />
            <small>
              {storageAvailable
                ? '手记与进度保存在当前设备'
                : '浏览器暂时无法保存，退出后记录可能丢失'}
            </small>
          </div>
        </aside>
        <section
          className="universe-viewport"
          aria-label={`${scaleInfo.name}三维视图`}
        >
          <div
            ref={sceneContainer}
            className="universe-scene"
            data-testid="universe-scene"
          />
          <div className="universe-scene-heading">
            <div>
              <span>{scaleInfo.english}</span>
              <h2>{overview ? scaleInfo.name : selected.name}</h2>
              <p>{overview ? scaleInfo.extent : selected.type}</p>
            </div>
          </div>
          <div className="universe-mobile-actions">
            <button
              type="button"
              className="universe-icon-button"
              title="天体目录"
              aria-label="打开天体目录"
              onClick={() => setCatalogOpen(true)}
            >
              <List size={18} />
            </button>
            <button
              type="button"
              className="universe-icon-button"
              title="探索路线"
              aria-label="打开探索路线"
              onClick={() => {
                setCatalogTab('route');
                setCatalogOpen(true);
              }}
            >
              <Route size={18} />
            </button>
          </div>
          {!ready && !sceneError && (
            <div className="universe-loading" role="status">
              <Loader2 size={24} className="animate-spin" />
              <span>正在进入{scaleInfo.name}</span>
            </div>
          )}
          {sceneError && (
            <div className="universe-scene-error" role="alert">
              <Info size={24} />
              <strong>三维场景暂时不可用</strong>
              <p>{sceneError}</p>
              <button
                type="button"
                onClick={() => setSceneRevision((value) => value + 1)}
              >
                <RotateCcw size={14} />
                重新载入
              </button>
            </div>
          )}
          {assetError && !sceneError && (
            <div className="universe-asset-note" role="status">
              部分纹理未能载入，当前以基础材质显示。
            </div>
          )}
          {tourStep !== null && (
            <div className="universe-tour-bar">
              <Route size={15} />
              <span>
                第 {tourStep + 1} / {EXPLORATION_ROUTE.length} 站
              </span>
              <button
                type="button"
                disabled={tourStep === 0}
                aria-label="路线上一站"
                title="上一站"
                onClick={() => startRoute(tourStep - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                onClick={() =>
                  tourStep === EXPLORATION_ROUTE.length - 1
                    ? setTourStep(null)
                    : startRoute(tourStep + 1)
                }
              >
                {tourStep === EXPLORATION_ROUTE.length - 1
                  ? '完成旅程'
                  : '下一站'}
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                aria-label="结束路线"
                title="结束路线"
                onClick={() => setTourStep(null)}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <div
            className="universe-toolbar"
            role="toolbar"
            aria-label="场景控制"
          >
            <button
              type="button"
              aria-label="缩小"
              title="缩小"
              onClick={() => scene.current?.zoom(1.25)}
              disabled={Boolean(sceneError)}
            >
              <Minus size={17} />
            </button>
            <button
              type="button"
              aria-label="放大"
              title="放大"
              onClick={() => scene.current?.zoom(0.8)}
              disabled={Boolean(sceneError)}
            >
              <Plus size={17} />
            </button>
            <span className="universe-tool-divider" />
            <button
              type="button"
              aria-label={playing ? '暂停演示' : '继续演示'}
              title={playing ? '暂停演示' : '继续演示'}
              aria-pressed={!playing}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              type="button"
              aria-label="自动环绕"
              title="自动环绕"
              aria-pressed={autoRotate}
              onClick={() => setAutoRotate((value) => !value)}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              aria-label="天体标签"
              title="天体标签"
              aria-pressed={labels}
              onClick={() => setLabels((value) => !value)}
            >
              <Tags size={16} />
            </button>
            <span className="universe-tool-divider" />
            <button
              type="button"
              aria-label="查看全景"
              title="查看全景"
              onClick={showOverview}
            >
              <Expand size={17} />
            </button>
            <button
              type="button"
              aria-label={`重新定位${selected.name}`}
              title="定位当前天体"
              onClick={() => {
                scene.current?.select(selectedId);
                setOverview(false);
              }}
            >
              <Focus size={17} />
            </button>
          </div>
          <div className="universe-scene-caption">
            <span className="universe-status-dot" />
            <span>{scale === 'solar' ? '轨道演示' : '结构示意'}</span>
            <span className="universe-caption-divider">/</span>
            <span>
              {scaleVisited} / {objectsInScale.length} 已探索
            </span>
            <button
              type="button"
              title="模型说明"
              aria-label="模型说明"
              aria-expanded={modelInfoOpen}
              onClick={() => setModelInfoOpen((value) => !value)}
            >
              <Info size={12} />
            </button>
          </div>
          {modelInfoOpen && (
            <div className="universe-model-popover" role="status">
              <Info size={14} />
              <p>{scaleInfo.note}</p>
              <button
                type="button"
                aria-label="关闭模型说明"
                onClick={() => setModelInfoOpen(false)}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </section>
        <aside
          className={`universe-inspector ${detailsExpanded ? 'is-expanded' : ''}`}
          aria-label="天体详情"
        >
          <button
            type="button"
            className="universe-sheet-handle"
            onClick={() => setDetailsExpanded((value) => !value)}
            aria-label={detailsExpanded ? '收起天体详情' : '展开天体详情'}
          >
            <span />
          </button>
          <div className="universe-inspector-heading">
            <div>
              <span>{selected.english}</span>
              <h2>
                {selected.name}
                <small>{selected.type}</small>
              </h2>
            </div>
            <button
              type="button"
              className="universe-icon-button"
              onClick={() =>
                choose(
                  objectsInScale[
                    (objectsInScale.findIndex(
                      (object) => object.id === selectedId,
                    ) +
                      1) %
                      objectsInScale.length
                  ].id,
                )
              }
              aria-label="下一个天体"
              title="下一个天体"
            >
              <ChevronRight size={19} />
            </button>
          </div>
          <div
            className="universe-inspector-tabs"
            role="tablist"
            aria-label="天体详情分类"
          >
            {(
              [
                ['overview', '认识', Eye],
                ['data', '数据', Layers3],
                ['observe', '观察', BookOpen],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                role="tab"
                aria-selected={detailTab === id}
                onClick={() => setDetailTab(id)}
              >
                <Icon size={14} />
                {label}
                {id === 'observe' && completed && (
                  <span className="universe-visited-dot" />
                )}
              </button>
            ))}
          </div>
          <div
            className="universe-inspector-content"
            key={`${selectedId}-${detailTab}`}
          >
            {detailTab === 'overview' && (
              <>
                <p className="universe-description">{selected.description}</p>
                {selected.enterScale && (
                  <button
                    type="button"
                    className="universe-enter"
                    onClick={() => changeScale(selected.enterScale!)}
                  >
                    <MapPin size={15} />
                    进入
                    {
                      UNIVERSE_SCALES.find(
                        (item) => item.id === selected.enterScale,
                      )?.name
                    }
                    <ArrowUpRight size={16} />
                  </button>
                )}
                {selected.image && (
                  <figure className="universe-photo">
                    <button
                      type="button"
                      aria-label={`放大${selected.name}观测影像`}
                      onClick={() => {
                        setPhotoOpen(true);
                        setPhotoFailed(false);
                      }}
                    >
                      <img
                        src={selected.image}
                        alt={selected.imageCaption}
                        onError={() => setPhotoFailed(true)}
                      />
                      <span>
                        <Telescope size={13} />
                        观测影像
                        <Expand size={13} />
                      </span>
                    </button>
                    {photoFailed && (
                      <p role="status">
                        影像载入失败，可通过下方来源查看原图。
                      </p>
                    )}
                    <figcaption>{selected.imageCaption}</figcaption>
                  </figure>
                )}
                <div className="universe-fact">
                  <Sparkles size={15} />
                  <div>
                    <strong>一个新发现</strong>
                    <p>{selected.fact}</p>
                  </div>
                </div>
                <div className="universe-model-note">
                  <Info size={13} />
                  <p>{scaleInfo.note}</p>
                </div>
                <a
                  href={selected.source}
                  target="_blank"
                  rel="noreferrer"
                  className="universe-source"
                >
                  NASA 资料与来源
                  <ArrowUpRight size={13} />
                </a>
              </>
            )}
            {detailTab === 'data' && (
              <>
                <dl className="universe-data">
                  {selected.stats.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="universe-unit-note">
                  <strong>
                    {scale === 'solar' ? '千米与天文单位' : '一光年有多远？'}
                  </strong>
                  <p>
                    {scale === 'solar'
                      ? '1 天文单位约为 1.496 亿千米，相当于地球到太阳的平均距离。'
                      : '光年是距离单位，不是时间单位。光在真空中传播一年，约走过 9.46 万亿千米。'}
                  </p>
                </div>
                <a
                  href={selected.source}
                  target="_blank"
                  rel="noreferrer"
                  className="universe-source"
                >
                  查看数据来源
                  <ArrowUpRight size={13} />
                </a>
              </>
            )}
            {detailTab === 'observe' && (
              <>
                <div className="universe-observation">
                  <span>
                    <Focus size={15} />
                    观察任务
                  </span>
                  <p>{selected.observation}</p>
                  <button
                    type="button"
                    className={`universe-complete ${completed ? 'is-complete' : ''}`}
                    aria-pressed={completed}
                    onClick={toggleObserved}
                  >
                    {completed ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Check size={16} />
                    )}
                    {completed ? '已记录这次观察' : '完成这次观察'}
                  </button>
                </div>
                <label className="universe-note-label" htmlFor="universe-note">
                  我的发现
                  <span>{(progress.notes[selectedId] || '').length} / 500</span>
                </label>
                <textarea
                  id="universe-note"
                  className="universe-notes"
                  maxLength={500}
                  value={progress.notes[selectedId] || ''}
                  placeholder="写下让你好奇的发现……"
                  onChange={(event) => {
                    const note = event.target.value;
                    setProgress((current) => ({
                      ...current,
                      notes: { ...current.notes, [selectedId]: note },
                    }));
                  }}
                />
                <span className="universe-note-status" role="status">
                  {storageAvailable ? '自动保存在当前设备' : '暂时无法保存'}
                </span>
                <div className="universe-quiz">
                  <span>
                    <Sparkles size={14} />
                    想一想
                    {progress.quizzes.includes(scale) && (
                      <CheckCircle2 size={13} />
                    )}
                  </span>
                  <strong>{question.question}</strong>
                  <div>
                    {question.options.map((option, index) => (
                      <button
                        type="button"
                        key={option}
                        className={
                          quizAnswer === index
                            ? correct
                              ? 'is-correct'
                              : 'is-incorrect'
                            : ''
                        }
                        onClick={() => {
                          setQuizAnswer(index);
                          if (index === question.answer)
                            setProgress((current) => ({
                              ...current,
                              quizzes: current.quizzes.includes(scale)
                                ? current.quizzes
                                : [...current.quizzes, scale],
                            }));
                        }}
                      >
                        <span>{String.fromCharCode(65 + index)}</span>
                        {option}
                        {quizAnswer === index &&
                          (correct ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <X size={14} />
                          ))}
                      </button>
                    ))}
                  </div>
                  {quizAnswer !== null && (
                    <p role="status" className={correct ? 'is-correct' : ''}>
                      {correct
                        ? question.explanation
                        : '再想一想，也可以回到“认识”寻找线索。'}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="universe-inspector-footer">
            {tourStep === null ? (
              <button
                type="button"
                onClick={() => startRoute(routeIndex >= 0 ? routeIndex : 0)}
              >
                <Route size={14} />
                {routeIndex >= 0 ? '沿路线继续探索' : '开启宇宙旅程'}
                <ChevronRight size={14} />
              </button>
            ) : (
              <span>
                <Route size={14} />
                从家园出发 · 第 {tourStep + 1} 站
              </span>
            )}
          </div>
        </aside>
      </div>
      <footer className="universe-scale-footer">
        <button
          type="button"
          disabled={scaleIndex === 0}
          onClick={() => changeScale(UNIVERSE_SCALES[scaleIndex - 1].id)}
        >
          <ChevronLeft size={14} />
          向内探索
        </button>
        <span>
          {UNIVERSE_SCALES.map((item, index) => (
            <React.Fragment key={item.id}>
              {index > 0 && <ChevronRight size={10} />}
              <button
                type="button"
                aria-current={item.id === scale ? 'location' : undefined}
                onClick={() => changeScale(item.id)}
              >
                {item.name}
              </button>
            </React.Fragment>
          ))}
        </span>
        <button
          type="button"
          disabled={scaleIndex === 3}
          onClick={() => changeScale(UNIVERSE_SCALES[scaleIndex + 1].id)}
        >
          走向深空
          <ChevronRight size={14} />
        </button>
      </footer>
      {photoOpen && selected.image && (
        <div
          className="universe-photo-overlay"
          onClick={() => setPhotoOpen(false)}
        >
          <div
            ref={photoDialog}
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name}观测影像`}
            tabIndex={-1}
            className="universe-photo-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div>
              <h2>
                {selected.name}
                <span>观测影像</span>
              </h2>
              <button
                type="button"
                className="universe-icon-button"
                aria-label="关闭观测影像"
                onClick={() => setPhotoOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            {photoFailed ? (
              <p role="alert">影像未能载入，请查看原始来源。</p>
            ) : (
              <img
                src={selected.image}
                alt={selected.imageCaption}
                onError={() => setPhotoFailed(true)}
              />
            )}
            <p>{selected.imageCaption}</p>
            <small>{selected.imageCredit}</small>
            <a href={selected.source} target="_blank" rel="noreferrer">
              原始资料
              <ArrowUpRight size={14} />
            </a>
          </div>
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {scaleInfo.name}，当前选择：{selected.name}
      </div>
    </div>
  );
};

export default Earth3D;
