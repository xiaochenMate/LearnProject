export type SummerSubject = 'chinese' | 'math' | 'english' | 'sport';
export type SummerTaskKind = 'check' | 'quiz' | 'reading' | 'practice';
export type SummerMood = 'great' | 'good' | 'okay' | 'low' | 'upset';
export type SummerPanel =
  | 'today'
  | SummerSubject
  | 'mood'
  | 'focus'
  | 'garden'
  | 'shop'
  | 'rewards'
  | 'growth';

export interface SummerTask {
  id: string;
  subject: SummerSubject;
  title: string;
  description: string;
  kind: SummerTaskKind;
  minutes: number;
  reward: number;
  testKind?: 'pinyin' | 'poetry' | 'arithmetic' | 'multiplication' | 'logic' | 'words' | 'sentences';
  custom?: boolean;
}

export interface QuizScore {
  correct: number;
  total: number;
}

export interface SummerDayRecord {
  date: string;
  expectedTaskIds: string[];
  completedTaskIds: string[];
  quizScores: Record<string, QuizScore>;
  defeatedMonsters: number;
  mood?: SummerMood;
  moodNote?: string;
  focusMinutes?: number;
}

export interface GardenPlant {
  id: string;
  plantId: string;
  row: number;
  column: number;
  plantedAt: string;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  title: string;
  cost: number;
  redeemedAt: string;
}

export interface SummerWorkspaceState {
  schemaVersion: 1;
  version: number;
  childName: string;
  vacationEnd: string;
  tasks: SummerTask[];
  days: Record<string, SummerDayRecord>;
  sun: number;
  garden: GardenPlant[];
  redemptions: RewardRedemption[];
  appliedActionIds: string[];
  updatedAt: string;
}

export interface SummerMutation {
  id: string;
  type: 'complete-task' | 'plant' | 'redeem' | 'save-config' | 'save-check-in' | 'log-focus';
  date: string;
  taskId?: string;
  score?: QuizScore;
  plantId?: string;
  row?: number;
  column?: number;
  rewardId?: string;
  childName?: string;
  vacationEnd?: string;
  tasks?: SummerTask[];
  mood?: SummerMood;
  note?: string;
  minutes?: number;
}

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  pinyin?: string;
  explanation?: string;
}

export const SUBJECT_META: Record<SummerSubject, {
  label: string;
  shortLabel: string;
  color: string;
  soft: string;
  border: string;
}> = {
  chinese: {
    label: '语文花圃',
    shortLabel: '语文',
    color: '#E24A3B',
    soft: '#FFF1EE',
    border: '#F6C9C1',
  },
  math: {
    label: '数学苗圃',
    shortLabel: '数学',
    color: '#2563EB',
    soft: '#EDF4FF',
    border: '#C9DAFB',
  },
  english: {
    label: '英语果园',
    shortLabel: '英语',
    color: '#7C3AED',
    soft: '#F4F0FF',
    border: '#D9CCFA',
  },
  sport: {
    label: '运动草场',
    shortLabel: '运动',
    color: '#16865C',
    soft: '#EAF9F1',
    border: '#BFE8D4',
  },
};

export const PLANT_CATALOG = [
  {
    id: 'sun-bloom',
    name: '阳光花',
    description: '让花园每天都亮一点',
    cost: 30,
    glyph: '☀',
    color: '#F4B400',
    background: '#FFF4C7',
  },
  {
    id: 'leaf-guard',
    name: '叶盾苗',
    description: '认真完成会长出新叶',
    cost: 50,
    glyph: '♣',
    color: '#16865C',
    background: '#DDF5E9',
  },
  {
    id: 'water-bud',
    name: '水滴芽',
    description: '为坚持补充清凉能量',
    cost: 80,
    glyph: '◆',
    color: '#198BC7',
    background: '#DDF4FF',
  },
  {
    id: 'star-fruit',
    name: '星愿果',
    description: '为七日连续完成纪念',
    cost: 120,
    glyph: '★',
    color: '#7C3AED',
    background: '#EEE7FF',
  },
] as const;

