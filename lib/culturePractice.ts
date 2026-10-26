import type { CultureBook, CultureUnit } from './cultureContent';

export interface CultureQuestion {
  id: string;
  unitId: string;
  label: string;
  kind: 'order' | 'text' | 'choice';
  prompt: string;
  clue: string;
  answer: string;
  explanation: string;
  tokens?: string[];
  options?: string[];
}
export interface CultureAnswer { answer: string; order: number[] }

export function cultureHash(value: string): number {
  let seed = 2166136261;
  for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}
export function shuffledIndices(length: number, seed: string): number[] {
  let state = cultureHash(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  if (length > 1 && indices.every((value, i) => value === i)) indices.push(indices.shift()!);
  return indices;
}
export const normalizeCultureAnswer = (text: string) => text.normalize('NFKC').replace(/[\s，。！？、；：,.!?;:「」『』“”"'《》]/g, '');

function options(answer: string, candidates: string[], id: string): string[] {
  const others = [...new Set(candidates)].filter(v => v && v !== answer);
  const chosen = shuffledIndices(others.length, id).slice(0, 3).map(i => others[i]);
  const all = [answer, ...chosen];
  return shuffledIndices(all.length, `${id}-choices`).map(i => all[i]);
}

export function questionsForUnit(book: CultureBook, unit: CultureUnit): CultureQuestion[] {
  const key = `${book.id}:${unit.id}`;
  const explanation = `原文：${book.id === 'idiom' ? unit.title : unit.lines.join('，')}。\n${unit.meaning}`;
  const questions: CultureQuestion[] = [];
  if (unit.lines.length > 1) questions.push({
    id: `${key}:order`, unitId: unit.id, label: book.id === 'idiom' ? '组字成语' : '原文排序', kind: 'order',
    prompt: book.id === 'poetry' ? '把诗句放回原来的顺序' : book.id === 'idiom' ? '根据含义，重组成语' : '把短句按原文顺序连接',
    clue: book.id === 'idiom' ? unit.meaning : book.id === 'poetry' ? `《${unit.title}》 · ${unit.subtitle}` : unit.meaning,
    tokens: [...unit.lines], answer: unit.lines.join('，'), explanation,
  });
  if (book.id === 'poetry') {
    const index = cultureHash(key) % unit.lines.length;
    questions.push({ id: `${key}:recall`, unitId: unit.id, label: '诗句补全', kind: 'text',
      prompt: '补出空缺的一整句', clue: unit.lines.map((line, i) => i === index ? '________' : line).join('，'),
      answer: unit.lines[index], explanation });
  } else if (book.id === 'idiom') {
    questions.push({ id: `${key}:recall`, unitId: unit.id, label: '释义回想', kind: 'text',
      prompt: '根据含义写出四字成语', clue: unit.meaning, answer: unit.title, explanation });
  } else if (unit.chars?.length) {
    const index = cultureHash(key) % unit.chars.length;
    questions.push({ id: `${key}:recall`, unitId: unit.id, label: '缺字补全', kind: 'text',
      prompt: '补出原文中空缺的字', clue: unit.chars.map((char, i) => i === index ? '□' : char).join(''),
      answer: unit.chars[index], explanation });
  }
  const meanings = options(unit.meaning, book.units.map(u => u.meaning), key);
  if (meanings.length > 1) questions.push({
    id: `${key}:meaning`, unitId: unit.id, label: '理解辨析', kind: 'choice',
    prompt: '选择与这段文字对应的解读', clue: book.id === 'idiom' ? unit.title : unit.lines.join('，'),
    answer: unit.meaning, options: meanings, explanation,
  });
  if (unit.author) {
    const authors = options(unit.author, book.units.map(u => u.author || ''), `${key}-author`);
    if (authors.length > 1) questions.push({ id: `${key}:author`, unitId: unit.id, label: '作者识记', kind: 'choice',
      prompt: '这首诗的作者是谁？', clue: `《${unit.title}》\n${unit.lines.join('，')}`, answer: unit.author, options: authors,
      explanation: `《${unit.title}》 · ${unit.dynasty} · ${unit.author}。\n${unit.meaning}` });
  } else if (unit.example) {
    questions.push({ id: `${key}:context`, unitId: unit.id, label: '语境运用', kind: 'choice',
      prompt: '还原本条原例句中使用的成语', clue: unit.example.replace(unit.title, '________'),
      answer: unit.title, options: options(unit.title, book.units.map(u => u.title), `${key}-context`),
      explanation: `本条例句的原用词：${unit.title}。这里核对原例句，不排斥其他语境中成立的近义表达。\n例句：${unit.example}\n${unit.meaning}` });
  } else if (unit.pinyin?.length && unit.chars?.length) {
    const index = cultureHash(`${key}-pinyin`) % Math.min(unit.chars.length, unit.pinyin.length);
    const pronunciations = options(unit.pinyin[index], unit.pinyin, `${key}-pinyin`);
    if (pronunciations.length > 1) questions.push({ id: `${key}:pinyin`, unitId: unit.id, label: '句中读音', kind: 'choice',
      prompt: `「${unit.chars[index]}」在这句中的读音是？`, clue: unit.lines.join('，'),
      answer: unit.pinyin[index], options: pronunciations,
      explanation: `本句注音：${unit.chars.map((char, i) => `${char} ${unit.pinyin?.[i] || ''}`).join(' · ')}` });
  }
  return questions;
}

export function checkCultureAnswer(question: CultureQuestion, draft: CultureAnswer): boolean {
  if (question.kind === 'order') {
    const tokens = question.tokens || [];
    // Indices preserve multiplicity, even when two lines have identical text.
    return draft.order.length === tokens.length && new Set(draft.order).size === tokens.length
      && draft.order.every((index, i) => Number.isInteger(index) && index >= 0 && index < tokens.length && tokens[index] === tokens[i]);
  }
  return question.kind === 'choice' ? draft.answer === question.answer
    : normalizeCultureAnswer(draft.answer) === normalizeCultureAnswer(question.answer);
}

export function allCultureQuestions(book: CultureBook): CultureQuestion[] {
  return book.units.flatMap(unit => questionsForUnit(book, unit));
}
