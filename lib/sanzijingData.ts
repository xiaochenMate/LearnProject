
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

// 此文件现在仅保留接口定义，数据将全量从数据库读取
export const SAN_ZI_JING_FALLBACK_DATA: Partial<SanZiJingVerse>[] = [];
