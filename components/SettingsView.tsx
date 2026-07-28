import React from 'react';
import {
  Check,
  Download,
  ExternalLink,
  Globe2,
  HardDrive,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import { UsageMap } from '../lib/product';
import BrandLogo from './BrandLogo';

interface SettingsViewProps {
  theme: 'light' | 'dark';
  usage: UsageMap;
  savedCount: number;
  historyCount: number;
  onToggleTheme: () => void;
  onResetData: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  theme,
  usage,
  savedCount,
  historyCount,
  onToggleTheme,
  onResetData,
}) => {
  const { lang, setLang } = useTranslation();

  const exportData = () => {
    const payload = {
      product: 'ExBeam',
      exportedAt: new Date().toISOString(),
      usage,
      savedCount,
      historyCount,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `exbeam-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const confirmReset = () => {
    if (window.confirm('确定清除 ExBeam 的收藏、历史和使用记录吗？此操作无法撤销。')) {
      onResetData();
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      <header className="mb-8">
        <div className="text-xs font-semibold text-[#2563EB] dark:text-[#8EACFF]">产品与偏好</div>
        <h1 className="mt-3 text-3xl font-semibold text-[#111318] dark:text-white md:text-4xl">设置</h1>
        <p className="mt-3 text-sm leading-7 text-[#69707D] dark:text-white/55">
          ExBeam 默认将学习记录保存在当前设备，不会假装同步到一个不存在的账号。
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]">
          <div className="border-b border-[#ECEEF2] px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-[#1F2937] dark:text-white">外观与语言</h2>
          </div>
          <div className="space-y-6 p-5">
            <div>
              <div className="mb-3 text-xs font-medium text-[#7A8190] dark:text-white/45">主题</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => theme === 'dark' && onToggleTheme()}
                  className={`flex h-12 items-center justify-between rounded-lg border px-4 text-sm font-medium ${
                    theme === 'light'
                      ? 'border-[#2563EB] bg-[#EEF2FF] text-[#1D4ED8]'
                      : 'border-[#DDE1E8] text-[#69707D] dark:border-white/10 dark:text-white/55'
                  }`}
                >
                  <span className="flex items-center gap-2"><Sun size={16} />亮色</span>
                  {theme === 'light' && <Check size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => theme === 'light' && onToggleTheme()}
                  className={`flex h-12 items-center justify-between rounded-lg border px-4 text-sm font-medium ${
                    theme === 'dark'
                      ? 'border-[#4F7CFF] bg-[#182033] text-[#DCE6FF]'
                      : 'border-[#DDE1E8] text-[#69707D] dark:border-white/10 dark:text-white/55'
                  }`}
                >
                  <span className="flex items-center gap-2"><Moon size={16} />暗色</span>
                  {theme === 'dark' && <Check size={16} />}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-3 text-xs font-medium text-[#7A8190] dark:text-white/45">界面语言</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'zh' as const, label: '简体中文' },
                  { id: 'en' as const, label: 'English' },
                ].map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLang(option.id)}
                    className={`flex h-12 items-center justify-between rounded-lg border px-4 text-sm font-medium ${
                      lang === option.id
                        ? 'border-[#2563EB] bg-[#EEF2FF] text-[#1D4ED8] dark:bg-[#2563EB]/20 dark:text-[#AFC4FF]'
                        : 'border-[#DDE1E8] text-[#69707D] dark:border-white/10 dark:text-white/55'
                    }`}
                  >
                    <span className="flex items-center gap-2"><Globe2 size={16} />{option.label}</span>
                    {lang === option.id && <Check size={16} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]">
          <div className="border-b border-[#ECEEF2] px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-semibold text-[#1F2937] dark:text-white">数据管理</h2>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3 rounded-lg bg-[#F4F6FA] p-4 dark:bg-white/[0.05]">
              <HardDrive size={19} className="mt-0.5 shrink-0 text-[#2563EB]" />
              <div>
                <div className="text-sm font-semibold text-[#1F2937] dark:text-white">本机保存</div>
                <p className="mt-1 text-xs leading-6 text-[#69707D] dark:text-white/45">
                  收藏、最近使用和专注时间保存在此浏览器中。清理浏览器数据会同时删除这些记录。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={exportData}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#D7DAE0] text-sm font-medium text-[#4B5565] hover:bg-[#F5F7FA] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/[0.05]"
              >
                <Download size={16} />
                导出我的记录
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-[#E4C6BE] text-sm font-medium text-[#A1402E] hover:bg-[#FFF2ED] dark:border-[#E76642]/30 dark:text-[#F29A82] dark:hover:bg-[#E76642]/10"
              >
                <RotateCcw size={16} />
                清除产品数据
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#E2E5EA] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]">
          <div className="p-5 md:p-6">
            <BrandLogo />
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#69707D] dark:text-white/55">
              ExBeam 是一个把学习内容、策略练习和实用工具组织成个人节奏的工作台。我们更关心你是否愿意明天再来，而不是制造一次性的惊艳。
            </p>
          </div>
          <div className="grid border-t border-[#ECEEF2] dark:border-white/10 sm:grid-cols-2">
            <a
              href="https://exbeam.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border-b border-[#ECEEF2] px-5 py-4 text-sm font-medium text-[#4B5565] hover:bg-[#F5F7FA] dark:border-white/10 dark:text-white/65 dark:hover:bg-white/[0.05] sm:border-b-0 sm:border-r"
            >
              <span className="flex items-center gap-2"><ExternalLink size={16} />访问 exbeam.com</span>
            </a>
            <div className="flex items-center justify-between px-5 py-4 text-sm text-[#69707D] dark:text-white/45">
              <span className="flex items-center gap-2"><ShieldCheck size={16} />本地优先</span>
              <span>2026.07</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsView;
