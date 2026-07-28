import { AppItem, Category } from '../types';

export interface ModuleSession {
  startedAt: string;
  seconds: number;
}

export interface ModuleUsage {
  launches: number;
  totalSeconds: number;
  lastOpened: string;
  sessions: ModuleSession[];
}

export type UsageMap = Record<string, ModuleUsage>;

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  outcome: string;
  moduleIds: string[];
  tone: 'forest' | 'coral' | 'sky' | 'gold';
}

export const CATEGORY_META: Record<Category, { label: string; description: string }> = {
  education: { label: '学习', description: '建立知识与基础能力' },
  entertainment: { label: '对弈', description: '通过策略练习保持专注' },
  utilities: { label: '工具', description: '解决具体任务并提升效率' },
};

const MODULE_META: Record<string, { minutes: number; level: string; outcome: string }> = {
  e1: { minutes: 12, level: '探索', outcome: '建立空间与地理直觉' },
  e20: { minutes: 10, level: '入门', outcome: '朗读、理解并积累国学常识' },
  e21: { minutes: 12, level: '进阶', outcome: '理解经典文本与汉字脉络' },
  e2: { minutes: 8, level: '入门', outcome: '理解生态系统中的捕食关系' },
  e3: { minutes: 10, level: '进阶', outcome: '直观看懂波的叠加与干涉' },
  e4: { minutes: 8, level: '入门', outcome: '掌握汉字偏旁与结构规律' },
  e5: { minutes: 12, level: '进阶', outcome: '积累诗词并理解意象表达' },
  e6: { minutes: 8, level: '练习', outcome: '建立清晰的历史时间线' },
  e7: { minutes: 6, level: '入门', outcome: '掌握时、分、秒与读表方法' },
  e18: { minutes: 5, level: '练习', outcome: '提高基础运算速度与准确率' },
  ent3: { minutes: 5, level: '轻量', outcome: '用短题切换思路、激活状态' },
  ent4: { minutes: 15, level: '策略', outcome: '训练局部判断与攻防意识' },
  ent5: { minutes: 20, level: '策略', outcome: '理解传统棋类的布局与节奏' },
  ent6: { minutes: 20, level: '策略', outcome: '训练计算、规划与复盘能力' },
  ent7: { minutes: 25, level: '策略', outcome: '建立全局判断与取舍意识' },
  u1: { minutes: 15, level: '创作', outcome: '快速完成绘画与视觉表达' },
  u2: { minutes: 10, level: '日常', outcome: '用间隔复习稳步积累词汇' },
  u3: { minutes: 6, level: '查询', outcome: '准确理解与使用中文成语' },
  u4: { minutes: 3, level: '工具', outcome: '快速完成常用货币换算' },
};

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'classics',
    title: '国学启蒙',
    description: '从朗读、字义到诗词意象，循序进入古典文本。',
    outcome: '形成稳定的经典阅读习惯',
    moduleIds: ['e20', 'e21', 'e5', 'u3'],
    tone: 'coral',
  },
  {
    id: 'science',
    title: '科学直觉',
    description: '通过可操作的模型理解地理、生物与物理现象。',
    outcome: '把抽象概念变成可观察经验',
    moduleIds: ['e1', 'e2', 'e3'],
    tone: 'sky',
  },
  {
    id: 'thinking',
    title: '思维训练',
    description: '用速算、排序与策略对弈训练判断和专注。',
    outcome: '提高推理速度与持续注意力',
    moduleIds: ['e18', 'e6', 'ent3', 'ent6'],
    tone: 'gold',
  },
  {
    id: 'daily',
    title: '每日能力',
    description: '把词汇、汉字和常用工具组合成轻量日常练习。',
    outcome: '每天 10 分钟积累可迁移能力',
    moduleIds: ['u2', 'e4', 'u3', 'u4'],
    tone: 'forest',
  },
];

export const getModuleMeta = (itemOrId: AppItem | string) => {
  const id = typeof itemOrId === 'string' ? itemOrId : itemOrId.id;
  return MODULE_META[id] || { minutes: 10, level: '练习', outcome: '完成一次专注练习' };
};

export const formatFocusTime = (seconds: number) => {
  if (seconds < 60) return seconds > 0 ? '< 1 分钟' : '0 分钟';
  if (seconds < 3600) return `${Math.round(seconds / 60)} 分钟`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
};

export const getActiveDays = (usage: UsageMap) => {
  const days = new Set<string>();
  Object.values(usage).forEach(entry => {
    entry.sessions.forEach(session => days.add(session.startedAt.slice(0, 10)));
    if (entry.lastOpened) days.add(entry.lastOpened.slice(0, 10));
  });
  return days;
};

export const getStreak = (usage: UsageMap) => {
  const days = getActiveDays(usage);
  if (days.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  const today = cursor.toISOString().slice(0, 10);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const getWeekSeconds = (usage: UsageMap) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  return Object.values(usage).reduce(
    (total, entry) =>
      total +
      entry.sessions.reduce(
        (sum, session) => sum + (new Date(session.startedAt) >= start ? session.seconds : 0),
        0
      ),
    0
  );
};
