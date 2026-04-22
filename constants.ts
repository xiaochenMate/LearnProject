
import { AppItem } from './types';

export const EDUCATION_ITEMS: AppItem[] = [
  {
    id: 'e1',
    title: '3D地球',
    author: '@通义',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
    description: '交互式3D地球仪，探索地理知识与全球数据可视化。',
    tags: ['地理', '3D', '可视化'],
    icon: 'public'
  },
  {
    id: 'e20',
    title: '三字经 - 国学经典',
    author: '@国学馆',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1524169358666-79f22534bc6e?auto=format&fit=crop&q=80&w=800',
    description: '传统蒙学巅峰之作，三字一句，韵律优美。包含真人级朗读、拼音对齐与深度文化解析。',
    tags: ['国学', '启蒙', '朗读'],
    icon: 'menu_book'
  },
  {
    id: 'e21',
    title: '千字文 - 百科长卷',
    author: '@国学馆',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1506806732259-39c2d4a78ae7?auto=format&fit=crop&q=80&w=800',
    description: '一千个字，勾勒华夏宇宙、地理、历史与伦理。四字一句，辞藻华丽，朗朗上口。',
    tags: ['国学', '百科', '进阶'],
    icon: 'auto_stories'
  },
  {
    id: 'e2',
    title: '食物链排序',
    author: '@fc',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=800',
    description: '拖拽构建生态系统食物链，理解生物间的捕食关系。',
    tags: ['生物', '生态', '逻辑'],
    icon: 'pest_control'
  },
  {
    id: 'e3',
    title: '波的叠加和干涉',
    author: '@fc',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1453733190371-0a9deb61440b?auto=format&fit=crop&q=80&w=800',
    description: '动态演示物理波的干涉与叠加原理，直观展示物理现象。',
    tags: ['物理', '波', '模拟'],
    icon: 'waves'
  },
  {
    id: 'e4',
    title: '偏旁拼字学习',
    author: '@通义',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1508807526345-15e9b5f4ed42?auto=format&fit=crop&q=80&w=800',
    description: '趣味汉字结构学习，通过组合偏旁部首掌握生字。',
    tags: ['语文', '汉字', '启蒙'],
    icon: 'spellcheck'
  },
  {
    id: 'e5',
    title: '中华诗词馆',
    author: '@诗词爱好者',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1474932430478-3a7fb9067bd0?auto=format&fit=crop&q=80&w=800',
    description: '沉浸式探索中华古典诗词，通过解密与拼凑感受千年文化底蕴。',
    tags: ['文化', '诗词', '解密'],
    icon: 'history_edu'
  },
  {
    id: 'e6',
    title: '历史事件排序',
    author: '@岁月静好',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1461360228754-6e81c478c882?auto=format&fit=crop&q=80&w=800',
    description: '将历史大事件按时间轴正确排序，构建清晰的历史观。',
    tags: ['历史', '时间轴', '综合'],
    icon: 'hourglass_empty'
  },
  {
    id: 'e7',
    title: '认识钟表时间',
    author: '@zb1992',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&q=80&w=800',
    description: '教儿童认识模拟时钟，掌握时、分、秒的概念。',
    tags: ['数学', '启蒙', '生活'],
    icon: 'schedule'
  },
  {
    id: 'e18',
    title: '加减速算王',
    author: '@MathMaster',
    category: 'education',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&q=80&w=800',
    description: '极速心算挑战，提升反应速度与基础数学运算能力。',
    tags: ['数学', '竞技', '心算'],
    icon: 'calculate'
  }
];

export const ENTERTAINMENT_ITEMS: AppItem[] = [
  {
    id: 'ent6',
    title: '骑士精神 - 国际象棋',
    author: '@GrandMaster',
    category: 'entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1528819622765-d6bca13d297a?auto=format&fit=crop&q=80&w=800',
    description: '专业的 8x8 国际象棋对弈系统，支持标准规则判定与智能 AI 对手。',
    tags: ['博弈', '国际', '深度策略'],
    icon: 'grid_view'
  },
  {
    id: 'ent5',
    title: '楚汉风云 - 中国象棋',
    author: '@GrandMaster',
    category: 'entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&q=80&w=800',
    description: '经典中国象棋对弈，支持人机挑战与博弈分析。',
    tags: ['传统', '博弈', 'AI'],
    icon: 'casino'
  },
  {
    id: 'ent4',
    title: '博弈禅 - 五子棋',
    author: '@ZenMaster',
    category: 'entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?auto=format&fit=crop&q=80&w=800',
    description: '拟物化五子棋对弈，内置 Alpha-Beta 剪枝 AI 引擎。',
    tags: ['博弈', '策略', 'AI'],
    icon: 'blur_on'
  },
  {
    id: 'ent3',
    title: '每日脑筋急转弯',
    author: '@BrainTease',
    category: 'entertainment',
    imageUrl: 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&q=80&w=800',
    description: '每天更新趣味谜题，活跃思维，轻松一刻。',
    tags: ['益智', '幽默', '休闲'],
    icon: 'lightbulb'
  }
];

export const UTILITIES_ITEMS: AppItem[] = [
  {
    id: 'u1',
    title: 'ProArt - 专业绘画',
    author: '@CreativeMind',
    category: 'utilities',
    imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=800',
    description: '专业级 Web 绘图引擎，支持图层管理、无限撤销与多种笔刷工具。',
    tags: ['绘图', '图层', '工具'],
    icon: 'palette'
  },
  {
    id: 'u2',
    title: 'LingoFlow - 单词流',
    author: '@EdTechSpecialist',
    category: 'utilities',
    imageUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=800',
    description: '沉浸式词汇记忆系统，支持从小学到雅思多级难度，采用科学间隔复习算法。',
    tags: ['英语', '词汇', '效率'],
    icon: 'translate'
  },
  {
    id: 'u4',
    title: '汇率管家 - 实时换算',
    author: '@FinTechExpert',
    category: 'utilities',
    imageUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?auto=format&fit=crop&q=80&w=800',
    description: '极简汇率工具，支持全球主流货币实时转换，数据精准同步。',
    tags: ['金融', '汇率', '工具'],
    icon: 'currency_exchange'
  },
  {
    id: 'u3',
    title: '博学雅趣 - 成语大辞典',
    author: '@CultureExpert',
    category: 'utilities',
    imageUrl: 'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?auto=format&fit=crop&q=80&w=800',
    description: '探索中华文化瑰宝，支持汉字、拼音及首字母快速检索，连接云端海量成语库。',
    tags: ['文化', '工具', '检索'],
    icon: 'import_contacts'
  }
];
