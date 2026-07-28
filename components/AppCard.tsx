import React from 'react';
import { ArrowUpRight, Bookmark, Clock3, Play } from 'lucide-react';
import { AppItem } from '../types';
import { CATEGORY_META, getModuleMeta, ModuleUsage } from '../lib/product';
import ModuleIcon from './ModuleIcon';

interface AppCardProps {
  item: AppItem;
  usage?: ModuleUsage;
  isSaved?: boolean;
  onOpen: (item: AppItem) => void;
  onRun: (item: AppItem) => void;
}

const CATEGORY_STYLE = {
  education: 'bg-[#EEF2FF] text-[#4F46E5]',
  entertainment: 'bg-[#FFF1ED] text-[#E05231]',
  utilities: 'bg-[#ECFEFF] text-[#0891B2]',
};

const AppCard: React.FC<AppCardProps> = ({ item, usage, isSaved = false, onOpen, onRun }) => {
  const meta = getModuleMeta(item);

  return (
    <article className="group flex min-h-[218px] flex-col rounded-lg border border-[#E4E7EC] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all hover:-translate-y-0.5 hover:border-[#C9CED8] hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#15171C] dark:hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${CATEGORY_STYLE[item.category]}`}>
          <ModuleIcon name={item.icon} size={22} />
        </div>
        <div className="flex items-center gap-2 text-[#7A8190] dark:text-white/45">
          {isSaved && <Bookmark size={15} fill="currentColor" aria-label="已收藏" />}
          <span className="rounded-md bg-[#F3F5F9] px-2 py-1 text-[11px] font-medium dark:bg-white/[0.06]">
            {meta.level}
          </span>
        </div>
      </div>

      <div className="mt-5 flex-1">
        <div className="text-[11px] font-medium text-[#7A8190] dark:text-white/45">
          {CATEGORY_META[item.category].label}
        </div>
        <h3 className="mt-1 line-clamp-1 text-base font-semibold text-[#111318] dark:text-white">{item.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#69707D] dark:text-white/55">{meta.outcome}</p>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#EEF0F4] pt-3 dark:border-white/[0.07]">
        <div className="flex items-center gap-1.5 text-xs text-[#7A8190] dark:text-white/45">
          <Clock3 size={14} />
          <span>{meta.minutes} 分钟</span>
          {usage?.launches ? <span>· 已练 {usage.launches} 次</span> : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[#69707D] transition-colors hover:bg-[#F3F5F9] hover:text-[#111318] dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={`查看 ${item.title} 详情`}
            title="查看详情"
          >
            <ArrowUpRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => onRun(item)}
            className="flex h-8 items-center gap-1.5 rounded-md bg-[#2563EB] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
          >
            <Play size={13} fill="currentColor" />
            开始
          </button>
        </div>
      </div>
    </article>
  );
};

export default AppCard;
