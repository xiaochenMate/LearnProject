import type { CultureBook, CultureUnit } from './cultureContent';
import { allCultureQuestions, checkCultureAnswer, questionsForUnit, type CultureQuestion } from './culturePractice';

export type CultureView = 'read' | 'practice' | 'review';
export type CultureShelf = 'all' | 'saved' | 'unread' | 'learned';
export interface CultureDraft {
  questionId: string;
  answer: string;
  order: number[];
  result: '' | 'correct' | 'wrong' | 'revealed' | 'assisted';
  hinted: boolean;
}
export interface CultureReview {
  dueAt: number;
  streak: number;
  lapses: number;
  lastAt: number;
  wrong: boolean;
}
export interface CultureProgress {
  version: 3;
  selectedId: string;
  view: CultureView;
  query: string;
  category: string;
  dynasty: string;
  shelf: CultureShelf;
  saved: string[];
  read: string[];
  credits: string[];
  review: Record<string, CultureReview>;
  notes: Record<string, string>;
  draft: CultureDraft;
  draftView: 'practice' | 'review';
  showPinyin: boolean;
  speechRate: number;
  legacyScore: number;
  legacyReflections: string[];
  readingScope: 'annotated' | 'original';
  original: {
    page: number; query: string; shelf: 'all' | 'saved' | 'unread'; script: 'original' | 'simplified';
    read: string[]; saved: string[];
  };
}
type Reader = Pick<Storage, 'getItem'>;
export const cultureStorageKey = (book: CultureBook) => `exbeam.culture.${book.id}.v3`;
export const emptyCultureDraft = (questionId = ''): CultureDraft => ({ questionId, answer: '', order: [], result: '', hinted: false });
export const emptyCultureProgress = (book: CultureBook): CultureProgress => ({
  version: 3, selectedId: book.units[0]?.id || '', view: 'read', query: '', category: '全部', dynasty: '全部', shelf: 'all',
  saved: [], read: [], credits: [], review: {}, notes: {}, draft: emptyCultureDraft(), draftView: 'practice',
  showPinyin: true, speechRate: 0.8, legacyScore: 0, legacyReflections: [],
  readingScope: 'annotated', original: { page: 0, query: '', shelf: 'all', script: 'original', read: [], saved: [] },
});
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const strings = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((v): v is string => typeof v === 'string'))] : [];
const natural = (value: unknown, max = 1000000) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.floor(value))) : 0;

export function normalizeCultureProgress(value: unknown, book: CultureBook): CultureProgress {
  const base = emptyCultureProgress(book);
  if (!record(value) || value.version !== 3) return base;
  const ids = new Set(book.units.map(u => u.id));
  const questions = new Map(allCultureQuestions(book).map(q => [q.id, q]));
  const review: CultureProgress['review'] = {};
  if (record(value.review)) for (const [id, item] of Object.entries(value.review)) {
    if (!questions.has(id) || !record(item) || typeof item.dueAt !== 'number' || !Number.isFinite(item.dueAt) || item.dueAt < 0) continue;
    review[id] = { dueAt: item.dueAt, streak: natural(item.streak, 4), lapses: natural(item.lapses), lastAt: natural(item.lastAt, Number.MAX_SAFE_INTEGER), wrong: item.wrong === true };
  }
  const notes: CultureProgress['notes'] = {};
  if (record(value.notes)) for (const [id, text] of Object.entries(value.notes)) if (ids.has(id) && typeof text === 'string') notes[id] = text.slice(0, 2000);
  const draft = emptyCultureDraft();
  const original = { ...base.original };
  if (record(value.original) && book.original) {
    const originalIds = new Set(book.original.paragraphs.map(p => p.id));
    original.page = natural(value.original.page, Math.ceil(book.original.paragraphs.length / 10) - 1);
    original.query = typeof value.original.query === 'string' ? value.original.query.slice(0, 200) : '';
    original.shelf = value.original.shelf === 'saved' || value.original.shelf === 'unread' ? value.original.shelf : 'all';
    original.script = value.original.script === 'simplified' ? 'simplified' : 'original';
    original.read = strings(value.original.read).filter(id => originalIds.has(id));
    original.saved = strings(value.original.saved).filter(id => originalIds.has(id));
  }
  if (record(value.draft) && typeof value.draft.questionId === 'string' && questions.has(value.draft.questionId)) {
    const question = questions.get(value.draft.questionId)!;
    draft.questionId = question.id;
    draft.answer = typeof value.draft.answer === 'string' ? value.draft.answer.slice(0, 500) : '';
    draft.order = [...new Set(Array.isArray(value.draft.order) ? value.draft.order.filter((i): i is number => Number.isInteger(i) && Number(i) >= 0 && Number(i) < (question.tokens?.length || 0)) : [])];
    draft.hinted = value.draft.hinted === true;
    if (['correct', 'wrong', 'revealed', 'assisted'].includes(String(value.draft.result))) draft.result = value.draft.result as CultureDraft['result'];
  }
  return {
    ...base, selectedId: typeof value.selectedId === 'string' && ids.has(value.selectedId) ? value.selectedId : base.selectedId,
    view: ['read', 'practice', 'review'].includes(String(value.view)) ? value.view as CultureView : base.view,
    query: typeof value.query === 'string' ? value.query.slice(0, 200) : '',
    category: typeof value.category === 'string' && book.units.some(u => u.category === value.category) ? value.category : '全部',
    dynasty: typeof value.dynasty === 'string' && book.units.some(u => u.dynasty === value.dynasty) ? value.dynasty : '全部',
    shelf: ['all', 'saved', 'unread', 'learned'].includes(String(value.shelf)) ? value.shelf as CultureShelf : 'all',
    saved: strings(value.saved).filter(id => ids.has(id)), read: strings(value.read).filter(id => ids.has(id)),
    credits: strings(value.credits).filter(id => questions.has(id)), review, notes, draft,
    draftView: value.draftView === 'review' ? 'review' : 'practice',
    showPinyin: value.showPinyin !== false,
    speechRate: typeof value.speechRate === 'number' && [0.65, 0.8, 1].includes(value.speechRate) ? value.speechRate : 0.8,
    legacyScore: natural(value.legacyScore), legacyReflections: strings(value.legacyReflections).slice(0, 5000),
    readingScope: book.original && value.readingScope === 'original' ? 'original' : 'annotated', original,
  };
}

