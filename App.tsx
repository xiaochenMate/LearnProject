import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Clock3,
  Compass,
  Flame,
  Gamepad2,
  GraduationCap,
  LayoutGrid,
  Loader2,
  Moon,
  Play,
  Search,
  Settings,
  Sun,
  Wrench,
  X,
} from 'lucide-react';
import { EDUCATION_ITEMS, ENTERTAINMENT_ITEMS, UTILITIES_ITEMS } from './constants';
import { AppItem, Category } from './types';
import AppCard from './components/AppCard';
import BrandLogo, { BrandMark } from './components/BrandLogo';
import ErrorBoundary from './components/ErrorBoundary';
import Modal from './components/Modal';
import ModuleIcon from './components/ModuleIcon';
import {
  CATEGORY_META,
  formatFocusTime,
  getModuleMeta,
  getStreak,
  getWeekSeconds,
  UsageMap,
} from './lib/product';

const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const refreshed = sessionStorage.getItem('exbeam-chunk-refresh') === 'true';
    try {
      const component = await componentImport();
      sessionStorage.setItem('exbeam-chunk-refresh', 'false');
      return component;
    } catch (error) {
      if (!refreshed) {
        sessionStorage.setItem('exbeam-chunk-refresh', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

const Earth3D = lazyWithRetry(() => import('./components/Earth3D'));
const FoodChainApp = lazyWithRetry(() => import('./components/FoodChainApp'));
const WaveApp = lazyWithRetry(() => import('./components/WaveApp'));
const CharacterApp = lazyWithRetry(() => import('./components/CharacterApp'));
const PoetryApp = lazyWithRetry(() => import('./components/PoetryApp'));
const HistorySortingApp = lazyWithRetry(() => import('./components/HistorySortingApp'));
const ClockApp = lazyWithRetry(() => import('./components/ClockApp'));
const MathSprintApp = lazyWithRetry(() => import('./components/MathSprintApp'));
const ThreeCharacterApp = lazyWithRetry(() => import('./components/ThreeCharacterApp'));
const ThousandCharacterApp = lazyWithRetry(() => import('./components/ThousandCharacterApp'));
const BrainTeaseApp = lazyWithRetry(() => import('./components/BrainTeaseApp'));
const GobangApp = lazyWithRetry(() => import('./components/GobangApp'));
const ChineseChessApp = lazyWithRetry(() => import('./components/ChineseChessApp'));
const ChessApp = lazyWithRetry(() => import('./components/ChessApp'));
const GoApp = lazyWithRetry(() => import('./components/GoApp'));
const ProArtApp = lazyWithRetry(() => import('./components/ProArtApp'));
const VocabularyApp = lazyWithRetry(() => import('./components/VocabularyApp'));
const IdiomApp = lazyWithRetry(() => import('./components/IdiomApp'));
const CurrencyConverterApp = lazyWithRetry(() => import('./components/CurrencyConverterApp'));
const LibraryView = lazyWithRetry(() => import('./components/LibraryView'));
const SettingsView = lazyWithRetry(() => import('./components/SettingsView'));
const ExploreView = lazyWithRetry(() => import('./components/ExploreView'));
const SummerGardenView = lazyWithRetry(() => import('./components/SummerGardenView'));

type Tab = 'HOME' | 'EXPLORE' | 'LIBRARY' | 'SETTINGS';
type Theme = 'light' | 'dark';
type CategoryFilter = 'all' | Category;

const STORAGE = {
  theme: 'exbeam.theme.v1',
  saved: 'exbeam.saved.v1',
  history: 'exbeam.history.v1',
  usage: 'exbeam.usage.v1',
};

const safeStorage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The product remains usable when storage is unavailable.
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore unavailable storage.
    }
  },
};

const readJson = <T,>(key: string, fallback: T): T => {
  const value = safeStorage.get(key);
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const NAV_ITEMS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'HOME', label: '暑假', icon: <LayoutGrid size={18} /> },
  { id: 'EXPLORE', label: '探索', icon: <Compass size={18} /> },
  { id: 'LIBRARY', label: '资源库', icon: <Bookmark size={18} /> },
  { id: 'SETTINGS', label: '设置', icon: <Settings size={18} /> },
];

