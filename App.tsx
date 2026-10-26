import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  Compass,
  Download,
  Expand,
  FileText,
  Footprints,
  HelpCircle,
  Loader2,
  Minimize2,
  MoreHorizontal,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import BrandLogo from "./components/BrandLogo";
import ErrorBoundary from "./components/ErrorBoundary";
import ExplorerHome, { ExperienceCard } from "./components/ExplorerHome";
import ExplorerDialog from "./components/ExplorerDialog";
import DataStatusPanel from "./components/DataStatusPanel";
import { EXPERIENCE_BY_ID, Experience } from "./lib/experienceCatalog";
import {
  addDiscovery,
  createExplorerBackup,
  Discovery,
  ExperienceEvidence,
  ExplorerStore,
  EXPLORER_STORAGE_KEY,
  formatDuration,
  getRecentExperiences,
  mergeExplorerStores,
  parseExplorerBackup,
  readExplorerStore,
  writeExplorerStore,
} from "./lib/explorerStore";
import "./components/explorer.css";

const Earth3D = lazy(() => import("./components/Earth3D"));
const WaveApp = lazy(() => import("./components/WaveApp"));
const FoodChainApp = lazy(() => import("./components/FoodChainApp"));
const ProArtApp = lazy(() => import("./components/ProArtApp"));
const CharacterApp = lazy(() => import("./components/CharacterApp"));
const PoetryApp = lazy(() => import("./components/PoetryApp"));
const HistorySortingApp = lazy(() => import("./components/HistorySortingApp"));
const ClockApp = lazy(() => import("./components/ClockApp"));
const MathSprintApp = lazy(() => import("./components/MathSprintApp"));
const ThreeCharacterApp = lazy(() => import("./components/ThreeCharacterApp"));
const ThousandCharacterApp = lazy(
  () => import("./components/ThousandCharacterApp"),
);
const BrainTeaseApp = lazy(() => import("./components/BrainTeaseApp"));
const GobangApp = lazy(() => import("./components/GobangApp"));
const ChineseChessApp = lazy(() => import("./components/ChineseChessApp"));
const ChessApp = lazy(() => import("./components/ChessApp"));
const GoApp = lazy(() => import("./components/GoApp"));
const JiangnanGameApp = lazy(() => import("./components/JiangnanGameApp"));
const VocabularyApp = lazy(() => import("./components/VocabularyApp"));
const IdiomApp = lazy(() => import("./components/IdiomApp"));
const CurrencyConverterApp = lazy(
  () => import("./components/CurrencyConverterApp"),
);
const SummerGardenView = lazy(() => import("./components/SummerGardenView"));

type View = "explore" | "journal" | "saved" | "settings" | "growth";
interface Route {
  view: View;
  moduleId: string | null;
}
function readRoute(): Route {
  const hash = window.location.hash.slice(1);
  const aliases: Record<string, View> = { library: "journal", home: "explore" };
  const view =
    aliases[hash] ||
    (["explore", "journal", "saved", "settings", "growth"].includes(hash)
      ? (hash as View)
      : "explore");
  const requested = new URLSearchParams(window.location.search).get("module");
  return {
    view,
    moduleId: requested && EXPERIENCE_BY_ID.has(requested) ? requested : null,
  };
}
const NAV = [
  { id: "explore" as View, label: "探索", Icon: Compass },
  { id: "journal" as View, label: "我的足迹", Icon: Footprints },
  { id: "saved" as View, label: "收藏", Icon: Bookmark },
];
const KIND_LABELS = {
  note: "探索笔记",
  observation: "观察记录",
  experiment: "实验验证",
  challenge: "挑战结果",
  artwork: "创作记录",
};
const newId = () => crypto.randomUUID();

