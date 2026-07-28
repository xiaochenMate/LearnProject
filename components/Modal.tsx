import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Clock3, History, Play, Share2, Target, X } from 'lucide-react';
import { AppItem } from '../types';
import { CATEGORY_META, formatFocusTime, getModuleMeta, ModuleUsage } from '../lib/product';
import ModuleIcon from './ModuleIcon';

interface ModalProps {
  item: AppItem;
  isSaved: boolean;
  usage?: ModuleUsage;
  onToggleSave: (id: string) => void;
  onClose: () => void;
  onRun: (item: AppItem) => void;
}

const Modal: React.FC<ModalProps> = ({ item, isSaved, usage, onToggleSave, onClose, onRun }) => {
  const [copied, setCopied] = useState(false);
  const meta = getModuleMeta(item);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const shareModule = async () => {
    const link = `https://exbeam.com/?module=${encodeURIComponent(item.id)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0F172A]/45 p-0 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="module-title"
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-lg border border-white/10 bg-[#FAFBFD] shadow-[0_24px_80px_rgba(15,23,42,0.22)] md:max-w-2xl md:rounded-lg dark:bg-[#111318]"
        onClick={event => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-6 border-b border-[#E5E7EB] p-5 dark:border-white/10 md:p-7">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#2563EB] dark:bg-[#2563EB]/20 dark:text-[#8EACFF]">
              <ModuleIcon name={item.icon} size={28} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#7A8190] dark:text-white/45">
                {CATEGORY_META[item.category].label} · {meta.level}
              </div>
              <h2 id="module-title" className="mt-1 text-xl font-semibold text-[#111318] dark:text-white md:text-2xl">
                {item.title}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#69707D] hover:bg-black/5 dark:text-white/55 dark:hover:bg-white/10"
            aria-label="关闭"
          >
            <X size={19} />
          </button>
        </header>

        <div className="p-5 md:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <Clock3 size={17} className="text-[#2563EB]" />
              <div className="mt-3 text-sm font-semibold dark:text-white">{meta.minutes} 分钟</div>
              <div className="mt-1 text-xs text-[#7A8190] dark:text-white/45">建议单次时长</div>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <History size={17} className="text-[#F25F3A]" />
              <div className="mt-3 text-sm font-semibold dark:text-white">{usage?.launches || 0} 次</div>
              <div className="mt-1 text-xs text-[#7A8190] dark:text-white/45">累计练习</div>
            </div>
            <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <Target size={17} className="text-[#0891B2]" />
              <div className="mt-3 text-sm font-semibold dark:text-white">{formatFocusTime(usage?.totalSeconds || 0)}</div>
              <div className="mt-1 text-xs text-[#7A8190] dark:text-white/45">累计专注</div>
            </div>
          </div>

          <section className="mt-7">
            <h3 className="text-xs font-semibold text-[#69707D] dark:text-white/50">你将获得</h3>
            <p className="mt-2 text-lg font-medium leading-8 text-[#1F2937] dark:text-white/85">{meta.outcome}</p>
            <p className="mt-3 text-sm leading-7 text-[#69707D] dark:text-white/55">{item.description}</p>
          </section>

          <div className="mt-6 flex flex-wrap gap-2">
            {item.tags.map(tag => (
              <span key={tag} className="rounded-md bg-[#F0F3F8] px-2.5 py-1.5 text-xs font-medium text-[#606979] dark:bg-white/[0.07] dark:text-white/55">
                {tag}
              </span>
            ))}
          </div>

          <footer className="mt-8 flex flex-col gap-3 border-t border-[#E5E7EB] pt-5 dark:border-white/10 sm:flex-row">
            <button
              type="button"
              onClick={() => onRun(item)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-sm font-semibold text-white shadow-[0_6px_16px_rgba(37,99,235,0.2)] hover:bg-[#1D4ED8]"
            >
              <Play size={16} fill="currentColor" />
              开始本次练习
            </button>
            <button
              type="button"
              onClick={() => onToggleSave(item.id)}
              className={`flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-medium ${
                isSaved
                  ? 'border-[#2563EB] bg-[#EEF2FF] text-[#1D4ED8] dark:bg-[#2563EB]/20 dark:text-[#AFC4FF]'
                  : 'border-[#D7DAE0] text-[#5F6673] hover:bg-white dark:border-white/15 dark:text-white/65 dark:hover:bg-white/[0.05]'
              }`}
            >
              <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
              {isSaved ? '已收藏' : '收藏'}
            </button>
            <button
              type="button"
              onClick={shareModule}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D7DAE0] text-[#5F6673] hover:bg-white dark:border-white/15 dark:text-white/65 dark:hover:bg-white/[0.05]"
              aria-label="复制模块链接"
              title="复制链接"
            >
              {copied ? <Check size={17} className="text-[#2563EB]" /> : <Share2 size={17} />}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
};

export default Modal;