export function validCultureProgress(value: unknown, book: CultureBook): boolean {
  return record(value) && JSON.stringify(value) === JSON.stringify(normalizeCultureProgress(value, book));
}

export function loadCultureProgress(book: CultureBook, storage?: Reader | null): CultureProgress {
  let state = emptyCultureProgress(book);
  if (!storage) return state;
  try {
    const raw = storage.getItem(cultureStorageKey(book));
    if (raw) state = normalizeCultureProgress(JSON.parse(raw), book);
  } catch { /* A damaged new record must not prevent reading the retained legacy keys. */ }
  if (book.id === 'poetry') {
    try { state.legacyScore = Math.max(state.legacyScore, natural(Number(storage.getItem('poem_score')))); } catch { /* Storage can be disabled. */ }
  }
  if (book.id === 'sanzijing') {
    try {
      const old = strings(JSON.parse(storage.getItem('exbeam.classics.reflections.v2') || '[]'));
      state.legacyReflections = [...new Set([...state.legacyReflections, ...old])];
      state.read = [...new Set([...state.read, ...old.filter(id => book.units.some(unit => unit.id === id))])];
    } catch { /* Never overwrite or delete the old self-assessment record. */ }
  }
  return state;
}

const foldSearch = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ü/g, 'u').toLowerCase();
export function filterCultureUnits(book: CultureBook, state: CultureProgress): CultureUnit[] {
  const query = foldSearch(state.query.trim());
  return book.units.filter(unit => {
    if (state.category !== '全部' && unit.category !== state.category) return false;
    if (state.dynasty !== '全部' && unit.dynasty !== state.dynasty) return false;
    if (state.shelf === 'saved' && !state.saved.includes(unit.id)) return false;
    if (state.shelf === 'unread' && state.read.includes(unit.id)) return false;
    if (state.shelf === 'learned' && !cultureUnitLearned(book, unit, state)) return false;
    const haystack = [unit.title, unit.subtitle, ...unit.lines, unit.meaning, unit.interpretation || '', ...unit.tags,
      ...(unit.pinyin || []), unit.allusion?.text || '', unit.example || ''].join(' ');
    const initials = unit.pinyin?.map(part => foldSearch(part)[0]).join('') || '';
    return !query || foldSearch(haystack).includes(query) || initials.includes(query);
  });
}

export function cultureUnitLearned(book: CultureBook, unit: CultureUnit, state: CultureProgress): boolean {
  const questions = questionsForUnit(book, unit);
  return questions.length > 0 && questions.every(q => state.credits.includes(q.id));
}
export const dueCultureQuestions = (book: CultureBook, state: CultureProgress, now: number) => allCultureQuestions(book)
  .filter(q => state.review[q.id] && state.review[q.id].dueAt <= now)
  .sort((a, b) => state.review[a.id].dueAt - state.review[b.id].dueAt || a.id.localeCompare(b.id));

export function submitCultureQuestion(state: CultureProgress, question: CultureQuestion, now: number, reveal = false): { state: CultureProgress; newCredit: boolean; correct: boolean } {
  if (state.draft.questionId !== question.id || state.draft.result || !Number.isFinite(now)) return { state, newCredit: false, correct: false };
  const correct = !reveal && checkCultureAnswer(question, state.draft);
  const clean = correct && !state.draft.hinted;
  const previous = state.review[question.id];
  const newCredit = clean && !state.credits.includes(question.id);
  let nextReview = previous;
  if (!clean) {
    nextReview = { dueAt: now, streak: 0, lapses: (previous?.lapses || 0) + 1, lastAt: now, wrong: true };
  } else if (!previous || previous.dueAt <= now) {
    const streak = Math.min(4, (previous?.streak || 0) + 1);
    nextReview = { dueAt: now + [1, 3, 7, 14][streak - 1] * 86400000, streak, lapses: previous?.lapses || 0, lastAt: now, wrong: false };
  }
  return {
    newCredit, correct,
    state: {
      ...state, credits: newCredit ? [...state.credits, question.id] : state.credits,
      read: clean && !state.read.includes(question.unitId) ? [...state.read, question.unitId] : state.read,
      review: nextReview ? { ...state.review, [question.id]: nextReview } : state.review,
      draft: { ...state.draft, result: reveal ? 'revealed' : correct ? clean ? 'correct' : 'assisted' : 'wrong' },
    },
  };
}
