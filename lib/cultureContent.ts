import { POEM_LIBRARY } from './poems';
import { SAN_ZI_JING_FALLBACK_DATA, type CharAnalysis } from './sanzijingData';
import { QIAN_ZI_WEN_LOCAL } from './qianziwenData';
import originalData from './cultureOriginalData.json';

export type CultureId = 'poetry' | 'sanzijing' | 'qianziwen' | 'idiom';
export interface CultureUnit {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  tags: string[];
  lines: string[];
  chars?: string[];
  pinyin?: string[];
  meaning: string;
  interpretation?: string;
  english?: string;
  author?: string;
  dynasty?: string;
  example?: string;
  allusion?: { title: string; text: string; source?: string };
  lexicon: Record<string, CharAnalysis>;
  reference?: { label: string; url: string };
}
export interface CultureOriginalParagraph { id: string; index: number; text: string; simplified: string; variants?: string }
export interface CultureOriginal {
  title: string; edition: string; pageUrl: string; sourceUrl: string; scanUrl?: string;
  revision: number; downloadedAt: string; rights: string; note: string; simplifiedSourceUrl: string;
  paragraphs: CultureOriginalParagraph[];
}
export interface CultureBook {
  id: CultureId;
  title: string;
  eyebrow: string;
  accent: string;
  noun: string;
  cover: string;
  source: string;
  context?: string;
  original?: CultureOriginal;
  units: CultureUnit[];
}

export const POEM_CATEGORIES: Record<string, string> = {
  nature: '写景咏物', homesick: '羁旅思亲', friendship: '友人情谊',
  ambition: '志向品格', reason: '生活哲理', festive: '节日节令',
};

