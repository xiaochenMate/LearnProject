import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  CloudOff,
  Dumbbell,
  Flower2,
  Gift,
  Ghost,
  Heart,
  Languages,
  LayoutList,
  LockKeyhole,
  Medal,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Sprout,
  Sun,
  Timer,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  applySummerMutation,
  createActionId,
  createSummerWorkspace,
  createWorkspaceCode,
  GardenPlant,
  generateQuizQuestions,
  getDateKey,
  getDayRecord,
  getIncompleteSubjects,
  getMonsterCount,
  getSummerStreak,
  getTodayProgress,
  getVacationDaysLeft,
  normalizeSummerWorkspace,
  PLANT_CATALOG,
  QuizQuestion,
  QuizScore,
  REWARD_CATALOG,
  SUBJECT_META,
  SummerMutation,
  SummerMood,
  SummerPanel,
  SummerSubject,
  SummerTask,
  SummerTaskKind,
  SummerWorkspaceState,
  WRITING_CARDS,
} from '../lib/summerWorkspace';

type UserMode = 'child' | 'parent';
type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

const STORAGE = {
  state: 'exbeam.summer.state.v1',
  code: 'exbeam.summer.code.v1',
  pending: 'exbeam.summer.pending.v1',
  localPin: 'exbeam.summer.local-parent-pin.v1',
  sessionPin: 'exbeam.summer.session-parent-pin.v1',
};