export const REWARD_CATALOG = [
  {
    id: 'defeat-monster',
    title: '赶走一只作业怪',
    description: '今天少一只作业怪，进度不变',
    cost: 100,
  },
  {
    id: 'skip-card',
    title: '免写卡',
    description: '和家长约定后使用一次',
    cost: 200,
  },
  {
    id: 'game-time',
    title: '游戏 30 分钟',
    description: '兑换后请家长确认使用',
    cost: 300,
  },
  {
    id: 'playground',
    title: '游乐场一次',
    description: '把努力兑换成一次共同出发',
    cost: 500,
  },
] as const;

export const WRITING_CARDS = [
  { character: '木', radical: '木', strokes: 4, order: '横、竖、撇、捺' },
  { character: '禾', radical: '禾', strokes: 5, order: '撇、横、竖、撇、捺' },
  { character: '休', radical: '亻', strokes: 6, order: '撇、竖、横、竖、撇、捺' },
  { character: '林', radical: '木', strokes: 8, order: '横、竖、撇、点、横、竖、撇、捺' },
  { character: '森', radical: '木', strokes: 12, order: '先上后下，三个“木”写紧凑' },
];

export const DEFAULT_SUMMER_TASKS: SummerTask[] = [
  {
    id: 'chinese-pinyin',
    subject: 'chinese',
    title: '拼音小测',
    description: '认读声母、韵母和常见整体认读音节',
    kind: 'quiz',
    minutes: 8,
    reward: 10,
    testKind: 'pinyin',
  },
  {
    id: 'chinese-writing',
    subject: 'chinese',
    title: '每日练字',
    description: '观察偏旁、笔顺与间架结构，认真写 1 页',
    kind: 'practice',
    minutes: 15,
    reward: 10,
  },
  {
    id: 'chinese-poetry',
    subject: 'chinese',
    title: '古诗词背诵',
    description: '读拼音、懂意思，再完成随机小测试',
    kind: 'quiz',
    minutes: 12,
    reward: 10,
    testKind: 'poetry',
  },
  {
    id: 'chinese-reading',
    subject: 'chinese',
    title: '课外阅读 20 分钟',
    description: '读完后用一句话说说最喜欢的部分',
    kind: 'reading',
    minutes: 20,
    reward: 50,
  },
  {
    id: 'math-arithmetic',
    subject: 'math',
    title: '100 以内口算',
    description: '随机 10 题，练准确再练速度',
    kind: 'quiz',
    minutes: 10,
    reward: 10,
    testKind: 'arithmetic',
  },
  {
    id: 'math-multiplication',
    subject: 'math',
    title: '乘法口诀预习',
    description: '在理解几个几的基础上熟悉口诀',
    kind: 'quiz',
    minutes: 10,
    reward: 10,
    testKind: 'multiplication',
  },
  {
    id: 'math-logic',
    subject: 'math',
    title: '数学思维训练',
    description: '找规律、比较和简单生活应用共 10 题',
    kind: 'quiz',
    minutes: 12,
    reward: 10,
    testKind: 'logic',
  },
  {
    id: 'english-words',
    subject: 'english',
    title: '英语单词',
    description: '学习家庭、颜色、数字和日常用品词汇',
    kind: 'quiz',
    minutes: 10,
    reward: 10,
    testKind: 'words',
  },
  {
    id: 'english-sentences',
    subject: 'english',
    title: '英语短句',
    description: '听读常用问候与自我表达，完成 10 题',
    kind: 'quiz',
    minutes: 12,
    reward: 10,
    testKind: 'sentences',
  },
  {
    id: 'sport-rope',
    subject: 'sport',
    title: '1 分钟跳绳',
    description: '保持节奏，记录今天最好的一次',
    kind: 'check',
    minutes: 8,
    reward: 10,
  },
  {
    id: 'sport-run',
    subject: 'sport',
    title: '轻松跑走',
    description: '跑走结合 10 分钟，完成后记得拉伸',
    kind: 'check',
    minutes: 12,
    reward: 10,
  },
  {
    id: 'sport-jump',
    subject: 'sport',
    title: '立定跳远练习',
    description: '摆臂、屈膝、蹬地，安全练习 5 组',
    kind: 'practice',
    minutes: 10,
    reward: 10,
  },
  {
    id: 'sport-ball',
    subject: 'sport',
    title: '球类小练习',
    description: '篮球、足球、乒乓球或羽毛球任选一项',
    kind: 'practice',
    minutes: 15,
    reward: 10,
  },
];

const pad = (value: number) => value.toString().padStart(2, '0');