// Preserve the existing locally edited definitions and original example sentences.
export const CULTURE_IDIOMS = [
  { word: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: '做了多余的事，反而把原本完成的事情弄坏。', example: '这张海报已经很清楚，再加一大段重复说明就画蛇添足了。', theme: '智慧' },
  { word: '刻舟求剑', pinyin: 'kè zhōu qiú jiàn', meaning: '情况已经变化，却仍用固定不变的方法解决问题。', example: '路线已经调整，还照着旧地图寻找入口，无异于刻舟求剑。', theme: '智慧' },
  { word: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '不主动努力，只希望偶然的好运再次发生。', example: '一次碰巧答对，不代表以后可以守株待兔、不再练习。', theme: '智慧' },
  { word: '水滴石穿', pinyin: 'shuǐ dī shí chuān', meaning: '力量虽小，只要坚持不断，也能完成困难的事情。', example: '每天认真观察一点，水滴石穿，慢慢就有了自己的发现。', theme: '坚持' },
  { word: '持之以恒', pinyin: 'chí zhī yǐ héng', meaning: '长久坚持做一件事，不轻易中断。', example: '学习新本领，需要持之以恒地练习。', theme: '坚持' },
  { word: '举一反三', pinyin: 'jǔ yī fǎn sān', meaning: '从一件事推想到类似的其他事情，触类旁通。', example: '理解了一个例题后，她举一反三，解决了另外两道题。', theme: '智慧' },
  { word: '实事求是', pinyin: 'shí shì qiú shì', meaning: '从实际情况出发，根据事实得出判断。', example: '记录实验结果时要实事求是，不把猜想写成结论。', theme: '智慧' },
  { word: '一叶知秋', pinyin: 'yī yè zhī qiū', meaning: '从细微的迹象判断事物的发展变化。', example: '他善于观察，常能从细节中一叶知秋。', theme: '自然' },
  { word: '山清水秀', pinyin: 'shān qīng shuǐ xiù', meaning: '形容山水风景清幽秀丽。', example: '我们在山清水秀的小村庄住了两天。', theme: '自然' },
  { word: '豁然开朗', pinyin: 'huò rán kāi lǎng', meaning: '由狭窄幽暗突然变得开阔明亮，也形容突然明白道理。', example: '看见波形的变化后，原本不懂的原理让我豁然开朗。', theme: '智慧' },
  { word: '全神贯注', pinyin: 'quán shén guàn zhù', meaning: '把全部精神集中在一件事情上。', example: '她全神贯注地观察月球表面的陨石坑。', theme: '坚持' },
  { word: '循序渐进', pinyin: 'xún xù jiàn jìn', meaning: '按照一定顺序，逐步深入或提高。', example: '从认识棋子到学习布局，要循序渐进。', theme: '坚持' },
  { word: '温故知新', pinyin: 'wēn gù zhī xīn', meaning: '回头温习已经学过的知识，从中得到新的理解。', example: '重读上周的观察日记时，他温故知新，发现了月相变化的规律。', theme: '学习', reference: { label: '教育部《成语典》· 温故知新', url: 'https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=-1013&la=0&webMd=1' } },
  { word: '学以致用', pinyin: 'xué yǐ zhì yòng', meaning: '把学习到的知识和方法用到实际生活或工作中。', example: '学过测量方法后，她学以致用，计算了花坛的面积。', theme: '学习', reference: { label: '香港教育大学汉文库典 · 学以致用', url: 'https://chidic.eduhk.hk/v2.php?dicword=%E5%AD%B8%E4%BB%A5%E8%87%B4%E7%94%A8&m=cizuyinyi' } },
  { word: '不耻下问', pinyin: 'bù chǐ xià wèn', meaning: '向地位或学问不如自己的人请教，也不觉得丢脸。', example: '虽然是高年级学生，他仍不耻下问，向学弟请教自己不熟悉的技巧。', theme: '学习' },
  { word: '锲而不舍', pinyin: 'qiè ér bù shě', meaning: '像不停地雕刻一样坚持做下去，不因困难而放弃。', example: '模型接连倒塌，她依然锲而不舍，直到找到稳固的支撑方式。', theme: '坚持' },
  { word: '熟能生巧', pinyin: 'shú néng shēng qiǎo', meaning: '反复练习达到熟练以后，便能掌握灵巧的方法。', example: '刚学系鞋带时总会打结，熟能生巧，如今他很快就能系好。', theme: '学习' },
  { word: '精益求精', pinyin: 'jīng yì qiú jīng', meaning: '已经做得很好，仍继续改进，追求更高的质量。', example: '作品完成后，她仍精益求精，仔细调整每个不够准确的细节。', theme: '坚持', reference: { label: '教育部《成语典》· 精益求精', url: 'https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=-903&la=0&webMd=1' } },
  { word: '脚踏实地', pinyin: 'jiǎo tà shí dì', meaning: '做事踏实认真，从实际出发，不空想或浮夸。', example: '他不再只谈宏大的计划，而是脚踏实地，每天完成一次测量。', theme: '行动' },
  { word: '井底之蛙', pinyin: 'jǐng dǐ zhī wā', meaning: '比喻由于眼界受限而见识狭小的人。', example: '走出熟悉的小城后，他发现自己过去像井底之蛙，需要了解更广阔的世界。', theme: '智慧', reference: { label: '教育部《成语典》· 井底之蛙', url: 'https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=-381&la=0&webMd=1' } },
  { word: '井井有条', pinyin: 'jǐng jǐng yǒu tiáo', meaning: '安排或处理事情有清楚的条理和秩序。', example: '她把材料按用途分类，实验台整理得井井有条。', theme: '行动' },
  { word: '胸有成竹', pinyin: 'xiōng yǒu chéng zhú', meaning: '行动之前已经有了成熟的想法和把握。', example: '演示之前，他反复检查方案，开始操作时已胸有成竹。', theme: '智慧' },
  { word: '因地制宜', pinyin: 'yīn dì zhì yí', meaning: '根据各地不同的实际条件，采取适合当地的办法。', example: '山村和海边气候不同，种植计划应当因地制宜。', theme: '自然' },
  { word: '随机应变', pinyin: 'suí jī yìng biàn', meaning: '随着实际情况的变化，灵活调整应对的方法。', example: '户外观察遇到阵雨，小组随机应变，改在走廊记录雨量。', theme: '智慧' },
  { word: '恍然大悟', pinyin: 'huǎng rán dà wù', meaning: '原本不明白的事情，突然一下子理解了。', example: '看见两块齿轮相互咬合，他恍然大悟，明白了转动方向为什么相反。', theme: '学习' },
  { word: '恰如其分', pinyin: 'qià rú qí fèn', meaning: '说话或处理事情的分寸正好合适。', example: '这段评语既指出问题又肯定努力，对作品的评价恰如其分。', theme: '表达' },
  { word: '同心协力', pinyin: 'tóng xīn xié lì', meaning: '大家想法一致，共同付出力量完成事情。', example: '大家同心协力，把散落的实验材料一件件归位。', theme: '合作' },
  { word: '取长补短', pinyin: 'qǔ cháng bǔ duǎn', meaning: '学习别人的长处，弥补自己的不足。', example: '他擅长绘图，她善于计算，两个人在合作中取长补短。', theme: '合作' },
  { word: '一丝不苟', pinyin: 'yī sī bù gǒu', meaning: '对很细小的地方也不马虎，做事十分认真。', example: '记录实验数据时，她一丝不苟，连单位和小数位都仔细核对。', theme: '行动' },
  { word: '半途而废', pinyin: 'bàn tú ér fèi', meaning: '事情尚未完成，就在中途停止，不再继续。', example: '他提醒自己，模型还没完成，不能因为一次失败就半途而废。', theme: '坚持', reference: { label: '教育部《成语典》· 半途而废', url: 'https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=152&la=0&webMd=2' } },
  { word: '急于求成', pinyin: 'jí yú qiú chéng', meaning: '过于着急地想取得结果或成功，缺少耐心。', example: '种子刚埋下就每天挖出来看，这样急于求成反而会影响发芽。', theme: '行动' },
  { word: '纸上谈兵', pinyin: 'zhǐ shàng tán bīng', meaning: '比喻只在口头或文字上议论，缺乏实际行动或切实可行的办法。', example: '如果从不动手验证，再漂亮的实验方案也可能只是纸上谈兵。', theme: '行动', reference: { label: '教育部《成语典》· 纸上谈兵', url: 'https://dict.idioms.moe.edu.tw/idiomView.jsp?ID=-50&la=0&webMd=1' } },
];