const FILTERS: Array<{ id: CategoryFilter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: '全部', icon: <LayoutGrid size={15} /> },
  { id: 'education', label: '学习', icon: <GraduationCap size={15} /> },
  { id: 'entertainment', label: '对弈', icon: <Gamepad2 size={15} /> },
  { id: 'utilities', label: '工具', icon: <Wrench size={15} /> },
];

const LoadingOverlay = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#F7F8FC] dark:bg-[#0B0D12]">
    <div className="flex items-center gap-3 text-sm font-medium text-[#69707D] dark:text-white/55">
      <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
      正在打开模块
    </div>
  </div>
);

const App: React.FC = () => {
  const allModules = useMemo(() => [...EDUCATION_ITEMS, ...ENTERTAINMENT_ITEMS, ...UTILITIES_ITEMS], []);
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [selectedItem, setSelectedItem] = useState<AppItem | null>(null);
  const [runningAppId, setRunningAppId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [theme, setTheme] = useState<Theme>(() => {
    return (safeStorage.get(STORAGE.theme) || safeStorage.get('zst_theme') || 'light') as Theme;
  });
  const [savedIds, setSavedIds] = useState<string[]>(() =>
    readJson(STORAGE.saved, readJson<string[]>('zst_saved_v2', []))
  );
  const [historyIds, setHistoryIds] = useState<string[]>(() =>
    readJson(STORAGE.history, readJson<string[]>('zst_history_v2', []))
  );
  const [usage, setUsage] = useState<UsageMap>(() => readJson<UsageMap>(STORAGE.usage, {}));
  const sessionRef = useRef<{ id: string; startedAt: number; iso: string } | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeStorage.set(STORAGE.theme, theme);
  }, [theme]);

  useEffect(() => safeStorage.set(STORAGE.saved, JSON.stringify(savedIds)), [savedIds]);
  useEffect(() => safeStorage.set(STORAGE.history, JSON.stringify(historyIds)), [historyIds]);
  useEffect(() => safeStorage.set(STORAGE.usage, JSON.stringify(usage)), [usage]);

  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get('module');
    const requested = allModules.find(item => item.id === requestedId);
    if (requested) setSelectedItem(requested);
  }, [allModules]);

  useEffect(() => {
    if (!runningAppId) return;
    setSessionElapsed(0);
    const timer = window.setInterval(() => {
      const active = sessionRef.current;
      if (active) setSessionElapsed(Math.max(0, Math.floor((Date.now() - active.startedAt) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [runningAppId]);

  const handleToggleSave = (id: string) => {
    setSavedIds(current => (current.includes(id) ? current.filter(itemId => itemId !== id) : [id, ...current]));
  };

  const handleRunApp = (item: AppItem) => {
    const now = new Date();
    setSelectedItem(null);
    setHistoryIds(current => [item.id, ...current.filter(id => id !== item.id)].slice(0, 30));
    setUsage(current => {
      const previous = current[item.id];
      return {
        ...current,
        [item.id]: {
          launches: (previous?.launches || 0) + 1,
          totalSeconds: previous?.totalSeconds || 0,
          lastOpened: now.toISOString(),
          sessions: previous?.sessions || [],
        },
      };
    });
    sessionRef.current = { id: item.id, startedAt: Date.now(), iso: now.toISOString() };
    setRunningAppId(item.id);
  };

  const closeRunningApp = useCallback(() => {
    const active = sessionRef.current;
    if (active) {
      const seconds = Math.max(1, Math.floor((Date.now() - active.startedAt) / 1000));
      setUsage(current => {
        const previous = current[active.id] || {
          launches: 1,
          totalSeconds: 0,
          lastOpened: active.iso,
          sessions: [],
        };
        return {
          ...current,
          [active.id]: {
            ...previous,
            totalSeconds: previous.totalSeconds + seconds,
            sessions: [{ startedAt: active.iso, seconds }, ...previous.sessions].slice(0, 100),
          },
        };
      });
    }
    sessionRef.current = null;
    setRunningAppId(null);
    setSessionElapsed(0);
  }, []);

  const resetProductData = () => {
    Object.values(STORAGE).forEach(key => safeStorage.remove(key));
    setSavedIds([]);
    setHistoryIds([]);
    setUsage({});
  };

  const filteredModules = allModules.filter(item => {
    const query = searchQuery.trim().toLowerCase();
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  const recentItems = historyIds
    .map(id => allModules.find(item => item.id === id))
    .filter(Boolean) as AppItem[];
  const continueItem = recentItems[0] || allModules.find(item => item.id === 'e20') || allModules[0];
  const planItems = [
    continueItem,
    allModules.find(item => item.id === 'u2'),
    allModules.find(item => item.id === 'e18'),
  ].filter((item, index, list): item is AppItem => Boolean(item) && list.findIndex(other => other?.id === item?.id) === index);

  const touchedCount = Object.values(usage).filter(item => item.launches > 0).length;
  const weekSeconds = getWeekSeconds(usage);
  const streak = getStreak(usage);

  const renderModule = () => (
    <ErrorBoundary onReset={closeRunningApp}>
      <Suspense fallback={<LoadingOverlay />}>
        {(() => {
          switch (runningAppId) {
            case 'e1': return <Earth3D onClose={closeRunningApp} />;
            case 'e2': return <FoodChainApp onClose={closeRunningApp} />;
            case 'e3': return <WaveApp onClose={closeRunningApp} />;
            case 'e4': return <CharacterApp onClose={closeRunningApp} />;
            case 'e5': return <PoetryApp onClose={closeRunningApp} />;
            case 'e6': return <HistorySortingApp onClose={closeRunningApp} />;
            case 'e7': return <ClockApp onClose={closeRunningApp} />;
            case 'e18': return <MathSprintApp onClose={closeRunningApp} />;
            case 'e20': return <ThreeCharacterApp onClose={closeRunningApp} />;
            case 'e21': return <ThousandCharacterApp onClose={closeRunningApp} />;
            case 'ent3': return <BrainTeaseApp onClose={closeRunningApp} />;
            case 'ent4': return <GobangApp onClose={closeRunningApp} />;
            case 'ent5': return <ChineseChessApp onClose={closeRunningApp} />;
            case 'ent6': return <ChessApp onClose={closeRunningApp} />;
            case 'ent7': return <GoApp onClose={closeRunningApp} />;
            case 'u1': return <ProArtApp onClose={closeRunningApp} />;
            case 'u2': return <VocabularyApp onClose={closeRunningApp} />;
            case 'u3': return <IdiomApp onClose={closeRunningApp} />;
            case 'u4': return <CurrencyConverterApp onClose={closeRunningApp} />;
            default: return null;
          }
        })()}
      </Suspense>
    </ErrorBoundary>
  );

  if (runningAppId) {
    const item = allModules.find(module => module.id === runningAppId);
    if (!item) return null;
    const minutes = Math.floor(sessionElapsed / 60).toString().padStart(2, '0');
    const seconds = (sessionElapsed % 60).toString().padStart(2, '0');

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-[#F7F8FC] text-[#111318] dark:bg-[#0B0D12] dark:text-white">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#E5E7EB] bg-white px-3 dark:border-white/10 dark:bg-[#111318] md:h-16 md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
                <div className="hidden text-[10px] font-medium text-[#7A8190] dark:text-white/40 sm:block">
                ExBeam / {CATEGORY_META[item.category].label}
              </div>
              <h1 className="truncate text-sm font-semibold md:text-base">{item.title}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="mr-1 hidden items-center gap-1.5 text-xs text-[#6C7973] dark:text-white/45 sm:flex">
              <Clock3 size={14} />
              <span>{minutes}:{seconds}</span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleSave(item.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-md ${
                savedIds.includes(item.id)
                  ? 'bg-[#EEF2FF] text-[#2563EB] dark:bg-[#2563EB]/20'
                  : 'text-[#69707D] hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10'
              }`}
              aria-label={savedIds.includes(item.id) ? '取消收藏' : '收藏'}
              title={savedIds.includes(item.id) ? '取消收藏' : '收藏'}
            >
              <Bookmark size={17} fill={savedIds.includes(item.id) ? 'currentColor' : 'none'} />
            </button>
            <button
              type="button"
              onClick={closeRunningApp}
              className="flex h-9 w-9 items-center justify-center rounded-md text-[#69707D] hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              aria-label="退出模块"
              title="退出模块"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <main className="module-stage relative flex min-h-0 flex-1 flex-col overflow-hidden">{renderModule()}</main>
      </div>
    );
  }

  const renderHome = () => (
    <div className="w-full pb-24">
      <header className="mb-7">
        <div className="text-xs font-semibold text-[#2563EB] dark:text-[#8EACFF]">今天 · 个人学习工作台</div>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-semibold leading-tight text-[#111318] dark:text-white md:text-4xl">今天想专注什么？</h1>
            <p className="mt-3 text-sm text-[#69707D] dark:text-white/55">选一件事开始，ExBeam 会替你记录投入。</p>
          </div>
          <button
            type="button"
            onClick={() => handleRunApp(continueItem)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(37,99,235,0.22)] hover:bg-[#1D4ED8] md:w-auto"
          >
            <Play size={16} fill="currentColor" />
            {recentItems.length ? '继续上次练习' : '开始第一个模块'}
          </button>
        </div>
      </header>

      <section className="mb-8 grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="rounded-lg border border-[#E2E5EA] bg-white p-5 shadow-[0_8px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#15171C] md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#2563EB] dark:text-[#8EACFF]">{recentItems.length ? '继续进行' : '推荐开始'}</div>
              <h2 className="mt-2 text-xl font-semibold text-[#111318] dark:text-white">{continueItem.title}</h2>
              <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-6 text-[#69707D] dark:text-white/55">{getModuleMeta(continueItem).outcome}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-[#8EACFF]">
              <ModuleIcon name={continueItem.icon} size={24} />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#ECEEF2] pt-4 dark:border-white/10">
            <div className="flex items-center gap-2 text-xs text-[#7A8190] dark:text-white/45">
              <Clock3 size={14} />
              建议 {getModuleMeta(continueItem).minutes} 分钟
            </div>
            <button type="button" onClick={() => handleRunApp(continueItem)} className="flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              开始
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]">
          {[
            { label: '连续天数', value: streak, unit: '天', icon: <Flame size={17} /> },
            { label: '本周专注', value: formatFocusTime(weekSeconds), unit: '', icon: <Clock3 size={17} /> },
            { label: '已探索', value: touchedCount, unit: '个', icon: <Compass size={17} /> },
          ].map((stat, index) => (
            <div key={stat.label} className={`flex min-w-0 flex-col justify-center p-4 ${index ? 'border-l border-[#ECEEF2] dark:border-white/10' : ''}`}>
              <div className="text-[#2563EB] dark:text-[#8EACFF]">{stat.icon}</div>
              <div className="mt-4 truncate text-lg font-semibold text-[#111318] dark:text-white">
                {stat.value}{stat.unit}
              </div>
              <div className="mt-1 text-[11px] text-[#7A8190] dark:text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-9">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#111318] dark:text-white">今日计划</h2>
            <p className="mt-1 text-sm text-[#7A8190] dark:text-white/45">一个主任务，加两个轻量补充。</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {planItems.map((item, index) => (
            <button
              type="button"
              key={item.id}
              onClick={() => handleRunApp(item)}
              className="flex min-w-0 items-center gap-3 rounded-lg border border-[#E2E5EA] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#BEC5D0] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#15171C] dark:hover:border-white/20"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0F3F9] text-[#566074] dark:bg-white/[0.07] dark:text-white/60">
                <ModuleIcon name={item.icon} size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-[#7A8190] dark:text-white/40">任务 {index + 1}</div>
                <div className="mt-1 truncate text-sm font-semibold text-[#111318] dark:text-white">{item.title}</div>
              </div>
              <ArrowRight size={15} className="shrink-0 text-[#9AA1AE]" />
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111318] dark:text-white">所有模块</h2>
              <p className="mt-1 text-sm text-[#7A8190] dark:text-white/45">选择一个明确目标，直接开始。</p>
            </div>
            <span className="text-xs text-[#7A8190] dark:text-white/40">{filteredModules.length} 个结果</span>
          </div>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B92A0]" size={17} />
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜索模块、主题或能力"
              className="h-11 w-full rounded-lg border border-[#DDE1E8] bg-white pl-10 pr-4 text-sm text-[#111318] outline-none transition-colors focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-white/10 dark:bg-[#15171C] dark:text-white"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveCategory(option.id)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium ${
                  activeCategory === option.id
                    ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.18)]'
                    : 'border-[#DDE1E8] bg-white text-[#69707D] hover:border-[#BEC5D0] dark:border-white/10 dark:bg-[#15171C] dark:text-white/60'
                }`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {filteredModules.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredModules.map(item => (
              <AppCard
                key={item.id}
                item={item}
                usage={usage[item.id]}
                isSaved={savedIds.includes(item.id)}
                onOpen={setSelectedItem}
                onRun={handleRunApp}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[#C8D4CD] px-6 py-16 text-center text-sm text-[#71807A] dark:border-white/15">
            没有找到匹配模块，换个关键词试试。
          </div>
        )}
      </section>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F8FC] text-[#111318] transition-colors dark:bg-[#0B0D12] dark:text-white">
      <aside className="hidden w-[232px] shrink-0 flex-col border-r border-[#E6E8EC] bg-white p-4 dark:border-white/10 dark:bg-[#101217] md:flex">
        <div className="px-2 py-2">
          <BrandLogo />
        </div>
        <nav className="mt-8 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-[#EEF2FF] text-[#2563EB]'
                  : 'text-[#69707D] hover:bg-[#F4F6FA] hover:text-[#111318] dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FC] p-3 dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-center gap-2 text-xs font-medium text-[#4B5565] dark:text-white/65">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              学习记录已开启
            </div>
            <p className="mt-2 text-[11px] leading-5 text-[#8B92A0] dark:text-white/35">暑假工作台可家庭同步，其他记录保存在当前设备。</p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(current => (current === 'light' ? 'dark' : 'light'))}
            className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-[#69707D] hover:bg-[#F4F6FA] dark:text-white/50 dark:hover:bg-white/[0.06]"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            {theme === 'light' ? '暗色模式' : '亮色模式'}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#E6E8EC] bg-white/95 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0B0D12]/95 md:hidden">
          <BrandLogo />
          <button
            type="button"
            onClick={() => setTheme(current => (current === 'light' ? 'dark' : 'light'))}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#69707D] dark:text-white/55"
            aria-label="切换主题"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <div className="mx-auto flex min-h-full w-full max-w-[1180px] flex-col px-4 py-7 sm:px-6 md:px-8 md:py-10 lg:px-10">
          <Suspense fallback={<LoadingOverlay />}>
            {activeTab === 'HOME' && <SummerGardenView />}
            {activeTab === 'EXPLORE' && (
              <ExploreView
                allModules={allModules}
                usage={usage}
                onOpenItem={setSelectedItem}
                onRunItem={handleRunApp}
              />
            )}
            {activeTab === 'LIBRARY' && (
              <LibraryView
                allModules={allModules}
                savedIds={savedIds}
                historyIds={historyIds}
                usage={usage}
                onOpenItem={setSelectedItem}
                onRunItem={handleRunApp}
                onToggleSave={handleToggleSave}
                onClearHistory={() => setHistoryIds([])}
              />
            )}
            {activeTab === 'SETTINGS' && (
              <SettingsView
                theme={theme}
                usage={usage}
                savedCount={savedIds.length}
                historyCount={historyIds.length}
                onToggleTheme={() => setTheme(current => (current === 'light' ? 'dark' : 'light'))}
                onResetData={resetProductData}
              />
            )}
          </Suspense>
        </div>
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[#E6E8EC] bg-white/95 px-2 pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-white/10 dark:bg-[#101217]/95 md:hidden">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            className={`flex min-w-0 flex-col items-center gap-1 py-1.5 text-[10px] font-medium ${
              activeTab === item.id ? 'text-[#2563EB] dark:text-[#8EACFF]' : 'text-[#8B92A0] dark:text-white/35'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {selectedItem && (
        <Modal
          item={selectedItem}
          isSaved={savedIds.includes(selectedItem.id)}
          usage={usage[selectedItem.id]}
          onToggleSave={handleToggleSave}
          onClose={() => setSelectedItem(null)}
          onRun={handleRunApp}
        />
      )}
    </div>
  );
};

export default App;
