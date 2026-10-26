import {
  EDUCATION_ITEMS,
  ENTERTAINMENT_ITEMS,
  UTILITIES_ITEMS,
} from "../constants";

export type ExperienceGroup =
  | "space"
  | "science"
  | "create"
  | "strategy"
  | "culture"
  | "practice"
  | "tools";
export interface Experience {
  id: string;
  title: string;
  description: string;
  group: ExperienceGroup;
  format: string;
  minutes: number;
  cover: string;
  coverSmall: string;
  accent: string;
  featured?: boolean;
  prompt: string;
  tags: string[];
}

export const EXPERIENCE_GROUPS: {
  id: ExperienceGroup | "all";
  label: string;
}[] = [
  { id: "all", label: "全部体验" },
  { id: "space", label: "宇宙" },
  { id: "science", label: "科学实验" },
  { id: "create", label: "创作" },
  { id: "strategy", label: "策略" },
  { id: "culture", label: "人文" },
  { id: "practice", label: "轻练习" },
  { id: "tools", label: "实用工具" },
];

const details: Record<
  string,
  Omit<Experience, "id" | "tags" | "cover" | "coverSmall">
> = {
  e1: {
    title: "宇宙探索",
    description: "从蓝色星球出发，穿过银河，抵达深空。",
    group: "space",
    format: "3D 探索",
    minutes: 20,
    accent: "#a0e7cc",
    featured: true,
    prompt: "选择一颗让你好奇的天体，记录一个与地球不同的地方。",
  },
  e3: {
    title: "波动实验室",
    description: "让两列波相遇，看见增强、抵消与共振。",
    group: "science",
    format: "实时模拟",
    minutes: 10,
    accent: "#81b9f9",
    featured: true,
    prompt: "保持两个波源的振幅和频率相同，把相位差调到 180°，观察合成波。",
  },
  e2: {
    title: "微型生态",
    description: "连接一条食物链，追踪能量的去向。",
    group: "science",
    format: "互动实验",
    minutes: 8,
    accent: "#bfdc8d",
    featured: true,
    prompt: "从植物开始，连接至少三个生物，并验证能量流动的方向。",
  },
  u1: {
    title: "自由画室",
    description: "让一个想法，成为自己的作品。",
    group: "create",
    format: "自由创作",
    minutes: 15,
    accent: "#eea2a7",
    featured: true,
    prompt: "画下今天的一次发现。完成后导出作品，或在笔记中记下创作想法。",
  },
  ent6: {
    title: "国际象棋",
    description: "一张棋盘，下一步由你决定。",
    group: "strategy",
    format: "策略对弈",
    minutes: 20,
    accent: "#d7c691",
    featured: true,
    prompt: "走棋前找到一个对手的威胁，复盘时记录你如何应对。",
  },
  e5: {
    title: "诗词之间",
    description: "从文字的碎片，走进一首诗的意境。",
    group: "culture",
    format: "文字探索",
    minutes: 12,
    accent: "#e2bd91",
    featured: true,
    prompt: "选出一句你喜欢的诗，用自己的话描述它的画面。",
  },
  e20: {
    title: "三字经",
    description: "读一句经典，了解一句背后的故事。",
    group: "culture",
    format: "经典阅读",
    minutes: 10,
    accent: "#e2bd91",
    prompt: "记录一句今天新理解的文字，以及它的意思。",
  },
  e21: {
    title: "千字文",
    description: "在千字长卷中，寻找天地与人间。",
    group: "culture",
    format: "经典阅读",
    minutes: 12,
    accent: "#e2bd91",
    prompt: "选一个新认识的字，记下它在文中的含义。",
  },
  e4: {
    title: "汉字拼图",
    description: "拆开，再组合，发现汉字的结构。",
    group: "culture",
    format: "互动练习",
    minutes: 8,
    accent: "#e2bd91",
    prompt: "用同一个偏旁组成三个不同的汉字。",
  },
  e6: {
    title: "历史时间线",
    description: "把散落的事件，放回时间的长河。",
    group: "culture",
    format: "排序挑战",
    minutes: 8,
    accent: "#e2bd91",
    prompt: "记录一组事件的先后关系，并找出其中的联系。",
  },
  e7: {
    title: "时间观察站",
    description: "拨动指针，理解一天怎样流动。",
    group: "practice",
    format: "互动练习",
    minutes: 6,
    accent: "#81b9f9",
    prompt: "设置一个日常活动的时间，同时读出时针与分针的位置。",
  },
  e18: {
    title: "心算挑战",
    description: "一分钟，和自己的上一轮比一比。",
    group: "practice",
    format: "限时挑战",
    minutes: 5,
    accent: "#f0d478",
    prompt: "完成一轮挑战，记录准确答出的题数。",
  },
  ent3: {
    title: "换个角度",
    description: "一道小谜题，一种不同的思路。",
    group: "practice",
    format: "趣味谜题",
    minutes: 5,
    accent: "#e6bf91",
    prompt: "先自己思考，再看答案，记下题目中被忽略的线索。",
  },
  ent4: {
    title: "五子棋",
    description: "在进攻与防守之间，找到第五颗棋子。",
    group: "strategy",
    format: "策略对弈",
    minutes: 15,
    accent: "#d7c691",
    prompt: "找出一次需要优先防守而不是进攻的局面。",
  },
  ent5: {
    title: "中国象棋",
    description: "楚河汉界，两军之间的取舍。",
    group: "strategy",
    format: "策略对弈",
    minutes: 20,
    accent: "#d7c691",
    prompt: "复盘一个决定局势的交换，说明你为什么这样走。",
  },
  ent7: {
    title: "围棋",
    description: "从一块棋的气，到整张棋盘的势。",
    group: "strategy",
    format: "策略对弈",
    minutes: 25,
    accent: "#d7c691",
    prompt: "观察一块棋还有几口气，再决定下一步。",
  },
  ent8: {
    title: "烟雨江南",
    description: "穿过石桥与河埠，完成一场救援。",
    group: "strategy",
    format: "3D 游戏",
    minutes: 25,
    accent: "#b5c8a1",
    prompt: "完成一章救援后，记下最有效的一次路线选择。",
  },
  u2: {
    title: "单词漫游",
    description: "认识一个词，也读懂它的用法。",
    group: "practice",
    format: "词汇练习",
    minutes: 10,
    accent: "#81b9f9",
    prompt: "选一个新学的单词，用它写一句自己的句子。",
  },
  u3: {
    title: "成语探索",
    description: "四个字，打开一种新视角。",
    group: "culture",
    format: "阅读查询",
    minutes: 6,
    accent: "#e2bd91",
    prompt: "记录一个成语的含义，以及可以使用它的场景。",
  },
  u4: {
    title: "汇率换算",
    description: "有日期、有来源的参考汇率换算。",
    group: "tools",
    format: "实用工具",
    minutes: 3,
    accent: "#a0e7cc",
    prompt: "记录使用的币种、汇率日期与换算结果。",
  },
};

export const EXPERIENCES: Experience[] = [
  ...EDUCATION_ITEMS,
  ...ENTERTAINMENT_ITEMS,
  ...UTILITIES_ITEMS,
].map((item) => ({
  id: item.id,
  tags: item.tags,
  ...details[item.id],
  cover: `/images/covers/${item.id}.webp`,
  coverSmall: `/images/covers/${item.id}-480.webp`,
}));
export const EXPERIENCE_BY_ID = new Map(
  EXPERIENCES.map((item) => [item.id, item]),
);
export const FEATURED_EXPERIENCES = ["e1", "e3", "e2", "u1", "ent6", "e5"].map(
  (id) => EXPERIENCE_BY_ID.get(id)!,
);

export function searchExperiences(query: string, group: string = "all") {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return EXPERIENCES.filter(
    (item) =>
      (group === "all" || item.group === group) &&
      words.every((word) =>
        `${item.title} ${item.description} ${item.format} ${item.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}