export const getDateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getDefaultVacationEnd = () => {
  const now = new Date();
  const year = now.getMonth() > 7 ? now.getFullYear() + 1 : now.getFullYear();
  return `${year}-08-31`;
};

export const createSummerWorkspace = (): SummerWorkspaceState => ({
  schemaVersion: 1,
  version: 0,
  childName: '小小守护员',
  vacationEnd: getDefaultVacationEnd(),
  tasks: DEFAULT_SUMMER_TASKS.map(task => ({ ...task })),
  days: {},
  sun: 0,
  garden: [],
  redemptions: [],
  appliedActionIds: [],
  updatedAt: new Date().toISOString(),
});

export const normalizeSummerWorkspace = (value: Partial<SummerWorkspaceState> | null | undefined) => {
  const fallback = createSummerWorkspace();
  if (!value || value.schemaVersion !== 1) return fallback;
  return {
    ...fallback,
    ...value,
    tasks: Array.isArray(value.tasks) ? value.tasks : fallback.tasks,
    days: value.days && typeof value.days === 'object' ? value.days : {},
    garden: Array.isArray(value.garden) ? value.garden : [],
    redemptions: Array.isArray(value.redemptions) ? value.redemptions : [],
    appliedActionIds: Array.isArray(value.appliedActionIds) ? value.appliedActionIds : [],
  } satisfies SummerWorkspaceState;
};

export const getDayRecord = (state: SummerWorkspaceState, date = getDateKey()): SummerDayRecord =>
  state.days[date] || {
    date,
    expectedTaskIds: state.tasks.map(task => task.id),
    completedTaskIds: [],
    quizScores: {},
    defeatedMonsters: 0,
  };

export const getTodayProgress = (state: SummerWorkspaceState, date = getDateKey()) => {
  const record = getDayRecord(state, date);
  const total = state.tasks.length;
  const completed = state.tasks.filter(task => record.completedTaskIds.includes(task.id)).length;
  return {
    completed,
    total,
    percent: total ? Math.round((completed / total) * 100) : 0,
  };
};

export const getIncompleteSubjects = (state: SummerWorkspaceState, date = getDateKey()) => {
  const record = getDayRecord(state, date);
  return (Object.keys(SUBJECT_META) as SummerSubject[]).filter(subject => {
    const subjectTasks = state.tasks.filter(task => task.subject === subject);
    return subjectTasks.some(task => !record.completedTaskIds.includes(task.id));
  });
};

export const getMonsterCount = (state: SummerWorkspaceState, date = getDateKey()) => {
  const record = getDayRecord(state, date);
  return Math.max(0, getIncompleteSubjects(state, date).length - record.defeatedMonsters);
};

export const getVacationDaysLeft = (vacationEnd: string) => {
  const end = new Date(`${vacationEnd}T23:59:59`);
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
};

const isDayComplete = (state: SummerWorkspaceState, date: string) => {
  const record = state.days[date];
  if (!record || record.expectedTaskIds.length === 0) return false;
  return record.expectedTaskIds.every(id => record.completedTaskIds.includes(id));
};

