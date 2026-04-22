
import { CharAnalysis } from './sanzijingData';

export interface QianZiWenVerse {
  id: number;
  verse_index: number;
  content_raw: string;
  content_chars: string[];
  content_pinyin: string[];
  translation: string;
  interpretation: string;
  allusion?: {
    title: string;
    content: string;
  };
  char_analysis: Record<string, CharAnalysis>;
}

export const QIAN_ZI_WEN_LOCAL: QianZiWenVerse[] = [
  {
    id: 1,
    verse_index: 1,
    content_raw: "天地玄黄宇宙洪荒",
    content_chars: ["天", "地", "玄", "黄", "宇", "宙", "洪", "荒"],
    content_pinyin: ["tiān", "dì", "xuán", "huáng", "yǔ", "zhòu", "hóng", "huāng"],
    translation: "天是青黑色的，地是发黄的；宇宙是在鸿蒙混沌的状态下产生的。",
    interpretation: "这是《千字文》的开篇，描述了宇宙生成的宏大景象，体现了古人对自然和时空的朴素认知。",
    char_analysis: {
      "天": { char: "天", pinyin: "tiān", radical: "大", strokes: 4, formation: "指事", original_meaning: "人的头顶", evolution_story: "古人认为头顶之上即为天。" },
      "地": { char: "地", pinyin: "dì", radical: "土", strokes: 6, formation: "形声", original_meaning: "大地", evolution_story: "从土，也声，指万物生长的土地。" }
    }
  },
  {
    id: 2,
    verse_index: 2,
    content_raw: "日月盈昃辰宿列张",
    content_chars: ["日", "月", "盈", "昃", "辰", "宿", "列", "张"],
    content_pinyin: ["rì", "yuè", "yíng", "zè", "chén", "xiù", "liè", "zhāng"],
    translation: "太阳升起又落山，月亮圆了又缺；星辰分布在无边的太空中。",
    interpretation: "描述了天文运行的规律，强调自然界的循环往复与宏大秩序。",
    char_analysis: {
      "盈": { char: "盈", pinyin: "yíng", radical: "皿", strokes: 9, formation: "会意", original_meaning: "满", evolution_story: "容器里装满了水。" }
    }
  }
];