export default function App() {
  const [route, setRoute] = useState(readRoute);
  const [store, setStore] = useState(readExplorerStore);
  const storeRef = useRef(store);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<"note" | "guide" | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const session = useRef<{
    id: string;
    moduleId: string;
    seconds: number;
    lastTick: number;
    visible: boolean;
  } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const item = route.moduleId ? EXPERIENCE_BY_ID.get(route.moduleId)! : null;

  const update = useCallback(
    (fn: (current: ExplorerStore) => ExplorerStore) => {
      const next = fn(storeRef.current);
      if (next === storeRef.current) return;
      storeRef.current = next;
      setStore(next);
      setStorageAvailable(writeExplorerStore(next));
    },
    [],
  );

  const flushSession = useCallback(() => {
    const active = session.current;
    if (!active) return;
    const now = performance.now();
    if (active.visible)
      active.seconds += Math.max(0, (now - active.lastTick) / 1000);
    active.lastTick = now;
    active.visible = document.visibilityState === "visible";
    const seconds = Math.floor(active.seconds);
    setSessionSeconds(seconds);
    update((current) => ({
      ...current,
      sessions: current.sessions.map((entry) =>
        entry.id === active.id ? { ...entry, seconds } : entry,
      ),
    }));
  }, [update]);

  const navigate = useCallback((view: View, moduleId: string | null = null) => {
    const url = new URL(window.location.href);
    url.hash = view;
    if (moduleId) url.searchParams.set("module", moduleId);
    else {
      url.searchParams.delete("module");
      url.searchParams.delete("object");
    }
    if (moduleId !== 'e1') {
      url.searchParams.delete('space');
      url.searchParams.delete('overview');
      url.searchParams.delete('object');
    }
    window.history.pushState(null, "", url);
    setDialog(null);
    setRoute({ view, moduleId });
    window.scrollTo(0, 0);
    requestAnimationFrame(() =>
      mainRef.current?.focus({ preventScroll: true }),
    );
  }, []);
  const open = (experience: Experience) => navigate(route.view, experience.id);
  const toggleSave = (id: string) =>
    update((current) => ({
      ...current,
      saved: current.saved.includes(id)
        ? current.saved.filter((saved) => saved !== id)
        : [...current.saved, id],
    }));
  const record = useCallback(
    (evidence: ExperienceEvidence) => {
      if (!route.moduleId) return;
      const discovery: Discovery = {
        ...evidence,
        moduleId: route.moduleId,
        id: newId(),
        createdAt: new Date().toISOString(),
      };
      update((current) => addDiscovery(current, discovery));
    },
    [route.moduleId, update],
  );

  useEffect(() => {
    document.documentElement.classList.add("dark");
    const syncRoute = () => {
      setRoute(readRoute());
      setDialog(null);
    };
    const syncStorage = (event: StorageEvent) => {
      if (event.key === EXPLORER_STORAGE_KEY) {
        const next = readExplorerStore();
        storeRef.current = next;
        setStore(next);
      }
    };
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("storage", syncStorage);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      store.reducedMotion,
    );
  }, [store.reducedMotion]);
  useEffect(() => {
    if (session.current?.moduleId === route.moduleId) return;
    flushSession();
    session.current = null;
    setSessionSeconds(0);
    if (!route.moduleId) return;
    const id = newId();
    session.current = {
      id,
      moduleId: route.moduleId,
      seconds: 0,
      lastTick: performance.now(),
      visible: document.visibilityState === "visible",
    };
    update((current) => ({
      ...current,
      sessions: [
        {
          id,
          moduleId: route.moduleId!,
          startedAt: new Date().toISOString(),
          seconds: 0,
        },
        ...current.sessions,
      ].slice(0, 1000),
    }));
  }, [route.moduleId, flushSession, update]);
  useEffect(() => {
    const timer = window.setInterval(flushSession, 10000);
    window.addEventListener("pagehide", flushSession);
    document.addEventListener("visibilitychange", flushSession);
    const onFullscreen = () =>
      setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => {
      clearInterval(timer);
      flushSession();
      window.removeEventListener("pagehide", flushSession);
      document.removeEventListener("visibilitychange", flushSession);
      document.removeEventListener("fullscreenchange", onFullscreen);
    };
  }, [flushSession]);
  useEffect(() => {
    document.title = item ? `${item.title} · ExBeam` : "ExBeam · 互动探索空间";
  }, [item]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const exportRecords = () => {
    flushSession();
    const blob = new Blob(
      [JSON.stringify(createExplorerBackup(storeRef.current), null, 2)],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `exbeam-explorations-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    setNotice("探索记录已导出");
  };
  const importRecords = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error("备份文件不能超过 4 MB。");
      const imported = parseExplorerBackup(await file.text());
      update((current) => mergeExplorerStores(current, imported));
      setNotice("记录已合并，原有笔记和收藏均已保留");
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "导入失败，原有记录未改动",
      );
    }
  };
  const enterFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice("当前浏览器不支持全屏，可继续使用沉浸视图");
    }
  };

  const renderExperience = () => {
    const props = { onClose: () => navigate(route.view), onDiscover: record };
    switch (route.moduleId) {
      case "e1":
        return <Earth3D {...props} reducedMotion={store.reducedMotion} />;
      case "e2":
        return <FoodChainApp {...props} />;
      case "e3":
        return <WaveApp {...props} reducedMotion={store.reducedMotion} />;
      case "u1":
        return <ProArtApp {...props} />;
      case "e4":
        return <CharacterApp {...props} />;
      case "e5":
        return <PoetryApp {...props} />;
      case "e6":
        return <HistorySortingApp {...props} />;
      case "e7":
        return <ClockApp {...props} />;
      case "e18":
        return <MathSprintApp {...props} />;
      case "e20":
        return <ThreeCharacterApp {...props} />;
      case "e21":
        return <ThousandCharacterApp {...props} />;
      case "ent3":
        return <BrainTeaseApp {...props} />;
      case "ent4":
        return <GobangApp {...props} />;
      case "ent5":
        return <ChineseChessApp {...props} />;
      case "ent6":
        return <ChessApp {...props} />;
      case "ent7":
        return <GoApp {...props} />;
      case "ent8":
        return <JiangnanGameApp {...props} />;
      case "u2":
        return <VocabularyApp {...props} />;
      case "u3":
        return <IdiomApp {...props} />;
      case "u4":
        return <CurrencyConverterApp />;
    }
  };
  const recent = getRecentExperiences(store);
  const discoveries = item
    ? store.discoveries.filter((entry) => entry.moduleId === item.id)
    : store.discoveries;

  return (
    <div className={`explorer-product ${item ? "is-experience" : ""}`}>
      <a href="#main-content" className="explorer-skip">
        跳到内容
      </a>
      {item ? (
        <header className="experience-header">
          <button
            className="ex-icon"
            onClick={() => navigate(route.view)}
            title="返回探索"
            aria-label="返回探索"
          >
            <ArrowLeft size={19} />
          </button>
          <a
            className="experience-brand"
            href="#explore"
            onClick={(event) => {
              event.preventDefault();
              navigate("explore");
            }}
            aria-label="ExBeam 首页"
          >
            <BrandLogo compact />
          </a>
          <div className="experience-heading">
            <span>{item.format}</span>
            <h1>{item.title}</h1>
          </div>
          <div className="experience-session">
            <span className="live-dot" />
            {formatDuration(sessionSeconds)}
          </div>
          <div className="experience-actions">
            <button
              className="ex-icon"
              aria-label="探索任务"
              title="探索任务"
              onClick={() => setDialog("guide")}
            >
              <HelpCircle size={18} />
            </button>
            <button
              className={`ex-icon ${store.saved.includes(item.id) ? "is-active" : ""}`}
              aria-label={
                store.saved.includes(item.id) ? "取消收藏" : "收藏体验"
              }
              title={store.saved.includes(item.id) ? "取消收藏" : "收藏体验"}
              aria-pressed={store.saved.includes(item.id)}
              onClick={() => toggleSave(item.id)}
            >
              <Bookmark
                size={18}
                fill={store.saved.includes(item.id) ? "currentColor" : "none"}
              />
            </button>
            <button
              className="ex-icon fullscreen-action"
              disabled={!document.fullscreenEnabled}
              aria-label={fullscreen ? "退出全屏" : "全屏"}
              title={fullscreen ? "退出全屏" : "全屏"}
              onClick={enterFullscreen}
            >
              {fullscreen ? <Minimize2 size={18} /> : <Expand size={18} />}
            </button>
            <button
              className="ex-button ex-button-secondary notebook-action"
              aria-label="探索笔记"
              onClick={() => setDialog("note")}
            >
              <FileText size={16} />
              <span>探索笔记</span>
              {discoveries.length > 0 && <b>{discoveries.length}</b>}
            </button>
          </div>
        </header>
      ) : (
        <header className="explorer-header">
          <a
            className="explorer-brand"
            href="#explore"
            onClick={(event) => {
              event.preventDefault();
              navigate("explore");
            }}
            aria-label="ExBeam 首页"
          >
            <BrandLogo inverse />
            <span>互动探索空间</span>
          </a>
          <nav aria-label="主导航">
            {NAV.map(({ id, label, Icon }) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={route.view === id ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(id);
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
                {id === "saved" && store.saved.length > 0 && (
                  <b>{store.saved.length}</b>
                )}
              </a>
            ))}
          </nav>
          <button
            className={`ex-icon ${route.view === "settings" ? "is-active" : ""}`}
            onClick={() => navigate("settings")}
            title="偏好与数据"
            aria-label="偏好与数据"
          >
            <Settings2 size={19} />
          </button>
        </header>
      )}

      {!storageAvailable && (
        <div className="explorer-warning" role="alert">
          当前浏览器无法保存记录。请先导出备份，避免退出后丢失。
          <button onClick={exportRecords}>导出记录</button>
        </div>
      )}
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className={item ? "experience-stage" : "explorer-main"}
      >
        {item ? (
          <ErrorBoundary key={item.id} onReset={() => navigate(route.view)}>
            <Suspense
              fallback={
                <div className="experience-loading" role="status">
                  <Loader2 size={25} className="animate-spin" />
                  <h2>正在进入{item.title}</h2>
                  <p>首次打开需要加载场景资源</p>
                </div>
              }
            >
              <div
                data-experience={item.id}
                className="experience-native"
              >
                {renderExperience()}
              </div>
            </Suspense>
          </ErrorBoundary>
        ) : route.view === "explore" ? (
          <ExplorerHome
            store={store}
            onOpen={open}
            onToggleSave={toggleSave}
            reducedMotion={store.reducedMotion}
          />
        ) : route.view === "saved" ? (
          <div className="explorer-page">
            <PageHeading
              eyebrow="COLLECTION"
              title="留给下一次好奇"
              description={`${store.saved.length} 个收藏体验`}
            />
            {store.saved.length ? (
              <div className="experience-grid">
                {store.saved.map((id) => (
                  <ExperienceCard
                    key={id}
                    experience={EXPERIENCE_BY_ID.get(id)!}
                    saved
                    onOpen={open}
                    onToggleSave={toggleSave}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                Icon={Bookmark}
                title="把感兴趣的世界留在这里"
                text="收藏的体验会出现在这里。"
                action="去探索"
                onAction={() => navigate("explore")}
              />
            )}
          </div>
        ) : route.view === "journal" ? (
          <div className="explorer-page">
            <PageHeading
              eyebrow="EXPLORATION LOG"
              title="每一次探索，都有迹可循"
              description="观察、实验和自己的想法，都留在这里。"
            />
            <div className="explorer-stats">
              <div>
                <strong>{recent.length}</strong>
                <span>体验足迹</span>
              </div>
              <div>
                <strong>{store.discoveries.length}</strong>
                <span>发现与记录</span>
              </div>
              <div>
                <strong>
                  {formatDuration(
                    store.sessions
                      .filter((entry) => !entry.id.startsWith("legacy-"))
                      .reduce((sum, entry) => sum + entry.seconds, 0),
                  )}
                </strong>
                <span>前台探索时间</span>
              </div>
              <button
                className="ex-button ex-button-secondary"
                onClick={exportRecords}
              >
                <Download size={16} />
                导出记录
              </button>
            </div>
            {recent.length > 0 && (
              <section className="explorer-section">
                <div className="section-heading">
                  <h2>继续上次的探索</h2>
                    <span>{recent.length} 个体验</span>
                </div>
                <div className="recent-experiences">
                  {recent.slice(0, 6).map((id) => {
                    const experience = EXPERIENCE_BY_ID.get(id)!;
                    return (
                      <button key={id} onClick={() => open(experience)}>
                        <span style={{ background: experience.accent }} />
                        <div>
                          <strong>{experience.title}</strong>
                          <small>
                            {
                              store.discoveries.filter(
                                (entry) => entry.moduleId === id,
                              ).length
                            }{" "}
                            条记录
                          </small>
                        </div>
                        <ArrowUpRight size={18} />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="explorer-section">
              <div className="section-heading">
                <h2>我的发现</h2>
                <span>{store.discoveries.length} 条</span>
              </div>
              {store.discoveries.length ? (
                <DiscoveryList
                  entries={store.discoveries}
                  onOpen={(id) => open(EXPERIENCE_BY_ID.get(id)!)}
                />
              ) : (
                <EmptyState
                  Icon={FileText}
                  title="还没有留下发现"
                  text="完成观察、验证实验，或在体验中的探索笔记写下想法。"
                  action="开始探索"
                  onAction={() => navigate("explore")}
                />
              )}
            </section>
          </div>
        ) : route.view === "growth" ? (
          <div className="explorer-family">
            <div className="explorer-family-heading">
              <button
                className="ex-button ex-button-secondary"
                onClick={() => navigate("explore")}
              >
                <ArrowLeft size={16} />
                返回探索
              </button>
              <span>家庭成长计划</span>
            </div>
            <ErrorBoundary onReset={() => navigate("explore")}>
              <Suspense
                fallback={
                  <div className="experience-loading">
                    <Loader2 className="animate-spin" />
                  </div>
                }
              >
                <SummerGardenView />
              </Suspense>
            </ErrorBoundary>
          </div>
        ) : (
          <div className="explorer-page settings-page">
            <PageHeading
              eyebrow="PREFERENCES"
              title="你的探索空间"
              description="偏好、记录与家庭计划。"
            />
            <section className="settings-section">
              <h2>体验偏好</h2>
              <label className="settings-row">
                <div>
                  <strong>减少动态效果</strong>
                  <p>首页停止自动旋转，实验默认暂停。场景仍可手动操作。</p>
                </div>
                <input
                  type="checkbox"
                  role="switch"
                  checked={store.reducedMotion}
                  onChange={(event) =>
                    update((current) => ({
                      ...current,
                      reducedMotion: event.target.checked,
                    }))
                  }
                />
              </label>
            </section>
            <section className="settings-section">
              <h2>探索数据</h2>
              <div className="settings-row">
                <div>
                  <strong>保存在当前浏览器</strong>
                  <p>
                    足迹、收藏和笔记不会自动同步到其他设备。导出备份后，可以在另一台设备合并导入。
                  </p>
                </div>
                <CheckCircle2 size={21} />
              </div>
              <div className="settings-buttons">
                <button
                  className="ex-button ex-button-secondary"
                  onClick={exportRecords}
                >
                  <Download size={16} />
                  导出探索记录
                </button>
                <button
                  className="ex-button ex-button-secondary"
                  onClick={() => importInput.current?.click()}
                >
                  <Upload size={16} />
                  合并导入备份
                </button>
              </div>
              <input
                ref={importInput}
                type="file"
                accept="application/json,.json"
                onChange={importRecords}
                hidden
              />
            </section>
            <DataStatusPanel />
            <section className="settings-section">
              <h2>家庭计划</h2>
              <div className="settings-row">
                <div>
                  <strong>成长花园</strong>
                  <p>
                    原有任务、阳光和家庭同步均保留，探索记录与家庭计划目前分别保存。
                  </p>
                </div>
                <button
                  className="ex-icon"
                  aria-label="打开成长花园"
                  title="打开成长花园"
                  onClick={() => navigate("growth")}
                >
                  <ArrowUpRight size={21} />
                </button>
              </div>
            </section>
            <footer className="explorer-about">
              <BrandLogo inverse />
              <p>ExBeam · 互动探索空间</p>
              <a href="https://exbeam.com" target="_blank" rel="noreferrer">
                exbeam.com <ArrowUpRight size={13} />
              </a>
            </footer>
          </div>
        )}
      </main>

      {!item && (
        <footer className="explorer-footer">
          <span>ExBeam</span>
          <span>让好奇心有处可去。</span>
          <button onClick={() => navigate("settings")}>
            <MoreHorizontal size={17} />
            偏好与数据
          </button>
        </footer>
      )}
      {notice && (
        <div className="explorer-toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {item && dialog && (
        <ExplorerDialog
          title={dialog === "guide" ? "这次探索什么" : "探索笔记"}
          onClose={() => setDialog(null)}
        >
          {dialog === "guide" ? (
            <div className="experience-guide">
              <span className="explorer-eyebrow">{item.title}</span>
              <h3>{item.prompt}</h3>
              <p>{item.description}</p>
              <button
                className="ex-button ex-button-primary"
                onClick={() => setDialog(null)}
              >
                回到体验
                <ArrowUpRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="notebook-editor">
                <label htmlFor="explorer-note">
                  关于「{item.title}」的新发现
                </label>
                <textarea
                  id="explorer-note"
                  maxLength={2000}
                  value={store.drafts[item.id] || ""}
                  placeholder="我注意到……我还想知道……"
                  onChange={(event) =>
                    update((current) => ({
                      ...current,
                      drafts: {
                        ...current.drafts,
                        [item.id]: event.target.value,
                      },
                    }))
                  }
                />
                <div>
                  <span>
                    草稿{storageAvailable ? "已保存在本机" : "暂未保存"} ·{" "}
                    {(store.drafts[item.id] || "").length}/2000
                  </span>
                  <button
                    className="ex-button ex-button-primary"
                    disabled={!(store.drafts[item.id] || "").trim()}
                    onClick={() => {
                      const note = store.drafts[item.id].trim();
                      record({
                        key: `note-${newId()}`,
                        kind: "note",
                        title: `${item.title}的发现`,
                        detail: note,
                      });
                      update((current) => ({
                        ...current,
                        drafts: { ...current.drafts, [item.id]: "" },
                      }));
                      setNotice("发现已加入我的足迹");
                    }}
                  >
                    保存记录
                    <Check size={15} />
                  </button>
                </div>
              </div>
              <div className="notebook-history">
                <h3>
                  这段旅程的记录 <span>{discoveries.length}</span>
                </h3>
                {discoveries.length ? (
                  <DiscoveryList entries={discoveries} />
                ) : (
                  <p>还没有记录，先写下第一条发现。</p>
                )}
              </div>
            </>
          )}
        </ExplorerDialog>
      )}
    </div>
  );
}

function PageHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="explorer-page-heading">
      <span className="explorer-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  );
}
function EmptyState({
  Icon,
  title,
  text,
  action,
  onAction,
}: {
  Icon: React.ComponentType<{ size?: number }>;
  title: string;
  text: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="explorer-empty">
      <Icon size={30} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="ex-button ex-button-primary" onClick={onAction}>
        {action}
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
}
function DiscoveryList({
  entries,
  onOpen,
}: {
  entries: Discovery[];
  onOpen?: (id: string) => void;
}) {
  const [visible, setVisible] = useState(24);
  return (
    <>
      <div className="discovery-list">
        {entries.slice(0, visible).map((entry) => (
          <article key={entry.id}>
            <div className="discovery-meta">
              <span>{KIND_LABELS[entry.kind]}</span>
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </div>
            <h3>{entry.title}</h3>
            <p>{entry.detail}</p>
            {onOpen && (
              <button onClick={() => onOpen(entry.moduleId)}>
                {EXPERIENCE_BY_ID.get(entry.moduleId)?.title}
                <ArrowUpRight size={13} />
              </button>
            )}
          </article>
        ))}
      </div>
      {entries.length > visible && (
        <button
          className="ex-button ex-button-secondary discovery-more"
          onClick={() => setVisible((value) => value + 24)}
        >
          显示更多记录（还有 {entries.length - visible} 条）
        </button>
      )}
    </>
  );
}