export const getSummerStreak = (state: SummerWorkspaceState) => {
  const cursor = new Date();
  if (!isDayComplete(state, getDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (isDayComplete(state, getDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const withAppliedAction = (state: SummerWorkspaceState, actionId: string): SummerWorkspaceState => ({
  ...state,
  version: state.version + 1,
  appliedActionIds: [actionId, ...state.appliedActionIds.filter(id => id !== actionId)].slice(0, 150),
  updatedAt: new Date().toISOString(),
});

export const applySummerMutation = (
  current: SummerWorkspaceState,
  mutation: SummerMutation,
): SummerWorkspaceState => {
  const state = normalizeSummerWorkspace(current);
  if (state.appliedActionIds.includes(mutation.id)) return state;

  if (mutation.type === 'complete-task') {
    const task = state.tasks.find(item => item.id === mutation.taskId);
    if (!task) return state;
    const record = getDayRecord(state, mutation.date);
    if (record.completedTaskIds.includes(task.id)) return state;
    const perfectBonus =
      task.kind === 'quiz' &&
      mutation.score &&
      mutation.score.total > 0 &&
      mutation.score.correct === mutation.score.total
        ? 10
        : 0;
    const nextRecord: SummerDayRecord = {
      ...record,
      expectedTaskIds: record.expectedTaskIds.length ? record.expectedTaskIds : state.tasks.map(item => item.id),
      completedTaskIds: [...record.completedTaskIds, task.id],
      quizScores: mutation.score
        ? { ...record.quizScores, [task.id]: mutation.score }
        : record.quizScores,
    };
    return withAppliedAction({
      ...state,
      sun: state.sun + task.reward + perfectBonus,
      days: { ...state.days, [mutation.date]: nextRecord },
    }, mutation.id);
  }

  if (mutation.type === 'plant') {
    const plant = PLANT_CATALOG.find(item => item.id === mutation.plantId);
    const row = Number(mutation.row);
    const column = Number(mutation.column);
    if (
      !plant ||
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      row > 4 ||
      column < 0 ||
      column > 8 ||
      state.sun < plant.cost ||
      state.garden.some(item => item.row === row && item.column === column)
    ) {
      return state;
    }
    return withAppliedAction({
      ...state,
      sun: state.sun - plant.cost,
      garden: [
        ...state.garden,
        {
          id: mutation.id,
          plantId: plant.id,
          row,
          column,
          plantedAt: new Date().toISOString(),
        },
      ],
    }, mutation.id);
  }

  if (mutation.type === 'redeem') {
    const reward = REWARD_CATALOG.find(item => item.id === mutation.rewardId);
    if (!reward || state.sun < reward.cost) return state;
    const record = getDayRecord(state, mutation.date);
    if (reward.id === 'defeat-monster' && getMonsterCount(state, mutation.date) <= 0) return state;
    const nextRecord = reward.id === 'defeat-monster'
      ? { ...record, defeatedMonsters: record.defeatedMonsters + 1 }
      : record;
    return withAppliedAction({
      ...state,
      sun: state.sun - reward.cost,
      days: { ...state.days, [mutation.date]: nextRecord },
      redemptions: [
        {
          id: mutation.id,
          rewardId: reward.id,
          title: reward.title,
          cost: reward.cost,
          redeemedAt: new Date().toISOString(),
        },
        ...state.redemptions,
      ].slice(0, 100),
    }, mutation.id);
  }

  if (mutation.type === 'save-config') {
    const tasks = (mutation.tasks || state.tasks).filter(task => task.title.trim());
    return withAppliedAction({
      ...state,
      childName: mutation.childName?.trim() || state.childName,
      vacationEnd: mutation.vacationEnd || state.vacationEnd,
      tasks,
    }, mutation.id);
  }

  if (mutation.type === 'save-check-in') {
    const moods: SummerMood[] = ['great', 'good', 'okay', 'low', 'upset'];
    if (!mutation.mood || !moods.includes(mutation.mood)) return state;
    const record = getDayRecord(state, mutation.date);
    const nextRecord: SummerDayRecord = {
      ...record,
      mood: mutation.mood,
      moodNote: mutation.note?.trim().slice(0, 160) || '',
    };
    return withAppliedAction({
      ...state,
      days: { ...state.days, [mutation.date]: nextRecord },
    }, mutation.id);
  }

  if (mutation.type === 'log-focus') {
    const minutes = Math.round(Number(mutation.minutes));
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 120) return state;
    const record = getDayRecord(state, mutation.date);
    const nextRecord: SummerDayRecord = {
      ...record,
      focusMinutes: Math.min(240, (record.focusMinutes || 0) + minutes),
    };
    return withAppliedAction({
      ...state,
      days: { ...state.days, [mutation.date]: nextRecord },
    }, mutation.id);
  }

  return state;
};

const shuffle = <T,>(values: T[]) => {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
};

const pick = <T,>(values: T[], count: number) => shuffle(values).slice(0, count);

const withOptions = (answer: number, alternatives: number[]) => {
  const options = Array.from(new Set([answer, ...alternatives]))
    .filter(value => value >= 0)
    .slice(0, 4);
  let step = 1;
  while (options.length < 4) {
    const candidate = Math.max(0, answer + step);
    if (!options.includes(candidate)) options.push(candidate);
    step += 1;
  }
  return shuffle(options.map(String));
};

const PINYIN_POOL = [
  { word: '夏', answer: 'xià', options: ['xià', 'shà', 'xiā', 'sà'] },
  { word: '云', answer: 'yún', options: ['yún', 'yǔn', 'rún', 'yūn'] },
  { word: '桥', answer: 'qiáo', options: ['qiáo', 'jiáo', 'qiǎo', 'qáo'] },
  { word: '绿', answer: 'lǜ', options: ['lǜ', 'lù', 'nǜ', 'lǔ'] },
  { word: '晨', answer: 'chén', options: ['chén', 'cén', 'chěn', 'shén'] },
  { word: '光', answer: 'guāng', options: ['guāng', 'kuāng', 'gāng', 'guǎng'] },
  { word: '学', answer: 'xué', options: ['xué', 'xüé', 'xié', 'shué'] },
  { word: '园', answer: 'yuán', options: ['yuán', 'yán', 'ruán', 'yǎn'] },
  { word: '树', answer: 'shù', options: ['shù', 'sù', 'shǔ', 'chù'] },
  { word: '风', answer: 'fēng', options: ['fēng', 'fōng', 'fěn', 'hēng'] },
];

const POETRY_POOL = [
  {
    prompt: '“床前明月光”的下一句是？',
    answer: '疑是地上霜',
    options: ['疑是地上霜', '低头思故乡', '处处闻啼鸟', '粒粒皆辛苦'],
    pinyin: 'yí shì dì shàng shuāng',
    explanation: '诗人把明亮的月光想象成地上的白霜，写出夜色清冷明亮。',
  },
  {
    prompt: '“春眠不觉晓”的下一句是？',
    answer: '处处闻啼鸟',
    options: ['处处闻啼鸟', '花落知多少', '汗滴禾下土', '低头思故乡'],
    pinyin: 'chù chù wén tí niǎo',
    explanation: '春日醒来，到处都能听到鸟叫，表现春晨的生机。',
  },
  {
    prompt: '“锄禾日当午”的下一句是？',
    answer: '汗滴禾下土',
    options: ['汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦', '白毛浮绿水'],
    pinyin: 'hàn dī hé xià tǔ',
    explanation: '农民在烈日下劳动，汗水滴进禾苗下面的泥土。',
  },
  {
    prompt: '“白毛浮绿水”的下一句是？',
    answer: '红掌拨清波',
    options: ['红掌拨清波', '曲项向天歌', '鹅鹅鹅', '粒粒皆辛苦'],
    pinyin: 'hóng zhǎng bō qīng bō',
    explanation: '白鹅用红色脚掌拨动清水，画面明快又有动感。',
  },
  {
    prompt: '“举头望明月”的下一句是？',
    answer: '低头思故乡',
    options: ['低头思故乡', '疑是地上霜', '花落知多少', '红掌拨清波'],
    pinyin: 'dī tóu sī gù xiāng',
    explanation: '诗人抬头看月亮，又低头想起家乡，表达思乡之情。',
  },
];

const LOGIC_POOL: Omit<QuizQuestion, 'id'>[] = [
  { prompt: '2、4、6、8，下一项是？', options: ['9', '10', '11', '12'], answer: '10', explanation: '每次增加 2。' },
  { prompt: '15 比 9 多多少？', options: ['4', '5', '6', '7'], answer: '6', explanation: '15 - 9 = 6。' },
  { prompt: '小明有 8 颗糖，送出 3 颗，还剩多少？', options: ['4', '5', '6', '7'], answer: '5' },
  { prompt: '1、3、5、7，下一项是？', options: ['8', '9', '10', '11'], answer: '9', explanation: '这是连续的单数。' },
  { prompt: '一个正方形有几条边？', options: ['3', '4', '5', '6'], answer: '4' },
  { prompt: '3 个 4 相加是多少？', options: ['7', '10', '12', '14'], answer: '12' },
  { prompt: '上午 9 点再过 2 小时是几点？', options: ['10 点', '11 点', '12 点', '下午 1 点'], answer: '11 点' },
  { prompt: '20、18、16、14，下一项是？', options: ['10', '11', '12', '13'], answer: '12' },
  { prompt: '一周有 7 天，两周有多少天？', options: ['12', '13', '14', '15'], answer: '14' },
  { prompt: '红、黄、红、黄，下一种颜色是？', options: ['红', '黄', '蓝', '绿'], answer: '红' },
  { prompt: '最大的两位数是？', options: ['90', '98', '99', '100'], answer: '99' },
  { prompt: '5 + 5 + 5 可以写成？', options: ['3 × 5', '5 × 5', '2 × 5', '3 + 5'], answer: '3 × 5' },
];

const WORD_POOL = [
  ['apple', '苹果'], ['book', '书'], ['blue', '蓝色'], ['family', '家庭'], ['friend', '朋友'],
  ['green', '绿色'], ['school', '学校'], ['summer', '夏天'], ['water', '水'], ['yellow', '黄色'],
  ['morning', '早晨'], ['pencil', '铅笔'],
] as const;

const SENTENCE_POOL = [
  ['Good morning!', '早上好！'],
  ['How are you?', '你好吗？'],
  ['I am seven.', '我七岁。'],
  ['This is my book.', '这是我的书。'],
  ['I like summer.', '我喜欢夏天。'],
  ['Thank you.', '谢谢你。'],
  ['What is your name?', '你叫什么名字？'],
  ['See you tomorrow.', '明天见。'],
  ['The grass is green.', '草地是绿色的。'],
  ['I can jump.', '我会跳。'],
  ['Please sit down.', '请坐下。'],
  ['Let us read together.', '让我们一起读。'],
] as const;

export const generateQuizQuestions = (task: SummerTask): QuizQuestion[] => {
  if (task.testKind === 'pinyin') {
    return pick(PINYIN_POOL, 5).map((item, index) => ({
      id: `pinyin-${index}-${item.word}`,
      prompt: `“${item.word}”正确的拼音是？`,
      options: shuffle(item.options),
      answer: item.answer,
    }));
  }

  if (task.testKind === 'poetry') {
    return pick(POETRY_POOL, 5).map((item, index) => ({
      id: `poetry-${index}`,
      ...item,
      options: shuffle(item.options),
    }));
  }

  if (task.testKind === 'arithmetic') {
    return Array.from({ length: 10 }, (_, index) => {
      const addition = Math.random() > 0.45;
      if (addition) {
        const left = Math.floor(Math.random() * 71);
        const right = Math.floor(Math.random() * (101 - left));
        const answer = left + right;
        return {
          id: `arithmetic-${index}`,
          prompt: `${left} + ${right} = ?`,
          options: withOptions(answer, [answer - 1, answer + 1, answer + 10]),
          answer: String(answer),
        };
      }
      const left = 20 + Math.floor(Math.random() * 81);
      const right = Math.floor(Math.random() * (left + 1));
      const answer = left - right;
      return {
        id: `arithmetic-${index}`,
        prompt: `${left} - ${right} = ?`,
        options: withOptions(answer, [answer - 1, answer + 1, answer + 10]),
        answer: String(answer),
      };
    });
  }

  if (task.testKind === 'multiplication') {
    return Array.from({ length: 10 }, (_, index) => {
      const left = 2 + Math.floor(Math.random() * 8);
      const right = 1 + Math.floor(Math.random() * 9);
      const answer = left * right;
      return {
        id: `multiplication-${index}`,
        prompt: `${left} × ${right} = ?`,
        options: withOptions(answer, [answer - left, answer + left, answer + 1]),
        answer: String(answer),
        explanation: `${left} 个 ${right} 相加，结果是 ${answer}。`,
      };
    });
  }

  if (task.testKind === 'logic') {
    return pick(LOGIC_POOL, 10).map((item, index) => ({
      id: `logic-${index}`,
      ...item,
      options: shuffle(item.options),
    }));
  }

  if (task.testKind === 'words') {
    const selection = pick([...WORD_POOL], 10);
    const meanings = WORD_POOL.map(item => item[1]);
    return selection.map(([word, meaning], index) => ({
      id: `word-${index}-${word}`,
      prompt: `“${word}”是什么意思？`,
      options: shuffle([meaning, ...pick(meanings.filter(item => item !== meaning), 3)]),
      answer: meaning,
    }));
  }

  if (task.testKind === 'sentences') {
    const selection = pick([...SENTENCE_POOL], 10);
    const meanings = SENTENCE_POOL.map(item => item[1]);
    return selection.map(([sentence, meaning], index) => ({
      id: `sentence-${index}`,
      prompt: `“${sentence}”是什么意思？`,
      options: shuffle([meaning, ...pick(meanings.filter(item => item !== meaning), 3)]),
      answer: meaning,
    }));
  }

  return [];
};

export const createActionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createWorkspaceCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
};