const safeStorage = {
  get(key: string, session = false) {
    try {
      return (session ? sessionStorage : localStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string, session = false) {
    try {
      (session ? sessionStorage : localStorage).setItem(key, value);
    } catch {
      // The workspace remains usable without browser storage.
    }
  },
  remove(key: string, session = false) {
    try {
      (session ? sessionStorage : localStorage).removeItem(key);
    } catch {
      // Ignore unavailable browser storage.
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

const readInitialState = () => normalizeSummerWorkspace(
  readJson<Partial<SummerWorkspaceState> | null>(STORAGE.state, null),
);

const hashPin = async (pin: string) => {
  const bytes = new TextEncoder().encode(`exbeam-summer:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const formatUpdatedTime = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '刚刚'
    : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const PANEL_ITEMS: Array<{
  id: SummerPanel;
  label: string;
  icon: React.ReactNode;
  section?: 'study' | 'garden';
}> = [
  { id: 'today', label: '今日任务', icon: <LayoutList size={18} />, section: 'study' },
  { id: 'mood', label: '今日心情', icon: <Heart size={18} /> },
  { id: 'chinese', label: '语文', icon: <BookOpen size={18} /> },
  { id: 'math', label: '数学', icon: <span className="text-base font-bold">123</span> },
  { id: 'english', label: '英语', icon: <Languages size={18} /> },
  { id: 'sport', label: '运动', icon: <Dumbbell size={18} /> },
  { id: 'focus', label: '专注计时', icon: <Timer size={18} /> },
  { id: 'garden', label: '我的花园', icon: <Flower2 size={18} />, section: 'garden' },
  { id: 'shop', label: '植物商店', icon: <ShoppingBag size={18} /> },
  { id: 'rewards', label: '奖励兑换', icon: <Gift size={18} /> },
  { id: 'growth', label: '成长记录', icon: <BarChart3 size={18} /> },
];

const TASK_KIND_LABEL: Record<SummerTaskKind, string> = {
  check: '完成项',
  quiz: '每日小测',
  reading: '阅读',
  practice: '练习',
};

const MOOD_OPTIONS: Array<{
  id: SummerMood;
  label: string;
  glyph: string;
  color: string;
  soft: string;
}> = [
  { id: 'great', label: '超开心', glyph: '😄', color: '#B87800', soft: '#FFF4C7' },
  { id: 'good', label: '挺好的', glyph: '🙂', color: '#16865C', soft: '#EAF9F1' },
  { id: 'okay', label: '还可以', glyph: '😐', color: '#45638C', soft: '#EDF4FF' },
  { id: 'low', label: '有点低落', glyph: '😔', color: '#7C3AED', soft: '#F4F0FF' },
  { id: 'upset', label: '不太开心', glyph: '😣', color: '#C24132', soft: '#FFF1EE' },
];

const getMoodOption = (mood?: SummerMood) =>
  MOOD_OPTIONS.find(option => option.id === mood);

const playPlantSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const gain = context.createGain();
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(990, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener('ended', () => void context.close());
  } catch {
    // Sound is a progressive enhancement.
  }
};

const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent: string;
  soft: string;
  className?: string;
}> = ({ icon, label, value, accent, soft, className = '' }) => (
  <div className={`min-w-0 rounded-lg border border-[#E2E7E3] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C] sm:p-4 ${className}`}>
    <div className="flex items-center gap-2 text-xs font-medium text-[#6F786F] dark:text-white/45">
      <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ color: accent, background: soft }}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
    </div>
    <div className="mt-3 text-xl font-bold text-[#18201A] dark:text-white">{value}</div>
  </div>
);

const Monster: React.FC<{ color: string; small?: boolean }> = ({ color, small = false }) => (
  <div
    className={`relative shrink-0 rounded-t-[45%] rounded-b-lg border-2 border-black/10 shadow-sm ${
      small ? 'h-9 w-8' : 'h-14 w-12'
    }`}
    style={{ background: color }}
    aria-hidden="true"
  >
    <span className={`absolute top-[28%] rounded-full bg-white ${small ? 'left-1.5 h-2.5 w-2.5' : 'left-2 h-3.5 w-3.5'}`}>
      <span className="absolute inset-[35%] rounded-full bg-[#172033]" />
    </span>
    <span className={`absolute top-[28%] rounded-full bg-white ${small ? 'right-1.5 h-2.5 w-2.5' : 'right-2 h-3.5 w-3.5'}`}>
      <span className="absolute inset-[35%] rounded-full bg-[#172033]" />
    </span>
    <span className={`absolute left-1/2 -translate-x-1/2 rounded-b-full border-b-2 border-white/80 ${
      small ? 'bottom-1.5 h-1.5 w-3' : 'bottom-2 h-2 w-5'
    }`} />
  </div>
);

const PlantGlyph: React.FC<{ plantId: string; size?: 'small' | 'large' }> = ({ plantId, size = 'large' }) => {
  const plant = PLANT_CATALOG.find(item => item.id === plantId) || PLANT_CATALOG[0];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white/80 font-bold shadow-sm ${
        size === 'large' ? 'h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl' : 'h-8 w-8 text-base'
      }`}
      style={{ color: plant.color, background: plant.background }}
      title={plant.name}
    >
      {plant.glyph}
    </div>
  );
};

const QuizModal: React.FC<{
  task: SummerTask;
  onClose: () => void;
  onComplete: (score: QuizScore) => void;
}> = ({ task, onClose, onComplete }) => {
  const [questions] = useState<QuizQuestion[]>(() => generateQuizQuestions(task));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const question = questions[index];
  const selected = question ? answers[question.id] : undefined;
  const correct = questions.filter(item => answers[item.id] === item.answer).length;

  const choose = (answer: string) => {
    if (!question || selected) return;
    setAnswers(current => ({ ...current, [question.id]: answer }));
  };

  const next = () => {
    if (index >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(current => current + 1);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1320]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-black/5 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#15171C] sm:max-w-xl sm:rounded-lg">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8ECE8] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#15171C]">
          <div>
            <div className="text-xs font-semibold text-[#16865C]">{TASK_KIND_LABEL[task.kind]}</div>
            <h2 className="mt-1 text-lg font-bold text-[#18201A] dark:text-white">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[#6F786F] hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
            aria-label="关闭测试"
          >
            <X size={18} />
          </button>
        </header>

        {!finished ? (
          <div className="p-5 sm:p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between text-xs text-[#7A837B] dark:text-white/45">
                <span>第 {index + 1} 题 / 共 {questions.length} 题</span>
                <span>{Math.round(((index + (selected ? 1 : 0)) / questions.length) * 100)}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EDF1ED] dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-[#69B94C] transition-[width] duration-300"
                  style={{ width: `${((index + (selected ? 1 : 0)) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <h3 className="text-xl font-bold leading-8 text-[#18201A] dark:text-white">{question?.prompt}</h3>
            <div className="mt-5 grid gap-3">
              {question?.options.map(option => {
                const isChosen = selected === option;
                const isCorrect = selected && option === question.answer;
                const isWrong = isChosen && option !== question.answer;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => choose(option)}
                    disabled={Boolean(selected)}
                    className={`flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                      isCorrect
                        ? 'border-[#69B94C] bg-[#ECF9E8] text-[#17653C]'
                        : isWrong
                          ? 'border-[#EB7E70] bg-[#FFF0EE] text-[#B52C23]'
                          : isChosen
                            ? 'border-[#2563EB] bg-[#EDF4FF] text-[#1D4ED8]'
                            : 'border-[#DDE3DE] bg-white text-[#273229] hover:border-[#9EAAA0] dark:border-white/10 dark:bg-white/[0.03] dark:text-white'
                    }`}
                  >
                    <span>{option}</span>
                    {isCorrect && <CheckCircle2 size={18} />}
                    {isWrong && <X size={18} />}
                  </button>
                );
              })}
            </div>

            {selected && (
              <div className="mt-5 rounded-lg border border-[#DDE8D9] bg-[#F5FAF2] p-4 text-sm leading-6 text-[#526052] dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60">
                <div className="font-semibold text-[#17653C] dark:text-[#8BD878]">
                  {selected === question.answer ? '回答正确' : `正确答案：${question.answer}`}
                </div>
                {question.pinyin && <div className="mt-1">拼音：{question.pinyin}</div>}
                {question.explanation && <div className="mt-1">{question.explanation}</div>}
              </div>
            )}

            <button
              type="button"
              disabled={!selected}
              onClick={next}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#18201A] text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-35 dark:bg-[#69B94C] dark:text-[#102416]"
            >
              {index === questions.length - 1 ? '查看成绩' : '下一题'}
              <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="p-6 text-center sm:p-8">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF4C7] text-[#E7A600]">
              {correct === questions.length ? <Trophy size={38} /> : <Medal size={38} />}
            </div>
            <div className="mt-5 text-sm font-semibold text-[#16865C]">今日小测完成</div>
            <h3 className="mt-2 text-3xl font-bold text-[#18201A] dark:text-white">
              答对 {correct} / {questions.length} 题
            </h3>
            <p className="mt-3 text-sm leading-6 text-[#6F786F] dark:text-white/50">
              {correct === questions.length
                ? `全部答对，获得 ${task.reward + 10} 个阳光，包含 10 个额外奖励。`
                : `获得 ${task.reward} 个阳光。错题已经给出解析，明天继续进步。`}
            </p>
            <button
              type="button"
              onClick={() => onComplete({ correct, total: questions.length })}
              className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#F4B400] text-sm font-bold text-[#4B3600] hover:bg-[#E7A600]"
            >
              <Sun size={18} fill="currentColor" />
              收下阳光
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const WritingModal: React.FC<{
  completed: boolean;
  onClose: () => void;
  onComplete: () => void;
}> = ({ completed, onClose, onComplete }) => (
  <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#0B1320]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
    <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#15171C] sm:max-w-2xl sm:rounded-lg">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E8ECE8] bg-white px-5 py-4 dark:border-white/10 dark:bg-[#15171C]">
        <div>
          <div className="text-xs font-semibold text-[#E24A3B]">偏旁与笔顺</div>
          <h2 className="mt-1 text-lg font-bold text-[#18201A] dark:text-white">今天练这 5 个字</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-[#6F786F]" aria-label="关闭">
          <X size={18} />
        </button>
      </header>
      <div className="p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-5">
          {WRITING_CARDS.map(card => (
            <div key={card.character} className="rounded-lg border border-[#E6D7D2] bg-[#FFF8F5] p-4 text-center">
              <div className="mx-auto flex aspect-square w-16 items-center justify-center border border-dashed border-[#E7A899] bg-white text-4xl font-medium text-[#3A2C28]">
                {card.character}
              </div>
              <div className="mt-3 text-xs text-[#7F6159]">部首：{card.radical}</div>
              <div className="mt-1 text-xs text-[#7F6159]">{card.strokes} 画</div>
              <div className="mt-2 text-[11px] leading-5 text-[#9B746A]">{card.order}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-lg bg-[#F7F8F6] p-4 text-sm leading-6 text-[#5F695F] dark:bg-white/[0.04] dark:text-white/55">
          先观察结构，再在田字格里慢写。写完自己圈出最满意的一个字。
        </div>
        <button
          type="button"
          disabled={completed}
          onClick={onComplete}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#E24A3B] text-sm font-bold text-white disabled:bg-[#CAD0CB] disabled:text-white"
        >
          <Check size={18} />
          {completed ? '今天已经完成' : '练完了，收取 10 阳光'}
        </button>
      </div>
    </div>
  </div>
);

const ParentPinModal: React.FC<{
  setup: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (pin: string) => void;
}> = ({ setup, busy, error, onClose, onSubmit }) => {
  const [pin, setPin] = useState('');
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B1320]/55 p-4 backdrop-blur-sm">
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit(pin);
        }}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#15171C]"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EDF4FF] text-[#2563EB]">
          <LockKeyhole size={23} />
        </div>
        <h2 className="mt-5 text-xl font-bold text-[#18201A] dark:text-white">
          {setup ? '设置家长口令' : '进入家长模式'}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#6F786F] dark:text-white/50">
          {setup ? '首次使用，请设置 4 至 8 位数字。孩子模式不能修改任务。' : '输入家长口令后才能增减任务和修改暑假日期。'}
        </p>
        <input
          autoFocus
          inputMode="numeric"
          value={pin}
          onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="输入数字口令"
          className="mt-5 h-12 w-full rounded-lg border border-[#DDE3DE] px-4 text-base tracking-[0.25em] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
        />
        {error && <div className="mt-3 text-sm text-[#C7382E]">{error}</div>}
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="h-11 flex-1 rounded-lg border border-[#DDE3DE] text-sm font-semibold text-[#5F695F]">
            取消
          </button>
          <button
            type="submit"
            disabled={busy || pin.length < 4}
            className="h-11 flex-1 rounded-lg bg-[#2563EB] text-sm font-bold text-white disabled:opacity-40"
          >
            {busy ? '验证中' : setup ? '保存并进入' : '确认进入'}
          </button>
        </div>
      </form>
    </div>
  );
};

const SyncModal: React.FC<{
  currentCode: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onCreate: (pin: string) => void;
  onJoin: (code: string) => void;
  onLeave: () => void;
}> = ({ currentCode, busy, error, onClose, onCreate, onJoin, onLeave }) => {
  const [tab, setTab] = useState<'create' | 'join'>(currentCode ? 'join' : 'create');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState(currentCode);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0B1320]/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#15171C]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#EAF9F1] text-[#16865C]">
              <Users size={23} />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#18201A] dark:text-white">家庭实时同步</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-[#6F786F]" aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#6F786F] dark:text-white/50">
          在孩子平板和家长手机输入同一个 8 位同步码，完成情况会自动更新。
        </p>

        {currentCode ? (
          <div className="mt-5 rounded-lg border border-[#CBE6D6] bg-[#F0FAF4] p-4">
            <div className="text-xs font-semibold text-[#16865C]">当前家庭同步码</div>
            <div className="mt-2 font-mono text-2xl font-bold tracking-[0.16em] text-[#183D2C]">{currentCode}</div>
            <p className="mt-2 text-xs leading-5 text-[#617568]">在另一台设备选择“加入工作台”并输入此码。</p>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 rounded-lg bg-[#F0F3F0] p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => setTab('create')}
                className={`h-9 rounded-md text-sm font-semibold ${tab === 'create' ? 'bg-white text-[#18201A] shadow-sm dark:bg-[#24272B] dark:text-white' : 'text-[#7A837B]'}`}
              >
                创建工作台
              </button>
              <button
                type="button"
                onClick={() => setTab('join')}
                className={`h-9 rounded-md text-sm font-semibold ${tab === 'join' ? 'bg-white text-[#18201A] shadow-sm dark:bg-[#24272B] dark:text-white' : 'text-[#7A837B]'}`}
              >
                加入工作台
              </button>
            </div>

            {tab === 'create' ? (
              <div className="mt-5">
                <label className="text-sm font-semibold text-[#344038] dark:text-white/70">设置家长口令</label>
                <input
                  inputMode="numeric"
                  value={pin}
                  onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  placeholder="4 至 8 位数字"
                  className="mt-2 h-12 w-full rounded-lg border border-[#DDE3DE] px-4 outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
                <button
                  type="button"
                  disabled={busy || pin.length < 4}
                  onClick={() => onCreate(pin)}
                  className="mt-4 h-11 w-full rounded-lg bg-[#16865C] text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy ? '正在创建' : '生成家庭同步码'}
                </button>
              </div>
            ) : (
              <div className="mt-5">
                <label className="text-sm font-semibold text-[#344038] dark:text-white/70">输入家庭同步码</label>
                <input
                  value={code}
                  onChange={event => setCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 8))}
                  placeholder="例如 AB3D5F7H"
                  className="mt-2 h-12 w-full rounded-lg border border-[#DDE3DE] px-4 font-mono text-lg font-bold tracking-[0.14em] uppercase outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
                />
                <button
                  type="button"
                  disabled={busy || code.length !== 8}
                  onClick={() => onJoin(code)}
                  className="mt-4 h-11 w-full rounded-lg bg-[#2563EB] text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy ? '正在加入' : '加入家庭工作台'}
                </button>
              </div>
            )}
          </>
        )}

        {error && <div className="mt-4 text-sm text-[#C7382E]">{error}</div>}
        {currentCode && (
          <button type="button" onClick={onLeave} className="mt-5 text-sm font-semibold text-[#B94339]">
            退出当前同步
          </button>
        )}
      </div>
    </div>
  );
};

const AddTaskModal: React.FC<{
  onClose: () => void;
  onAdd: (task: SummerTask) => void;
}> = ({ onClose, onAdd }) => {
  const [subject, setSubject] = useState<SummerSubject>('chinese');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<SummerTaskKind>('check');
  const [minutes, setMinutes] = useState(10);
  const [reward, setReward] = useState(10);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#0B1320]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <form
        onSubmit={event => {
          event.preventDefault();
          if (!title.trim()) return;
          onAdd({
            id: `custom-${Date.now()}`,
            subject,
            title: title.trim(),
            description: description.trim() || '家长添加的暑假任务',
            kind,
            minutes,
            reward,
            custom: true,
          });
        }}
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#15171C] sm:max-w-lg sm:rounded-lg sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-[#2563EB]">家长模式</div>
            <h2 className="mt-1 text-xl font-bold text-[#18201A] dark:text-white">添加暑假任务</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-md text-[#6F786F]" aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
            学科
            <select
              value={subject}
              onChange={event => setSubject(event.target.value as SummerSubject)}
              className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] bg-white px-3 font-normal dark:border-white/10 dark:bg-white/[0.04]"
            >
              {(Object.keys(SUBJECT_META) as SummerSubject[]).map(key => (
                <option key={key} value={key}>{SUBJECT_META[key].shortLabel}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
            任务名称
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="例如：完成暑假日记"
              className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] px-3 font-normal outline-none focus:border-[#2563EB] dark:border-white/10 dark:bg-white/[0.04]"
            />
          </label>
          <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
            简短说明
            <input
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="告诉孩子做到什么程度"
              className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] px-3 font-normal outline-none focus:border-[#2563EB] dark:border-white/10 dark:bg-white/[0.04]"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
              类型
              <select
                value={kind}
                onChange={event => {
                  const next = event.target.value as SummerTaskKind;
                  setKind(next);
                  if (next === 'reading') setReward(50);
                }}
                className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] bg-white px-2 font-normal dark:border-white/10 dark:bg-white/[0.04]"
              >
                <option value="check">完成项</option>
                <option value="practice">练习</option>
                <option value="reading">阅读</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
              分钟
              <input
                type="number"
                min={1}
                max={120}
                value={minutes}
                onChange={event => setMinutes(Math.max(1, Number(event.target.value)))}
                className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] px-2 font-normal dark:border-white/10 dark:bg-white/[0.04]"
              />
            </label>
            <label className="text-sm font-semibold text-[#344038] dark:text-white/70">
              阳光
              <input
                type="number"
                min={0}
                max={100}
                step={10}
                value={reward}
                onChange={event => setReward(Math.max(0, Number(event.target.value)))}
                className="mt-2 h-11 w-full rounded-lg border border-[#DDE3DE] px-2 font-normal dark:border-white/10 dark:bg-white/[0.04]"
              />
            </label>
          </div>
        </div>
        <button
          type="submit"
          disabled={!title.trim()}
          className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] text-sm font-bold text-white disabled:opacity-40"
        >
          <Plus size={18} />
          添加到每日任务
        </button>
      </form>
    </div>
  );
};

const GardenGrid: React.FC<{
  plants: GardenPlant[];
  selectedPlantId: string | null;
  onCellClick: (row: number, column: number) => void;
}> = ({ plants, selectedPlantId, onCellClick }) => (
  <div className="overflow-hidden rounded-lg border-4 border-[#8B5A31] bg-[#8B5A31] shadow-[0_12px_28px_rgba(68,85,61,0.18)]">
    <div className="grid aspect-[9/5] w-full grid-cols-9 gap-[2px] bg-[#8B5A31] p-[2px]">
      {Array.from({ length: 45 }, (_, index) => {
        const row = Math.floor(index / 9);
        const column = index % 9;
        const plant = plants.find(item => item.row === row && item.column === column);
        const background = (row + column) % 2 === 0 ? '#71B94D' : '#63A944';
        return (
          <button
            key={`${row}-${column}`}
            type="button"
            onClick={() => onCellClick(row, column)}
            className={`relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden outline-none transition-[filter,transform] ${
              selectedPlantId && !plant ? 'cursor-cell hover:brightness-110' : ''
            }`}
            style={{ background }}
            aria-label={plant ? '已种植' : `花园第 ${row + 1} 行第 ${column + 1} 列`}
          >
            <span className="absolute inset-x-0 bottom-[18%] h-px bg-white/10" />
            {plant && <PlantGlyph plantId={plant.plantId} />}
            {!plant && selectedPlantId && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-white/15 text-xs font-bold text-white/70">
                +
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

const SummerGardenView: React.FC = () => {
  const [state, setState] = useState<SummerWorkspaceState>(readInitialState);
  const [panel, setPanel] = useState<SummerPanel>('today');
  const [mode, setMode] = useState<UserMode>('child');
  const [workspaceCode, setWorkspaceCode] = useState(() => safeStorage.get(STORAGE.code) || '');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => workspaceCode ? 'syncing' : 'local');
  const [pendingActions, setPendingActions] = useState<SummerMutation[]>(() =>
    readJson<SummerMutation[]>(STORAGE.pending, []),
  );
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null);
  const [quizTask, setQuizTask] = useState<SummerTask | null>(null);
  const [writingOpen, setWritingOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinSetup, setPinSetup] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState('');
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [moodDraft, setMoodDraft] = useState<SummerMood | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [focusPreset, setFocusPreset] = useState(30);
  const [focusRemaining, setFocusRemaining] = useState(30 * 60);
  const [focusRunning, setFocusRunning] = useState(false);
  const pendingRef = useRef(pendingActions);
  const syncingRef = useRef(false);
  const parentPinRef = useRef(safeStorage.get(STORAGE.sessionPin, true) || '');
  const focusEndRef = useRef<number | null>(null);
  const focusLoggedRef = useRef(false);
  const today = getDateKey();

  const day = getDayRecord(state, today);
  const progress = getTodayProgress(state, today);
  const monsters = getMonsterCount(state, today);
  const incompleteSubjects = getIncompleteSubjects(state, today);
  const streak = getSummerStreak(state);
  const daysLeft = getVacationDaysLeft(state.vacationEnd);
  const selectedPlant = PLANT_CATALOG.find(item => item.id === selectedPlantId);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
    [today],
  );

  const filteredTasks = useMemo(
    () => panel === 'today'
      ? state.tasks
      : (Object.keys(SUBJECT_META) as SummerSubject[]).includes(panel as SummerSubject)
        ? state.tasks.filter(task => task.subject === panel)
        : [],
    [panel, state.tasks],
  );

  const taskSections = useMemo(() => {
    if (panel !== 'today') {
      return [{ id: 'subject', label: '本学科任务', tasks: filteredTasks }];
    }
    return [
      {
        id: 'pending',
        label: '待完成',
        tasks: filteredTasks.filter(task => !day.completedTaskIds.includes(task.id)),
      },
      {
        id: 'completed',
        label: '今天已完成',
        tasks: filteredTasks.filter(task => day.completedTaskIds.includes(task.id)),
      },
    ];
  }, [day.completedTaskIds, filteredTasks, panel]);

  const nextTask = useMemo(
    () => state.tasks
      .filter(task => !day.completedTaskIds.includes(task.id))
      .sort((a, b) => a.minutes - b.minutes)[0],
    [day.completedTaskIds, state.tasks],
  );

  const weekRecords = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = getDateKey(date);
    const storedRecord = state.days[key];
    const record = getDayRecord(state, key);
    const expectedIds = storedRecord?.expectedTaskIds.length
      ? storedRecord.expectedTaskIds
      : key === today
        ? state.tasks.map(task => task.id)
        : [];
    const completed = expectedIds.filter(id => record.completedTaskIds.includes(id)).length;
    return {
      key,
      label: date.toLocaleDateString('zh-CN', { weekday: 'short' }),
      day: date.getDate(),
      completed,
      total: expectedIds.length,
      percent: expectedIds.length ? Math.round((completed / expectedIds.length) * 100) : 0,
      mood: record.mood,
      focusMinutes: record.focusMinutes || 0,
    };
  }), [state, today]);

  useEffect(() => {
    safeStorage.set(STORAGE.state, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    setMoodDraft(day.mood || null);
    setMoodNote(day.moodNote || '');
  }, [day.mood, day.moodNote, today]);

  useEffect(() => {
    pendingRef.current = pendingActions;
    safeStorage.set(STORAGE.pending, JSON.stringify(pendingActions));
  }, [pendingActions]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || '同步暂时不可用');
    return body as { code?: string; state?: SummerWorkspaceState; valid?: boolean };
  }, []);

  const flushSync = useCallback(async (code = workspaceCode, queue = pendingRef.current) => {
    if (!code || syncingRef.current) return;
    syncingRef.current = true;
    setSyncStatus('syncing');
    try {
      const remote = await api(`/api/summer-workspace?code=${encodeURIComponent(code)}`);
      let remoteState = normalizeSummerWorkspace(remote.state);
      const remaining = [...queue];
      for (const mutation of queue) {
        const parentOnly = mutation.type === 'save-config';
        const result = await api('/api/summer-workspace', {
          method: 'POST',
          body: JSON.stringify({
            action: 'mutate',
            code,
            role: parentOnly ? 'parent' : 'child',
            pin: parentOnly ? parentPinRef.current : undefined,
            mutation,
          }),
        });
        remoteState = normalizeSummerWorkspace(result.state);
        remaining.shift();
        pendingRef.current = remaining;
        setPendingActions(remaining);
      }
      setState(remoteState);
      setSyncStatus('synced');
    } catch {
      setSyncStatus(navigator.onLine ? 'error' : 'offline');
    } finally {
      syncingRef.current = false;
    }
  }, [api, workspaceCode]);

  useEffect(() => {
    if (!workspaceCode) return;
    void flushSync();
    const timer = window.setInterval(() => void flushSync(), 5000);
    const syncOnFocus = () => void flushSync();
    window.addEventListener('focus', syncOnFocus);
    window.addEventListener('online', syncOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', syncOnFocus);
      window.removeEventListener('online', syncOnFocus);
    };
  }, [flushSync, workspaceCode]);

  const dispatchMutation = useCallback((mutation: SummerMutation) => {
    setState(current => applySummerMutation(current, mutation));
    if (!workspaceCode) return;
    const queue = [...pendingRef.current, mutation];
    pendingRef.current = queue;
    setPendingActions(queue);
    void flushSync(workspaceCode, queue);
  }, [flushSync, workspaceCode]);

  const saveMoodCheckIn = () => {
    if (!moodDraft) {
      setNotice('先选一个最接近现在的心情');
      return;
    }
    dispatchMutation({
      id: createActionId(),
      type: 'save-check-in',
      date: today,
      mood: moodDraft,
      note: moodNote,
    });
    setNotice('今天的心情已经记下');
  };

  const selectFocusPreset = (minutes: number) => {
    setFocusPreset(minutes);
    setFocusRemaining(minutes * 60);
    setFocusRunning(false);
    focusEndRef.current = null;
    focusLoggedRef.current = false;
  };

  const toggleFocus = () => {
    if (focusRunning) {
      const remaining = focusEndRef.current
        ? Math.max(0, Math.ceil((focusEndRef.current - Date.now()) / 1000))
        : focusRemaining;
      setFocusRemaining(remaining);
      setFocusRunning(false);
      focusEndRef.current = null;
      return;
    }
    const secondsToRun = focusRemaining <= 0 ? focusPreset * 60 : focusRemaining;
    if (focusRemaining <= 0) setFocusRemaining(secondsToRun);
    focusLoggedRef.current = false;
    focusEndRef.current = Date.now() + secondsToRun * 1000;
    setFocusRunning(true);
  };

  const resetFocus = () => {
    setFocusRunning(false);
    setFocusRemaining(focusPreset * 60);
    focusEndRef.current = null;
    focusLoggedRef.current = false;
  };

  useEffect(() => {
    if (!focusRunning) return;
    const tick = () => {
      const remaining = focusEndRef.current
        ? Math.max(0, Math.ceil((focusEndRef.current - Date.now()) / 1000))
        : 0;
      setFocusRemaining(remaining);
      if (remaining > 0 || focusLoggedRef.current) return;
      focusLoggedRef.current = true;
      setFocusRunning(false);
      focusEndRef.current = null;
      dispatchMutation({
        id: createActionId(),
        type: 'log-focus',
        date: today,
        minutes: focusPreset,
      });
      setNotice(`完成 ${focusPreset} 分钟专注，成长记录已更新`);
      playPlantSound();
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [dispatchMutation, focusPreset, focusRunning, today]);

  const completeTask = (task: SummerTask, score?: QuizScore) => {
    if (day.completedTaskIds.includes(task.id)) return;
    dispatchMutation({
      id: createActionId(),
      type: 'complete-task',
      date: today,
      taskId: task.id,
      score,
    });
    const perfectBonus = task.kind === 'quiz' && score?.correct === score?.total ? 10 : 0;
    setNotice(`完成「${task.title}」，获得 ${task.reward + perfectBonus} 阳光`);
    setQuizTask(null);
    setWritingOpen(false);
  };

  const handleTaskAction = (task: SummerTask) => {
    if (day.completedTaskIds.includes(task.id)) return;
    if (task.kind === 'quiz') {
      setQuizTask(task);
      return;
    }
    if (task.id === 'chinese-writing') {
      setWritingOpen(true);
      return;
    }
    completeTask(task);
  };

  const requestParentMode = () => {
    if (mode === 'parent') {
      setMode('child');
      return;
    }
    setPinError('');
    setPinSetup(!workspaceCode && !safeStorage.get(STORAGE.localPin));
    setPinModalOpen(true);
  };

  const unlockParent = async (pin: string) => {
    setPinBusy(true);
    setPinError('');
    try {
      if (!/^\d{4,8}$/.test(pin)) throw new Error('请输入 4 至 8 位数字');
      if (workspaceCode) {
        await api('/api/summer-workspace', {
          method: 'POST',
          body: JSON.stringify({ action: 'verify', code: workspaceCode, pin }),
        });
      } else {
        const storedHash = safeStorage.get(STORAGE.localPin);
        const incomingHash = await hashPin(pin);
        if (storedHash && storedHash !== incomingHash) throw new Error('家长口令不正确');
        if (!storedHash) safeStorage.set(STORAGE.localPin, incomingHash);
      }
      parentPinRef.current = pin;
      safeStorage.set(STORAGE.sessionPin, pin, true);
      setMode('parent');
      setPinModalOpen(false);
    } catch (error) {
      setPinError(error instanceof Error ? error.message : '无法进入家长模式');
    } finally {
      setPinBusy(false);
    }
  };

  const createSyncWorkspace = async (pin: string) => {
    setSyncBusy(true);
    setSyncError('');
    try {
      let code = createWorkspaceCode();
      let attempts = 0;
      while (attempts < 3) {
        try {
          const result = await api('/api/summer-workspace', {
            method: 'POST',
            body: JSON.stringify({ action: 'create', code, pin, state }),
          });
          const remoteState = normalizeSummerWorkspace(result.state);
          setState(remoteState);
          setWorkspaceCode(code);
          safeStorage.set(STORAGE.code, code);
          parentPinRef.current = pin;
          safeStorage.set(STORAGE.sessionPin, pin, true);
          setSyncStatus('synced');
          setMode('parent');
          return;
        } catch (error) {
          if (error instanceof Error && error.message.includes('已经被使用')) {
            code = createWorkspaceCode();
            attempts += 1;
            continue;
          }
          throw error;
        }
      }
      throw new Error('同步码生成失败，请重试');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '创建同步失败');
    } finally {
      setSyncBusy(false);
    }
  };

  const joinSyncWorkspace = async (codeInput: string) => {
    setSyncBusy(true);
    setSyncError('');
    try {
      const code = codeInput.trim().toUpperCase();
      const result = await api(`/api/summer-workspace?code=${encodeURIComponent(code)}`);
      const remoteState = normalizeSummerWorkspace(result.state);
      setState(remoteState);
      setWorkspaceCode(code);
      safeStorage.set(STORAGE.code, code);
      setPendingActions([]);
      pendingRef.current = [];
      setSyncStatus('synced');
      setSyncModalOpen(false);
      setMode('child');
      parentPinRef.current = '';
      safeStorage.remove(STORAGE.sessionPin, true);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : '加入同步失败');
    } finally {
      setSyncBusy(false);
    }
  };

  const leaveSyncWorkspace = () => {
    setWorkspaceCode('');
    safeStorage.remove(STORAGE.code);
    safeStorage.remove(STORAGE.sessionPin, true);
    setPendingActions([]);
    pendingRef.current = [];
    parentPinRef.current = '';
    setSyncStatus('local');
    setSyncModalOpen(false);
    setMode('child');
  };

  const saveConfig = (nextTasks = state.tasks, nextName = state.childName, nextEnd = state.vacationEnd) => {
    dispatchMutation({
      id: createActionId(),
      type: 'save-config',
      date: today,
      tasks: nextTasks,
      childName: nextName,
      vacationEnd: nextEnd,
    });
  };

  const deleteTask = (task: SummerTask) => {
    if (!window.confirm(`删除「${task.title}」？之后每天都不再显示。`)) return;
    saveConfig(state.tasks.filter(item => item.id !== task.id));
  };

  const plantInCell = (row: number, column: number) => {
    if (!selectedPlant) return;
    if (state.garden.some(item => item.row === row && item.column === column)) {
      setNotice('这块草地已经有植物了');
      return;
    }
    if (state.sun < selectedPlant.cost) {
      setNotice('阳光还不够，先完成几项作业吧');
      return;
    }
    dispatchMutation({
      id: createActionId(),
      type: 'plant',
      date: today,
      plantId: selectedPlant.id,
      row,
      column,
    });
    playPlantSound();
    setNotice(`${selectedPlant.name}已经种下，叮！`);
    setSelectedPlantId(null);
  };

  const redeemReward = (rewardId: string) => {
    const reward = REWARD_CATALOG.find(item => item.id === rewardId);
    if (!reward) return;
    if (state.sun < reward.cost) {
      setNotice('阳光还不够，继续完成任务吧');
      return;
    }
    if (reward.id === 'defeat-monster' && monsters <= 0) {
      setNotice('今天已经没有作业怪了');
      return;
    }
    dispatchMutation({
      id: createActionId(),
      type: 'redeem',
      date: today,
      rewardId,
    });
    setNotice(`已兑换：${reward.title}`);
  };

  const renderTasks = () => (
    <section>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold text-[#16865C]">
            {panel === 'today' ? todayLabel : SUBJECT_META[panel as SummerSubject].label}
          </div>
          <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">
            {panel === 'today' ? '今天的作业清单' : `${SUBJECT_META[panel as SummerSubject].shortLabel}任务`}
          </h2>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">
            每完成一项就收取阳光，小测全对还有额外奖励。
          </p>
        </div>
        {mode === 'parent' && (
          <button
            type="button"
            onClick={() => setAddTaskOpen(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white"
          >
            <Plus size={17} />
            添加任务
          </button>
        )}
      </div>

      {panel === 'today' && (
        <div className="relative mt-5 min-h-[190px] overflow-hidden rounded-lg bg-[#DDF4FF]">
          <img
            src="/images/exbeam-summer-garden.png"
            alt="阳光花园守护队"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#102416]/90 via-[#102416]/45 to-transparent" />
          <div className="relative z-10 max-w-[440px] p-5 text-white sm:p-6">
            <div className="text-xs font-bold text-[#CFF6A9]">阳光花园 · 第 {streak + 1} 天挑战</div>
            <h3 className="mt-2 text-2xl font-bold leading-tight">
              {progress.completed === progress.total ? '花园守住了，今天全部完成！' : `还差 ${progress.total - progress.completed} 项，植物队需要你`}
            </h3>
            <p className="mt-3 text-sm leading-6 text-white/75">
              未完成的学科会招来作业怪。先完成最短的一项，让花园安静下来。
            </p>
          </div>
        </div>
      )}

      {panel === 'today' && nextTask && (
        <div className="mt-4 flex flex-col gap-3 rounded-lg border border-[#C9DAFB] bg-[#F3F7FF] p-4 dark:border-[#2563EB]/30 dark:bg-[#2563EB]/10 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#2563EB] shadow-sm dark:bg-white/10">
            <ArrowRight size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-[#45638C] dark:text-white/55">下一步建议 · {nextTask.minutes} 分钟</div>
            <div className="mt-1 font-bold text-[#263650] dark:text-white">先完成「{nextTask.title}」</div>
            <div className="mt-1 text-xs text-[#687B97] dark:text-white/45">这是今天用时最短的待办，完成后就能立刻收取阳光。</div>
          </div>
          <button
            type="button"
            onClick={() => handleTaskAction(nextTask)}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-bold text-white"
          >
            现在开始
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 space-y-7">
        {taskSections.map(section => section.tasks.length > 0 && (
          <section key={section.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#303A32] dark:text-white/75">{section.label}</h3>
              <span className="text-xs font-semibold text-[#8A928B] dark:text-white/35">{section.tasks.length} 项</span>
            </div>
            <div className="space-y-3">
            {section.tasks.map(task => {
          const meta = SUBJECT_META[task.subject];
          const completed = day.completedTaskIds.includes(task.id);
          const score = day.quizScores[task.id];
          return (
            <article
              key={task.id}
              className={`grid gap-4 rounded-lg border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:bg-[#15171C] sm:grid-cols-[auto_1fr_auto] sm:items-center ${
                completed ? 'border-[#CFE4D4] bg-[#F8FCF8] dark:border-[#69B94C]/30' : 'border-[#E1E6E1] dark:border-white/10'
              }`}
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg"
                style={{ color: meta.color, background: meta.soft }}
              >
                {task.subject === 'chinese' && <BookOpen size={21} />}
                {task.subject === 'math' && <span className="text-sm font-black">123</span>}
                {task.subject === 'english' && <Languages size={21} />}
                {task.subject === 'sport' && <Dumbbell size={21} />}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: meta.color }}>{meta.shortLabel}</span>
                  <span className="rounded bg-[#F1F4F1] px-1.5 py-0.5 text-[10px] font-semibold text-[#778078] dark:bg-white/[0.08] dark:text-white/45">
                    {TASK_KIND_LABEL[task.kind]}
                  </span>
                  {score && (
                    <span className="text-[11px] font-semibold text-[#16865C]">
                      {score.correct}/{score.total} 题正确
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 truncate text-base font-bold text-[#202A22] dark:text-white">{task.title}</h3>
                <p className="mt-1 text-sm leading-5 text-[#737C74] dark:text-white/45">{task.description}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-[#8A928B] dark:text-white/35">
                  <span className="flex items-center gap-1"><Clock3 size={13} />{task.minutes} 分钟</span>
                  <span className="flex items-center gap-1 font-semibold text-[#C78D00]"><Sun size={13} />+{task.reward}{task.kind === 'quiz' ? '，全对再 +10' : ''}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                {mode === 'parent' && (
                  <button
                    type="button"
                    onClick={() => deleteTask(task)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2E6E2] text-[#9A6A63] hover:bg-[#FFF2EF] dark:border-white/10"
                    title="删除任务"
                    aria-label={`删除 ${task.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <button
                  type="button"
                  disabled={completed}
                  onClick={() => handleTaskAction(task)}
                  className={`flex h-10 min-w-[112px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold sm:flex-none ${
                    completed
                      ? 'bg-[#E8F4E8] text-[#39824D]'
                      : 'bg-[#18201A] text-white hover:bg-[#2A362D] dark:bg-[#69B94C] dark:text-[#102416]'
                  }`}
                >
                  {completed ? <CheckCircle2 size={17} /> : task.kind === 'quiz' ? <Sparkles size={17} /> : <Check size={17} />}
                  {completed ? '已完成' : task.kind === 'quiz' ? '开始小测' : task.id === 'chinese-writing' ? '查看练字' : '完成'}
                </button>
              </div>
            </article>
          );
            })}
            </div>
          </section>
        ))}
        {taskSections.every(section => section.tasks.length === 0) && (
          <div className="rounded-lg border border-[#CFE4D4] bg-[#F8FCF8] px-5 py-12 text-center dark:border-[#69B94C]/30 dark:bg-[#69B94C]/10">
            <CheckCircle2 className="mx-auto text-[#16865C]" size={34} />
            <h3 className="mt-3 text-lg font-bold text-[#205C3B] dark:text-white">今天没有待办</h3>
            <p className="mt-1 text-sm text-[#68806F] dark:text-white/45">去花园看看新种下的植物吧。</p>
          </div>
        )}
      </div>
    </section>
  );

  const renderMood = () => {
    const savedMood = getMoodOption(day.mood);
    return (
      <section>
        <div>
          <div className="text-xs font-bold text-[#D04E6D]">{todayLabel}</div>
          <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">今天感觉怎么样？</h2>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">心情没有对错，选一个最接近现在的感受就好。</p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <div className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C] sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {MOOD_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMoodDraft(option.id)}
                  className={`flex min-h-[104px] flex-col items-center justify-center rounded-lg border px-2 py-3 transition-colors ${
                    moodDraft === option.id
                      ? 'border-current ring-2 ring-current/15'
                      : 'border-[#E4E8E4] hover:border-[#C9D2CA] dark:border-white/10'
                  }`}
                  style={{
                    color: option.color,
                    background: moodDraft === option.id ? option.soft : undefined,
                  }}
                  aria-pressed={moodDraft === option.id}
                >
                  <span className="text-3xl leading-none" aria-hidden="true">{option.glyph}</span>
                  <span className="mt-3 text-xs font-bold">{option.label}</span>
                </button>
              ))}
            </div>

            <label className="mt-5 block text-sm font-bold text-[#303A32] dark:text-white/70">
              想给家人留一句话吗？
              <textarea
                value={moodNote}
                onChange={event => setMoodNote(event.target.value.slice(0, 160))}
                rows={4}
                placeholder="比如：今天口算有点难，但我没有放弃。"
                className="mt-2 w-full resize-none rounded-lg border border-[#DDE3DE] bg-[#FBFCFB] px-4 py-3 text-sm font-medium leading-6 text-[#27312A] outline-none placeholder:text-[#A0A8A1] focus:border-[#D04E6D] dark:border-white/10 dark:bg-white/[0.03] dark:text-white"
              />
            </label>
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#8B938C] dark:text-white/35">
              <span>记录只会在你的家庭工作台中同步。</span>
              <span>{moodNote.length}/160</span>
            </div>
            <button
              type="button"
              onClick={saveMoodCheckIn}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#18201A] text-sm font-bold text-white dark:bg-[#DCE8DF] dark:text-[#18201A]"
            >
              <Heart size={17} />
              {day.mood ? '更新今天的心情' : '记下今天的心情'}
            </button>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#F0D2DB] bg-[#FFF6F8] p-5 dark:border-[#D04E6D]/25 dark:bg-[#D04E6D]/10">
              <div className="text-xs font-bold text-[#A83E5A] dark:text-white/55">今日心情卡</div>
              {savedMood ? (
                <>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="text-4xl" aria-hidden="true">{savedMood.glyph}</span>
                    <div>
                      <div className="font-bold text-[#6E2940] dark:text-white">{savedMood.label}</div>
                      <div className="mt-1 text-xs text-[#9D6275] dark:text-white/45">已记录于家庭成长轨迹</div>
                    </div>
                  </div>
                  {day.moodNote && (
                    <p className="mt-5 rounded-lg bg-white/75 p-3 text-sm leading-6 text-[#6F4050] dark:bg-white/[0.06] dark:text-white/60">
                      {day.moodNote}
                    </p>
                  )}
                </>
              ) : (
                <div className="py-9 text-center">
                  <Heart className="mx-auto text-[#D78299]" size={30} />
                  <p className="mt-3 text-sm text-[#9D6275] dark:text-white/45">今天还没有记录心情</p>
                </div>
              )}
            </div>
            <div className="rounded-lg border border-[#D8E6F7] bg-[#F5F9FF] p-5 dark:border-[#2563EB]/25 dark:bg-[#2563EB]/10">
              <div className="text-sm font-bold text-[#36577F] dark:text-white/70">给今天一个小拥抱</div>
              <p className="mt-2 text-sm leading-6 text-[#69809B] dark:text-white/45">
                累了可以先休息，难过可以告诉家人。完成多少不是衡量好坏的标准。
              </p>
            </div>
          </aside>
        </div>
      </section>
    );
  };

  const renderFocus = () => {
    const totalSeconds = focusPreset * 60;
    const elapsedPercent = Math.max(0, Math.min(100, ((totalSeconds - focusRemaining) / totalSeconds) * 100));
    const minutes = Math.floor(focusRemaining / 60).toString().padStart(2, '0');
    const seconds = (focusRemaining % 60).toString().padStart(2, '0');
    return (
      <section>
        <div>
          <div className="text-xs font-bold text-[#16865C]">FOCUS</div>
          <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">专注一小段时间</h2>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">选一个时长，安静完成眼前这一件事。</p>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-[430px] flex-col items-center justify-center rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
            <div className="inline-flex rounded-lg bg-[#F1F4F1] p-1 dark:bg-white/[0.06]" role="group" aria-label="专注时长">
              {[15, 30, 45].map(minutesOption => (
                <button
                  key={minutesOption}
                  type="button"
                  onClick={() => selectFocusPreset(minutesOption)}
                  disabled={focusRunning}
                  className={`h-9 min-w-[68px] rounded-md px-3 text-xs font-bold ${
                    focusPreset === minutesOption
                      ? 'bg-white text-[#16865C] shadow-sm dark:bg-white/10 dark:text-[#8FDCAC]'
                      : 'text-[#7D857E] disabled:opacity-40 dark:text-white/40'
                  }`}
                >
                  {minutesOption} 分钟
                </button>
              ))}
            </div>

            <div
              className="relative mt-7 flex h-[230px] w-[230px] items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#36A45F ${elapsedPercent}%, #E8EEE9 ${elapsedPercent}% 100%)` }}
            >
              <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white dark:bg-[#15171C]">
                <div className="text-5xl font-bold tabular-nums text-[#1D2920] dark:text-white">{minutes}:{seconds}</div>
                <div className="mt-2 text-xs font-semibold text-[#839085] dark:text-white/35">
                  {focusRunning ? '正在专注' : focusRemaining === totalSeconds ? '准备开始' : '暂时休息'}
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button
                type="button"
                onClick={toggleFocus}
                className="flex h-12 min-w-[132px] items-center justify-center gap-2 rounded-lg bg-[#16865C] px-5 text-sm font-bold text-white"
              >
                {focusRunning ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                {focusRunning ? '暂停' : focusRemaining === totalSeconds ? '开始专注' : '继续'}
              </button>
              <button
                type="button"
                onClick={resetFocus}
                className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#DDE3DE] text-[#68736A] dark:border-white/10 dark:text-white/55"
                title="重新计时"
                aria-label="重新计时"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-[#CFE4D4] bg-[#F1FAF3] p-5 dark:border-[#69B94C]/25 dark:bg-[#69B94C]/10">
              <div className="text-xs font-bold text-[#39824D] dark:text-white/55">今日累计</div>
              <div className="mt-3 text-3xl font-bold text-[#205C3B] dark:text-white">{day.focusMinutes || 0}<span className="ml-1 text-sm">分钟</span></div>
              <p className="mt-2 text-xs leading-5 text-[#68806F] dark:text-white/40">完整结束一次计时后会自动加入成长记录。</p>
            </div>
            <div className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
              <div className="text-sm font-bold text-[#303A32] dark:text-white/70">开始前准备</div>
              <div className="mt-4 space-y-3 text-sm text-[#6F786F] dark:text-white/45">
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#16865C]" size={16} /><span>桌面只留下这次要用的东西</span></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#16865C]" size={16} /><span>先喝一口水，再把设备调成静音</span></div>
                <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-[#16865C]" size={16} /><span>计时结束后起身活动一下</span></div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    );
  };

  const renderGrowth = () => {
    const weeklyCompleted = weekRecords.reduce((sum, record) => sum + record.completed, 0);
    const weeklyTotal = weekRecords.reduce((sum, record) => sum + record.total, 0);
    const weeklyFocus = weekRecords.reduce((sum, record) => sum + record.focusMinutes, 0);
    const moodDays = weekRecords.filter(record => record.mood).length;
    return (
      <section>
        <div>
          <div className="text-xs font-bold text-[#7C3AED]">GROWTH</div>
          <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">这一周的成长记录</h2>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">这里记录坚持的过程，不给孩子排座次。</p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={<CheckCircle2 size={16} />} label="完成任务" value={`${weeklyCompleted}/${weeklyTotal}`} accent="#16865C" soft="#EAF9F1" />
          <MetricCard icon={<Timer size={16} />} label="专注时间" value={<>{weeklyFocus}<span className="ml-1 text-sm">分钟</span></>} accent="#2563EB" soft="#EDF4FF" />
          <MetricCard icon={<Heart size={16} />} label="心情记录" value={<>{moodDays}<span className="ml-1 text-sm">天</span></>} accent="#D04E6D" soft="#FFF1F5" />
          <MetricCard icon={<Trophy size={16} />} label="连续完成" value={<>{streak}<span className="ml-1 text-sm">天</span></>} accent="#B87800" soft="#FFF4C7" />
        </div>

        <div className="mt-4 rounded-lg border border-[#E1E6E1] bg-white p-4 dark:border-white/10 dark:bg-[#15171C] sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#303A32] dark:text-white/70">最近 7 天</h3>
            <span className="text-xs text-[#89918A] dark:text-white/35">任务完成率</span>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2">
            {weekRecords.map(record => {
              const mood = getMoodOption(record.mood);
              return (
                <div key={record.key} className="min-w-0 text-center">
                  <div className="text-[11px] font-semibold text-[#89918A] dark:text-white/35">{record.label}</div>
                  <div className={`mx-auto mt-2 flex aspect-square w-full max-w-[74px] flex-col items-center justify-center rounded-lg border ${
                    record.key === today
                      ? 'border-[#7C3AED] bg-[#F7F3FF] dark:border-[#A78BFA] dark:bg-[#7C3AED]/15'
                      : 'border-[#E4E8E4] bg-[#FBFCFB] dark:border-white/10 dark:bg-white/[0.03]'
                  }`}>
                    <span className="text-base font-bold text-[#303A32] dark:text-white">{record.day}</span>
                    <span className="mt-1 text-[10px] font-bold text-[#6F786F] dark:text-white/40">{record.total ? `${record.percent}%` : '--'}</span>
                  </div>
                  <div className="mt-2 h-5 text-base leading-5" title={mood?.label}>{mood?.glyph || ''}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#303A32] dark:text-white/70">
              <Medal size={17} className="text-[#B87800]" />
              七日成就
            </div>
            <p className="mt-3 text-sm leading-6 text-[#6F786F] dark:text-white/45">
              {streak >= 7
                ? '已经连续 7 天完成全部计划，成就徽章永久点亮。'
                : `再连续完成 ${Math.max(0, 7 - streak)} 天，就能点亮“七日守护者”徽章。`}
            </p>
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  key={index}
                  className={`h-3 flex-1 rounded-sm ${index < streak ? 'bg-[#F4B400]' : 'bg-[#ECEFEC] dark:bg-white/10'}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
            <div className="flex items-center gap-2 text-sm font-bold text-[#303A32] dark:text-white/70">
              <Gift size={17} className="text-[#7C3AED]" />
              最近兑换
            </div>
            {state.redemptions.length ? (
              <div className="mt-3 space-y-2">
                {state.redemptions.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F8F7] px-3 py-2.5 dark:bg-white/[0.04]">
                    <span className="truncate text-sm font-semibold text-[#4D5750] dark:text-white/60">{item.title}</span>
                    <span className="shrink-0 text-xs font-bold text-[#B87800]">-{item.cost} 阳光</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#7B847C] dark:text-white/40">还没有兑换记录，阳光可以先留着买植物。</p>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderGarden = () => (
    <section>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="text-xs font-bold text-[#16865C]">9 × 5 GARDEN</div>
          <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">我的成长花园</h2>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">用完成作业获得的阳光买植物，再选择一块草地种下。</p>
        </div>
        <button
          type="button"
          onClick={() => setPanel('shop')}
          className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[#DDE3DE] bg-white px-4 text-sm font-bold text-[#344038] dark:border-white/10 dark:bg-[#15171C] dark:text-white"
        >
          <ShoppingBag size={17} />
          去植物商店
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-[#DCE5D8] bg-[#F1F8ED] p-4 dark:border-white/10 dark:bg-white/[0.03] sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-[#314434] dark:text-white">花园里已有 {state.garden.length} 株植物</div>
            <div className="mt-1 text-xs text-[#708071] dark:text-white/45">每个格子只能种一株，种下后会自动保存。</div>
          </div>
          {selectedPlant ? (
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm dark:bg-[#202522]">
              <PlantGlyph plantId={selectedPlant.id} size="small" />
              <div>
                <div className="text-xs font-bold text-[#263329] dark:text-white">正在种：{selectedPlant.name}</div>
                <button type="button" onClick={() => setSelectedPlantId(null)} className="mt-0.5 text-[11px] font-semibold text-[#B14C42]">取消选择</button>
              </div>
            </div>
          ) : (
            <div className="text-xs font-semibold text-[#7B887C]">先在商店选择植物</div>
          )}
        </div>
        <GardenGrid plants={state.garden} selectedPlantId={selectedPlantId} onCellClick={plantInCell} />
      </div>

      <div className="mt-5 rounded-lg border border-[#E2E7E2] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#FFF1EE] text-[#D94A3A]">
            <Ghost size={22} />
          </div>
          <div>
            <h3 className="font-bold text-[#253027] dark:text-white">花园外还有 {monsters} 只作业怪</h3>
            <p className="mt-1 text-sm text-[#737C74] dark:text-white/45">
              {monsters
                ? `未完成：${incompleteSubjects.map(subject => SUBJECT_META[subject].shortLabel).join('、')}`
                : '今天的花园很安全，所有学科都已经完成。'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderShop = () => (
    <section>
      <div>
        <div className="text-xs font-bold text-[#C78D00]">PLANT SHOP</div>
        <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">植物商店</h2>
        <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">当前有 {state.sun} 阳光。选择植物后，去 9 × 5 花园里挑一个位置。</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {PLANT_CATALOG.map(plant => (
          <article key={plant.id} className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
            <div className="flex items-start justify-between gap-4">
              <PlantGlyph plantId={plant.id} />
              <div className="flex items-center gap-1 rounded-md bg-[#FFF4C7] px-2 py-1 text-sm font-bold text-[#8B6300]">
                <Sun size={14} fill="currentColor" />
                {plant.cost}
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#253027] dark:text-white">{plant.name}</h3>
            <p className="mt-1 text-sm text-[#737C74] dark:text-white/45">{plant.description}</p>
            <button
              type="button"
              disabled={state.sun < plant.cost}
              onClick={() => {
                setSelectedPlantId(plant.id);
                setPanel('garden');
              }}
              className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#16865C] text-sm font-bold text-white disabled:bg-[#D9DFDA] disabled:text-[#899189]"
            >
              <Sprout size={17} />
              {state.sun >= plant.cost ? '选择种植' : `还差 ${plant.cost - state.sun} 阳光`}
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  const renderRewards = () => (
    <section>
      <div>
        <div className="text-xs font-bold text-[#7C3AED]">REWARD STORE</div>
        <h2 className="mt-1 text-2xl font-bold text-[#18201A] dark:text-white">把努力兑换成期待</h2>
        <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">所有线下奖励都需要家长确认，兑换后会保留记录。</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {REWARD_CATALOG.map(reward => (
          <article key={reward.id} className="rounded-lg border border-[#E1E6E1] bg-white p-5 dark:border-white/10 dark:bg-[#15171C]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#F4F0FF] text-[#7C3AED]">
                {reward.id === 'defeat-monster' ? <ShieldCheck size={22} /> : <Gift size={22} />}
              </div>
              <div className="flex items-center gap-1 rounded-md bg-[#FFF4C7] px-2 py-1 text-sm font-bold text-[#8B6300]">
                <Sun size={14} fill="currentColor" />
                {reward.cost}
              </div>
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#253027] dark:text-white">{reward.title}</h3>
            <p className="mt-1 text-sm leading-6 text-[#737C74] dark:text-white/45">{reward.description}</p>
            <button
              type="button"
              disabled={state.sun < reward.cost || (reward.id === 'defeat-monster' && monsters <= 0)}
              onClick={() => redeemReward(reward.id)}
              className="mt-5 h-10 w-full rounded-lg bg-[#18201A] text-sm font-bold text-white disabled:bg-[#D9DFDA] disabled:text-[#899189] dark:bg-[#7C3AED]"
            >
              {reward.id === 'defeat-monster' && monsters <= 0
                ? '今天没有作业怪'
                : state.sun >= reward.cost
                  ? '立即兑换'
                  : `还差 ${reward.cost - state.sun} 阳光`}
            </button>
          </article>
        ))}
      </div>

      {state.redemptions.length > 0 && (
        <div className="mt-7">
          <h3 className="text-base font-bold text-[#253027] dark:text-white">最近兑换</h3>
          <div className="mt-3 divide-y divide-[#E8ECE8] rounded-lg border border-[#E1E6E1] bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#15171C]">
            {state.redemptions.slice(0, 5).map(item => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <span className="font-semibold text-[#344038] dark:text-white/70">{item.title}</span>
                <span className="text-xs text-[#8A928B]">-{item.cost} 阳光 · {new Date(item.redeemedAt).toLocaleDateString('zh-CN')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );

  return (
    <div className="w-full pb-24">
      <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#16865C]">
            <Sprout size={15} />
            EXBEAM 暑假成长工作台
          </div>
          <h1 className="mt-2 text-3xl font-bold text-[#18201A] dark:text-white md:text-4xl">
            {state.childName}的阳光花园
          </h1>
          <p className="mt-2 text-sm text-[#6F786F] dark:text-white/50">
            今天完成一点，花园就长大一点。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSyncError('');
              setSyncModalOpen(true);
            }}
            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-bold ${
              syncStatus === 'synced'
                ? 'border-[#C5E5D2] bg-[#EFFAF3] text-[#16865C]'
                : syncStatus === 'syncing'
                  ? 'border-[#D4DDEB] bg-[#F4F7FC] text-[#45638C]'
                  : 'border-[#DDE3DE] bg-white text-[#6F786F] dark:border-white/10 dark:bg-[#15171C] dark:text-white/55'
            }`}
          >
            {syncStatus === 'synced' ? <Cloud size={16} /> : syncStatus === 'syncing' ? <RefreshCw size={16} className="animate-spin" /> : <CloudOff size={16} />}
            {workspaceCode ? syncStatus === 'synced' ? '家庭已同步' : '同步中' : '开启家庭同步'}
          </button>
          <button
            type="button"
            onClick={requestParentMode}
            className={`flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold ${
              mode === 'parent'
                ? 'bg-[#2563EB] text-white'
                : 'border border-[#DDE3DE] bg-white text-[#556057] dark:border-white/10 dark:bg-[#15171C] dark:text-white/55'
            }`}
          >
            {mode === 'parent' ? <ShieldCheck size={16} /> : <LockKeyhole size={16} />}
            {mode === 'parent' ? '返回孩子模式' : '家长模式'}
          </button>
        </div>
      </header>

      {mode === 'parent' && (
        <div className="mb-5 grid gap-3 rounded-lg border border-[#C9DAFB] bg-[#F3F7FF] p-4 dark:border-[#2563EB]/30 dark:bg-[#2563EB]/10 sm:grid-cols-[1fr_180px] sm:items-end">
          <label className="text-xs font-bold text-[#405474] dark:text-white/60">
            孩子称呼
            <input
              value={state.childName}
              onChange={event => setState(current => ({ ...current, childName: event.target.value }))}
              onBlur={() => saveConfig(state.tasks, state.childName, state.vacationEnd)}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#C9D5E9] bg-white px-3 text-sm font-semibold text-[#263650] outline-none dark:border-white/10 dark:bg-[#15171C] dark:text-white"
            />
          </label>
          <label className="text-xs font-bold text-[#405474] dark:text-white/60">
            暑假结束日期
            <input
              type="date"
              value={state.vacationEnd}
              onChange={event => {
                const value = event.target.value;
                setState(current => ({ ...current, vacationEnd: value }));
                saveConfig(state.tasks, state.childName, value);
              }}
              className="mt-1.5 h-10 w-full rounded-lg border border-[#C9D5E9] bg-white px-3 text-sm font-semibold text-[#263650] outline-none dark:border-white/10 dark:bg-[#15171C] dark:text-white"
            />
          </label>
        </div>
      )}

      <nav
        className="no-scrollbar flex gap-0.5 overflow-x-auto rounded-lg border border-[#E1E6E1] bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-white/10 dark:bg-[#15171C]"
        aria-label="暑假工作台功能"
      >
        {PANEL_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPanel(item.id)}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold transition-colors ${
              panel === item.id
                ? 'bg-[#18201A] text-white shadow-sm dark:bg-[#DCE8DF] dark:text-[#18201A]'
                : 'text-[#6F786F] hover:bg-[#F1F5F1] dark:text-white/45 dark:hover:bg-white/[0.05]'
            }`}
          >
            <span className="flex w-4 justify-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {panel === 'today' && (
        <>
          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <MetricCard icon={<CalendarDays size={16} />} label="暑假剩余" value={<>{daysLeft}<span className="ml-1 text-sm font-semibold text-[#7A837B]">天</span></>} accent="#2563EB" soft="#EDF4FF" />
            <MetricCard icon={<CheckCircle2 size={16} />} label="今日进度" value={<>{progress.completed}/{progress.total}</>} accent="#16865C" soft="#EAF9F1" />
            <MetricCard icon={<Sun size={16} fill="currentColor" />} label="阳光值" value={state.sun} accent="#C78D00" soft="#FFF4C7" />
            <MetricCard icon={<Flower2 size={16} />} label="已种植物" value={state.garden.length} accent="#7C3AED" soft="#F4F0FF" />
            <MetricCard className="col-span-2 lg:col-span-1" icon={<Ghost size={16} />} label="作业怪" value={monsters} accent="#D94A3A" soft="#FFF1EE" />
          </section>

          <section className="mt-4 rounded-lg border border-[#DFE6DF] bg-white p-4 dark:border-white/10 dark:bg-[#15171C]">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs font-semibold text-[#5F695F] dark:text-white/55">
                  <span>今天的成长进度</span>
                  <span>{progress.percent}%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#EDF1ED] dark:bg-white/10">
                  <div className="h-full rounded-full bg-[#69B94C] transition-[width] duration-500" style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
              <div className={`hidden items-center gap-2 rounded-lg px-3 py-2 sm:flex ${streak >= 7 ? 'bg-[#FFF4C7] text-[#8B6300]' : 'bg-[#F2F4F2] text-[#788078] dark:bg-white/[0.05]'}`}>
                <Trophy size={17} />
                <span className="text-xs font-bold">{streak >= 7 ? '七日成就已点亮' : `连续完成 ${streak} 天`}</span>
              </div>
              <div className="hidden items-center gap-1.5 lg:flex">
                {Array.from({ length: monsters }, (_, index) => (
                  <Monster key={index} color={['#F3794F', '#5578C9', '#8D63C7', '#E1A53B'][index % 4]} small />
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      <div className="mt-6 min-w-0">
        {(panel === 'today' || (Object.keys(SUBJECT_META) as SummerSubject[]).includes(panel as SummerSubject)) && renderTasks()}
        {panel === 'mood' && renderMood()}
        {panel === 'focus' && renderFocus()}
        {panel === 'garden' && renderGarden()}
        {panel === 'shop' && renderShop()}
        {panel === 'rewards' && renderRewards()}
        {panel === 'growth' && renderGrowth()}
      </div>

      {notice && (
        <div className="fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-lg bg-[#18201A] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.25)] md:bottom-6">
          <Sparkles size={16} className="text-[#F7C948]" />
          {notice}
        </div>
      )}

      {quizTask && (
        <QuizModal task={quizTask} onClose={() => setQuizTask(null)} onComplete={score => completeTask(quizTask, score)} />
      )}
      {writingOpen && (
        <WritingModal
          completed={day.completedTaskIds.includes('chinese-writing')}
          onClose={() => setWritingOpen(false)}
          onComplete={() => {
            const task = state.tasks.find(item => item.id === 'chinese-writing');
            if (task) completeTask(task);
          }}
        />
      )}
      {pinModalOpen && (
        <ParentPinModal
          setup={pinSetup}
          busy={pinBusy}
          error={pinError}
          onClose={() => setPinModalOpen(false)}
          onSubmit={unlockParent}
        />
      )}
      {syncModalOpen && (
        <SyncModal
          currentCode={workspaceCode}
          busy={syncBusy}
          error={syncError}
          onClose={() => setSyncModalOpen(false)}
          onCreate={createSyncWorkspace}
          onJoin={joinSyncWorkspace}
          onLeave={leaveSyncWorkspace}
        />
      )}
      {addTaskOpen && (
        <AddTaskModal
          onClose={() => setAddTaskOpen(false)}
          onAdd={task => {
            saveConfig([...state.tasks, task]);
            setAddTaskOpen(false);
            setNotice(`已添加「${task.title}」`);
          }}
        />
      )}
    </div>
  );
};

export default SummerGardenView;
