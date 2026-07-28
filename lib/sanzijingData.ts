
export interface CharAnalysis {
  char: string;
  pinyin: string;
  radical: string;
  strokes: number;
  formation: string; // 象形、会意等
  evolution_story: string; // 字理演变
  original_meaning: string; // 本义
}

export interface SanZiJingVerse {
  id: number;
  verse_index: number;
  chapter_name: string;
  content_raw: string;
  content_chars: string[];
  content_pinyin: string[];
  
  // 解读
  translation_vernacular: string;
  translation_english: string;
  interpretation_deep: string;
  
  // 考据
  allusion_title: string;
  allusion_context: string;
  allusion_source: string;
  
  // 文字学 (JSONB)
  char_analysis: Record<string, CharAnalysis>;
  
  // 教学辅助
  difficulty_level: number;
  key_vocabulary: string[];
  audio_url: string;
  tags: string[];
}

export const SAN_ZI_JING_FALLBACK_DATA: SanZiJingVerse[] = [
  {
    id: 1,
    verse_index: 1,
    chapter_name: '教化之始',
    content_raw: '人之初性本善',
    content_chars: ['人', '之', '初', '性', '本', '善'],
    content_pinyin: ['rén', 'zhī', 'chū', 'xìng', 'běn', 'shàn'],
    translation_vernacular: '人在生命之初，本性原本是善良的。',
    translation_english: 'At birth, people are naturally good.',
    interpretation_deep: '开篇先提出教育的基础：相信人具有向善的可能。学习不是被动灌输，而是帮助这种可能逐渐显现。',
    allusion_title: '性善说',
    allusion_context: '孟子认为人皆有恻隐、羞恶、辞让和是非之心，这些善端需要在生活中不断扩充。',
    allusion_source: '《孟子》',
    char_analysis: {
      人: { char: '人', pinyin: 'rén', radical: '人', strokes: 2, formation: '象形', evolution_story: '字形像侧身站立的人。', original_meaning: '人类' },
      善: { char: '善', pinyin: 'shàn', radical: '口', strokes: 12, formation: '会意', evolution_story: '古文字由表示祥和与言语的部件组合而成。', original_meaning: '美好、友善' },
    },
    difficulty_level: 1,
    key_vocabulary: ['本性', '向善'],
    audio_url: '',
    tags: ['启蒙', '品格'],
  },
  {
    id: 2,
    verse_index: 2,
    chapter_name: '环境与习惯',
    content_raw: '性相近习相远',
    content_chars: ['性', '相', '近', '习', '相', '远'],
    content_pinyin: ['xìng', 'xiāng', 'jìn', 'xí', 'xiāng', 'yuǎn'],
    translation_vernacular: '人的天性彼此接近，后来因为习惯不同而逐渐产生差异。',
    translation_english: 'People are alike by nature but grow apart through habits.',
    interpretation_deep: '这一句把成长的重点放在长期习惯上。微小但持续的选择，会比一次性的努力更深地塑造一个人。',
    allusion_title: '习惯的力量',
    allusion_context: '孔子说“性相近也，习相远也”，强调环境、教育和日常实践对人的影响。',
    allusion_source: '《论语·阳货》',
    char_analysis: {},
    difficulty_level: 1,
    key_vocabulary: ['习惯', '环境'],
    audio_url: '',
    tags: ['习惯', '成长'],
  },
  {
    id: 3,
    verse_index: 3,
    chapter_name: '教育之道',
    content_raw: '苟不教性乃迁',
    content_chars: ['苟', '不', '教', '性', '乃', '迁'],
    content_pinyin: ['gǒu', 'bù', 'jiào', 'xìng', 'nǎi', 'qiān'],
    translation_vernacular: '如果不接受良好的教育，人的习性就可能发生变化。',
    translation_english: 'Without guidance, a person’s character may change.',
    interpretation_deep: '教育不仅是知识传递，也包含边界、示范与反馈。一个稳定的成长环境能让好习惯更容易发生。',
    allusion_title: '',
    allusion_context: '',
    allusion_source: '',
    char_analysis: {},
    difficulty_level: 1,
    key_vocabulary: ['教育', '迁移'],
    audio_url: '',
    tags: ['教育', '成长'],
  },
  {
    id: 4,
    verse_index: 4,
    chapter_name: '专注方法',
    content_raw: '教之道贵以专',
    content_chars: ['教', '之', '道', '贵', '以', '专'],
    content_pinyin: ['jiào', 'zhī', 'dào', 'guì', 'yǐ', 'zhuān'],
    translation_vernacular: '教育最重要的方法，在于专心并持之以恒。',
    translation_english: 'The key to learning is focus and consistency.',
    interpretation_deep: '这里的“专”不是只学一种内容，而是在一个时段内把注意力交给一件事。短时间的完整专注，比漫长的分心更有效。',
    allusion_title: '',
    allusion_context: '',
    allusion_source: '',
    char_analysis: {},
    difficulty_level: 1,
    key_vocabulary: ['专注', '坚持'],
    audio_url: '',
    tags: ['方法', '专注'],
  },
  {
    id: 5,
    verse_index: 5,
    chapter_name: '家庭教育',
    content_raw: '昔孟母择邻处',
    content_chars: ['昔', '孟', '母', '择', '邻', '处'],
    content_pinyin: ['xī', 'mèng', 'mǔ', 'zé', 'lín', 'chǔ'],
    translation_vernacular: '从前孟子的母亲为了孩子成长，认真选择居住环境。',
    translation_english: 'Mencius’ mother carefully chose a good environment for him.',
    interpretation_deep: '“孟母三迁”提醒我们，环境会默默设定行为的默认选项。把书放在手边、减少干扰，也是在为学习选择好邻居。',
    allusion_title: '孟母三迁',
    allusion_context: '孟母先后搬离墓地和集市附近，最后定居在学宫旁，希望孟子受到良好环境的影响。',
    allusion_source: '《列女传》',
    char_analysis: {},
    difficulty_level: 2,
    key_vocabulary: ['环境', '选择'],
    audio_url: '',
    tags: ['典故', '家庭'],
  },
  {
    id: 6,
    verse_index: 6,
    chapter_name: '坚持原则',
    content_raw: '子不学断机杼',
    content_chars: ['子', '不', '学', '断', '机', '杼'],
    content_pinyin: ['zǐ', 'bù', 'xué', 'duàn', 'jī', 'zhù'],
    translation_vernacular: '孟子一度荒废学习，母亲剪断织布来说明半途而废的后果。',
    translation_english: 'His mother cut the weaving to show the cost of giving up halfway.',
    interpretation_deep: '织布一旦中断，前面的工夫就难以完成。学习同样需要连续性，但连续并不等于苛求自己，每天完成一个小单位就有价值。',
    allusion_title: '断机教子',
    allusion_context: '孟母用剪断尚未织完的布作比喻，告诉孟子学习半途而废就像毁掉已经付出的劳动。',
    allusion_source: '《列女传》',
    char_analysis: {},
    difficulty_level: 2,
    key_vocabulary: ['坚持', '半途而废'],
    audio_url: '',
    tags: ['典故', '坚持'],
  },
];
