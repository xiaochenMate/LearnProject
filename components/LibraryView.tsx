import React, { useMemo, useState } from 'react';
import { Bookmark, CheckCircle2, Clock3, History, Play, Trash2 } from 'lucide-react';
import { AppItem } from '../types';
import { CATEGORY_META, formatFocusTime, getModuleMeta, UsageMap } from '../lib/product';
import ModuleIcon from './ModuleIcon';

interface LibraryViewProps {
  allModules: AppItem[];
  savedIds: string[];
  historyIds: string[];
  usage: UsageMap;
  onOpenItem: (item: AppItem) => void;
  onRunItem: (item: AppItem) => void;
  onToggleSave: (id: string) => void;
  onClearHistory: () => void;
}

type LibraryTab = 'PROGRESS' | 'SAVED' | 'HISTORY';

const LibraryView: React.FC<LibraryViewProps> = ({
  allModules,
  savedIds,
  historyIds,
  usage,
  onOpenItem,
  onRunItem,
  onToggleSave,
  onClearHistory,
}) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('PROGRESS');

  const savedItems = useMemo(() => allModules.filter(item => savedIds.includes(item.id)), [allModules, savedIds]);
  const historyItems = useMemo(
    () => historyIds.map(id => allModules.find(item => item.id === id)).filter(Boolean) as AppItem[],
    [allModules, historyIds]
  );
  const progressItems = useMemo(
    () =>
      allModules
        .filter(item => usage[item.id]?.launches)
        .sort((a, b) => (usage[b.id]?.lastOpened || '').localeCompare(usage[a.id]?.lastOpened || '')),
    [allModules, usage]
  );

  const currentList =
    activeTab === 'PROGRESS' ? progressItems : activeTab === 'SAVED' ? savedItems : historyItems;
  const totalSeconds = Object.values(usage).reduce((sum, item) => sum + item.totalSeconds, 0);
  const totalLaunches = Object.values(usage).reduce((sum, item) => sum + item.launches, 0);

  const TABS: Array<{ id: LibraryTab; label: string; count: number; icon: React.ReactNode }> = [
    { id: 'PROGRESS', label: '进行中', count: progressItems.length, icon: <CheckCircle2 size={16} /> },
    { id: 'SAVED', label: '收藏', count: savedItems.length, icon: <Bookmark size={16} /> },
    { id: 'HISTORY', label: '最近使用', count: historyItems.length, icon: <History size={16} /> },
  ];

  return (
    <div className="w-full pb-24">
      <header className="mb-8">
        <div className="text-xs font-semibold text-[#2563EB] dark:text-[#8EACFF]">个人学习记录</div>
        <h1 className="mt-3 text-3xl font-semibold text-[#111318] dark:text-white md:text-4xl">资源库</h1>
        <p className="mt-3 text-sm leading-7 text-[#69707D] dark:text-white/55">
          收藏只是入口，这里更重要的是看见自己正在进行的内容和真实投入。
        </p>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '已开始模块', value: progressItems.length },
          { label: '累计练习', value: `${totalLaunches} 次` },
          { label: '累计专注', value: formatFocusTime(totalSeconds) },
          { label: '已收藏', value: savedItems.length },
        ].map(stat => (
          <div key={stat.label} className="rounded-lg border border-[#E2E5EA] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]">
            <div className="text-xl font-semibold text-[#111318] dark:text-white">{stat.value}</div>
            <div className="mt-1 text-xs text-[#7A8190] dark:text-white/45">{stat.label}</div>
          </div>
        ))}
      </section>

      <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#E2E5EA] dark:border-white/10">
        <div className="flex gap-5 overflow-x-auto no-scrollbar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex shrink-0 items-center gap-2 pb-3 text-sm font-medium ${
                activeTab === tab.id ? 'text-[#2563EB] dark:text-[#8EACFF]' : 'text-[#7A8190] dark:text-white/45'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className="text-xs opacity-55">{tab.count}</span>
              {activeTab === tab.id && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#2563EB]" />}
            </button>
          ))}
        </div>
        {activeTab === 'HISTORY' && historyItems.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="mb-3 flex shrink-0 items-center gap-1.5 text-xs font-medium text-[#9A4B3D] hover:text-[#B43E2A]"
          >
            <Trash2 size={14} />
            清除记录
          </button>
        )}
      </div>

      {currentList.length > 0 ? (
        <div className="divide-y divide-[#ECEEF2] overflow-hidden rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:divide-white/10 dark:border-white/10 dark:bg-[#15171C]">
          {currentList.map(item => {
            const itemUsage = usage[item.id];
            const meta = getModuleMeta(item);
            const isSaved = savedIds.includes(item.id);
            return (
              <article key={item.id} className="flex items-center gap-4 p-4 md:p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#F0F3F9] text-[#566074] dark:bg-white/[0.07] dark:text-white/60">
                  <ModuleIcon name={item.icon} size={21} />
                </div>
                <button type="button" onClick={() => onOpenItem(item)} className="min-w-0 flex-1 text-left">
                  <h3 className="truncate text-sm font-semibold text-[#111318] dark:text-white">{item.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-[#7A8190] dark:text-white/40">
                    <span>{CATEGORY_META[item.category].label}</span>
                    <span>·</span>
                    <Clock3 size={12} />
                    <span>{itemUsage ? formatFocusTime(itemUsage.totalSeconds) : `${meta.minutes} 分钟`}</span>
                    {itemUsage?.launches ? <span>· {itemUsage.launches} 次练习</span> : null}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleSave(item.id)}
                  className={`hidden h-9 w-9 items-center justify-center rounded-md sm:flex ${
                    isSaved ? 'text-[#2563EB]' : 'text-[#9AA1AE] hover:bg-[#F3F5F9] dark:hover:bg-white/[0.06]'
                  }`}
                  aria-label={isSaved ? '取消收藏' : '收藏'}
                >
                  <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => onRunItem(item)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                >
                  <Play size={13} fill="currentColor" />
                  <span className="hidden sm:inline">继续</span>
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[#CCD1DA] px-6 py-16 text-center dark:border-white/15">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#F0F3F9] text-[#69707D] dark:bg-white/[0.07] dark:text-white/50">
            {activeTab === 'SAVED' ? <Bookmark size={21} /> : activeTab === 'HISTORY' ? <History size={21} /> : <CheckCircle2 size={21} />}
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[#1F2937] dark:text-white">
            {activeTab === 'SAVED' ? '还没有收藏' : activeTab === 'HISTORY' ? '还没有使用记录' : '还没有开始任何模块'}
          </h3>
          <p className="mt-2 text-sm text-[#7A8190] dark:text-white/45">从首页或探索中开始一次练习，记录会自动出现在这里。</p>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
