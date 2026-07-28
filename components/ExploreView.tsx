import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Compass,
  FlaskConical,
  Gamepad2,
  Search,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { AppItem, Category } from '../types';
import { CATEGORY_META, getModuleMeta, LEARNING_PATHS, UsageMap } from '../lib/product';
import ModuleIcon from './ModuleIcon';

interface ExploreViewProps {
  allModules: AppItem[];
  usage: UsageMap;
  onOpenItem: (item: AppItem) => void;
  onRunItem: (item: AppItem) => void;
}

type ExploreFilter = 'all' | Category;

const PATH_STYLES = {
  forest: 'bg-[#ECFDF5] text-[#047857] border-[#C7F1DE]',
  coral: 'bg-[#FFF1ED] text-[#C24126] border-[#FED7CC]',
  sky: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#D6E4FF]',
  gold: 'bg-[#F5F3FF] text-[#6D28D9] border-[#E4DEFF]',
};

const FILTERS: Array<{ id: ExploreFilter; label: string; icon: React.ReactNode }> = [
  { id: 'all', label: '全部', icon: <Shapes size={15} /> },
  { id: 'education', label: '知识学习', icon: <BookOpen size={15} /> },
  { id: 'entertainment', label: '策略练习', icon: <Gamepad2 size={15} /> },
  { id: 'utilities', label: '实用工具', icon: <FlaskConical size={15} /> },
];

const ExploreView: React.FC<ExploreViewProps> = ({ allModules, usage, onOpenItem, onRunItem }) => {
  const [filter, setFilter] = useState<ExploreFilter>('all');
  const [query, setQuery] = useState('');

  const dailyModule = allModules[new Date().getDate() % Math.max(allModules.length, 1)];
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allModules.filter(item => {
      const matchesFilter = filter === 'all' || item.category === filter;
      const matchesQuery =
        !normalized ||
        item.title.toLowerCase().includes(normalized) ||
        item.tags.some(tag => tag.toLowerCase().includes(normalized));
      return matchesFilter && matchesQuery;
    });
  }, [allModules, filter, query]);

  const nextInPath = (moduleIds: string[]) => {
    const nextId = moduleIds.find(id => !usage[id]?.launches) || moduleIds[0];
    return allModules.find(item => item.id === nextId);
  };

  return (
    <div className="w-full pb-24">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#2563EB] dark:text-[#8EACFF]">
          <Compass size={15} />
          <span>按目标发现内容</span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-[#111318] dark:text-white md:text-4xl">探索</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#69707D] dark:text-white/55">
          从你想获得的能力出发，选择一条路径，ExBeam 会记录每一次练习。
        </p>
      </header>

      {dailyModule && (
        <section className="mb-10 grid overflow-hidden rounded-lg border border-[#1E3A8A] bg-[#0F172A] text-white shadow-[0_12px_34px_rgba(15,23,42,0.16)] md:grid-cols-[1fr_280px]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-2 text-xs font-medium text-white/60">
              <Sparkles size={15} />
              今日换个方向
            </div>
            <h2 className="mt-4 text-2xl font-semibold">{dailyModule.title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-white/65">{getModuleMeta(dailyModule).outcome}</p>
            <button
              type="button"
              onClick={() => onRunItem(dailyModule)}
              className="mt-6 flex h-10 items-center gap-2 rounded-lg bg-[#4F7CFF] px-4 text-sm font-semibold text-white hover:bg-[#3B68E8]"
            >
              开始 {getModuleMeta(dailyModule).minutes} 分钟练习
              <ArrowRight size={15} />
            </button>
          </div>
          <div className="relative hidden items-center justify-center border-l border-white/10 md:flex">
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-white/15 bg-white/[0.07] text-[#8EACFF]">
              <ModuleIcon name={dailyModule.icon} size={44} strokeWidth={1.5} />
            </div>
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#111318] dark:text-white">学习路径</h2>
            <p className="mt-1 text-sm text-[#7A8190] dark:text-white/45">一组有顺序的模块，比随机打开更容易形成结果。</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {LEARNING_PATHS.map(path => {
            const completed = path.moduleIds.filter(id => usage[id]?.launches).length;
            const next = nextInPath(path.moduleIds);
            const progress = Math.round((completed / path.moduleIds.length) * 100);

            return (
              <article key={path.id} className={`rounded-lg border p-5 ${PATH_STYLES[path.tone]}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold opacity-65">{path.outcome}</div>
                    <h3 className="mt-2 text-xl font-semibold">{path.title}</h3>
                    <p className="mt-2 text-sm leading-6 opacity-75">{path.description}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/55">
                    {completed === path.moduleIds.length ? <Check size={19} /> : <BookOpen size={19} />}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[11px] font-medium">
                    <span>{completed}/{path.moduleIds.length} 个模块已开始</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/10">
                    <div className="h-full rounded-full bg-current transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                {next && (
                  <button
                    type="button"
                    onClick={() => onRunItem(next)}
                    className="mt-5 flex items-center gap-2 text-sm font-semibold hover:opacity-70"
                  >
                    {completed ? '继续路径' : '开始路径'}
                    <ArrowRight size={15} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-[#111318] dark:text-white">浏览全部</h2>
          <p className="mt-1 text-sm text-[#7A8190] dark:text-white/45">按领域筛选，找到适合当前状态的练习。</p>
        </div>

        <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="relative block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B92A0]" size={17} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="搜索主题或能力"
              className="h-11 w-full rounded-lg border border-[#DDE1E8] bg-white pl-10 pr-4 text-sm text-[#111318] outline-none transition-colors focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-white/10 dark:bg-[#15171C] dark:text-white"
            />
          </label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {FILTERS.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium ${
                  filter === option.id
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

        <div className="divide-y divide-[#ECEEF2] rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:divide-white/10 dark:border-white/10 dark:bg-[#15171C]">
          {filtered.map(item => {
            const meta = getModuleMeta(item);
            return (
              <div key={item.id} className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0F3F9] text-[#566074] dark:bg-white/[0.07] dark:text-white/60">
                  <ModuleIcon name={item.icon} size={20} />
                </div>
                <button type="button" onClick={() => onOpenItem(item)} className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold text-[#111318] dark:text-white">{item.title}</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-[#7A8190] dark:text-white/40">
                    <span>{CATEGORY_META[item.category].label}</span>
                    <span>·</span>
                    <Clock3 size={12} />
                    <span>{meta.minutes} 分钟</span>
                    <span>·</span>
                    <span>{meta.level}</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onRunItem(item)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-[#D7DAE0] px-3 text-xs font-semibold text-[#2563EB] hover:bg-[#F5F7FF] dark:border-white/10 dark:text-[#8EACFF] dark:hover:bg-white/[0.06]"
                >
                  开始
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-sm text-[#7A8190]">没有找到匹配内容，换个关键词试试。</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ExploreView;