const segments = (chars: string[], width: number) => Array.from(
  { length: Math.ceil(chars.length / width) }, (_, i) => chars.slice(i * width, (i + 1) * width).join(''),
);

export const CULTURE_BOOKS: Record<CultureId, CultureBook> = {
  poetry: {
    id: 'poetry', title: '诗词之间', eyebrow: '人文 / 诗与意象', accent: '#a0e7cc', noun: '首', cover: 'e5',
    source: '本地诗词库 · 20 首完整诗作，原文及赏析沿用项目已有整理。未逐首标注校勘底本；赏析是导读，不是逐字译注。',
    units: POEM_LIBRARY.map(p => ({
      id: p.id, title: p.title, subtitle: `${p.dynasty} · ${p.author}`, category: POEM_CATEGORIES[p.category],
      tags: [POEM_CATEGORIES[p.category], p.dynasty, p.author], lines: [...p.lines], meaning: p.meaning,
      author: p.author, dynasty: p.dynasty, lexicon: {},
    })),
  },
  sanzijing: {
    id: 'sanzijing', title: '三字经', eyebrow: '人文 / 习惯与成长', accent: '#8ddcec', noun: '段', cover: 'e20',
    source: '完整原文采用维基文库《新刊三字經》所录哈佛燕京图书馆藏本，版本 10344699，本地保存 89 行、1056 字。精选注释仍为已有开篇 6 段；原文和精选导读分开，不冒充全篇已有拼音、译注或练习。',
    original: originalData.sanzijing,
    context: '经典中的教育观念来自历史语境。可以联系今天的生活理解，也可以提出自己的疑问。',
    units: SAN_ZI_JING_FALLBACK_DATA.map(v => ({
      id: String(v.id), title: segments(v.content_chars, 3).join('，'), subtitle: `第 ${v.verse_index} 段 · ${v.chapter_name}`,
      category: v.tags[0] || '其他', tags: [...v.tags, ...v.key_vocabulary], lines: segments(v.content_chars, 3),
      chars: [...v.content_chars], pinyin: [...v.content_pinyin], meaning: v.translation_vernacular,
      interpretation: v.interpretation_deep, english: v.translation_english, lexicon: v.char_analysis,
      allusion: v.allusion_context ? { title: v.allusion_title, text: v.allusion_context, source: v.allusion_source } : undefined,
    })),
  },
  qianziwen: {
    id: 'qianziwen', title: '千字文', eyebrow: '人文 / 天地与文字', accent: '#b4e4cc', noun: '段', cover: 'e21',
    source: '完整原文来自维基文库《千字文》，版本 5752664，本地保存 125 行、1000 字及来源所列异文。精选注释仍为已有开篇 2 段和 3 则字解；未提供全篇拼音、译注或练习。',
    original: originalData.qianziwen,
    context: '“天地玄黄”等是古人的宇宙观和文学表达，不是现代宇宙起源的科学结论。',
    units: QIAN_ZI_WEN_LOCAL.map(v => ({
      id: String(v.id), title: segments(v.content_chars, 4).join('，'), subtitle: `第 ${v.verse_index} 段 · 开篇节选`,
      category: v.verse_index === 1 ? '天地宇宙' : '日月星辰', tags: [v.verse_index === 1 ? '天地宇宙' : '日月星辰'],
      lines: segments(v.content_chars, 4), chars: [...v.content_chars], pinyin: [...v.content_pinyin],
      meaning: v.translation, interpretation: v.interpretation, lexicon: v.char_analysis,
      allusion: v.allusion ? { title: v.allusion.title, text: v.allusion.content } : undefined,
    })),
  },
  idiom: {
    id: 'idiom', title: '成语实验室', eyebrow: '人文 / 词义与语境', accent: '#f4a69b', noun: '则', cover: 'u3',
    source: '本地精选成语 · 32 则拼音、编辑性释义和项目原创例句。保留原有 12 则，新增 20 则；已核对参考条目的附词义参考链接，其余不冒充已校勘。未逐则收录典籍出处，不将原创例句当作典故。',
    units: CULTURE_IDIOMS.map(v => ({
      id: v.word, title: v.word, subtitle: v.pinyin, category: v.theme, tags: [v.theme],
      lines: Array.from(v.word), chars: Array.from(v.word), pinyin: v.pinyin.split(' '),
      meaning: v.meaning, example: v.example, lexicon: {}, reference: 'reference' in v ? v.reference : undefined,
    })),
  },
};
