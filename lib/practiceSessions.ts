import { PRACTICE_CHARACTERS, PRACTICE_HISTORY, PRACTICE_PUZZLES, PRACTICE_WORDS } from './practiceData';
import { initialWordProgress, integer, legacyValue, record, shuffle, shuffledOrder, strings, unique, validWordProgress, type WordProgress } from './practiceCore';

const characters = new Set(PRACTICE_CHARACTERS.map(c => c.result));
const history = new Set(PRACTICE_HISTORY.map(e => e.id));
const puzzles = new Set(PRACTICE_PUZZLES.map(p => p.id));
const wordIds = new Set(PRACTICE_WORDS.map(w => w.id));
const knownStrings = (v: unknown, known: Set<string>) => strings(v) && v.every(id => known.has(id)) && unique(v).length === v.length;

export interface CharacterSession {
  target: string; options: string[]; selection: string; solved: boolean; attempted: boolean; hinted: boolean;
  learned: string[]; wrong: string[]; legacyLearned: number;
}
export function characterQuestion(target: string) {
  const item = PRACTICE_CHARACTERS.find(c => c.result === target) || PRACTICE_CHARACTERS[0];
  return { target: item.result, selection: '', solved: false, attempted: false, hinted: false, options: shuffle([item.candidate, ...shuffle(unique(PRACTICE_CHARACTERS.map(c => c.candidate)).filter(c => c !== item.candidate)).slice(0, 8)]) };
}
export function initialCharacter(): CharacterSession {
  const legacy = legacyValue('char_learned');
  return { ...characterQuestion('江'), learned: [], wrong: [], legacyLearned: integer(legacy, 0, 1000000) ? legacy : 0 };
}
export function validCharacter(v: unknown): v is CharacterSession {
  return record(v) && characters.has(v.target) && strings(v.options) && v.options.length === 9 && unique(v.options).length === 9 && v.options.includes(PRACTICE_CHARACTERS.find(c => c.result === v.target)?.candidate || '') && typeof v.selection === 'string' && typeof v.solved === 'boolean' && typeof v.attempted === 'boolean' && typeof v.hinted === 'boolean' && knownStrings(v.learned, characters) && knownStrings(v.wrong, characters) && integer(v.legacyLearned);
}
export function answerCharacter(state: CharacterSession, candidate: string): CharacterSession {
  if (state.solved || !state.options.includes(candidate)) return state;
  const correct = PRACTICE_CHARACTERS.find(c => c.result === state.target)?.candidate === candidate;
  return { ...state, selection: candidate, attempted: true, solved: correct, learned: correct ? unique([...state.learned, state.target]) : state.learned, wrong: correct ? state.wrong.filter(id => id !== state.target) : unique([...state.wrong, state.target]) };
}

export type Era = 'Ancient' | 'Imperial' | 'Modern' | 'mixed';
export interface HistorySession {
  era: Era; count: number; order: string[]; result: 'pending' | 'wrong' | 'correct'; attempts: number; completed: string[]; learned: string[]; wrong: string[];
}
export function historyQuestion(era: Era, count: number, preferred: string[] = []): string[] {
  let pool = PRACTICE_HISTORY.filter(e => era === 'mixed' || e.period === era);
  if (preferred.length) pool = [...pool.filter(e => preferred.includes(e.id)), ...shuffle(pool.filter(e => !preferred.includes(e.id)))].slice(0, Math.max(count, preferred.length));
  return shuffledOrder(pool, count).map(e => e.id);
}
export const initialHistory = (): HistorySession => ({ era: 'Ancient', count: 4, order: historyQuestion('Ancient', 4), result: 'pending', attempts: 0, completed: [], learned: [], wrong: [] });
export function validHistory(v: unknown): v is HistorySession {
  return record(v) && ['Ancient', 'Imperial', 'Modern', 'mixed'].includes(v.era) && [3, 4, 6].includes(v.count) && knownStrings(v.order, history) && v.order.length >= 3 && v.order.length <= 6 && ['pending', 'wrong', 'correct'].includes(v.result) && integer(v.attempts) && strings(v.completed) && knownStrings(v.learned, history) && knownStrings(v.wrong, history);
}
export function checkHistory(state: HistorySession): HistorySession {
  if (state.result === 'correct') return state;
  const expected = [...state.order].sort((a, b) => PRACTICE_HISTORY.find(e => e.id === a)!.year - PRACTICE_HISTORY.find(e => e.id === b)!.year);
  const wrong = state.order.filter((id, i) => id !== expected[i]);
  const key = expected.join('|');
  return { ...state, result: wrong.length ? 'wrong' : 'correct', attempts: state.attempts + 1, completed: wrong.length ? state.completed : unique([...state.completed, key]), learned: wrong.length ? state.learned : unique([...state.learned, ...expected]), wrong: wrong.length ? unique([...state.wrong, ...wrong]) : state.wrong.filter(id => !state.order.includes(id)) };
}

export interface ClockSession {
  mode: 'explore' | 'set' | 'read'; format: '12' | '24'; step: 30 | 5 | 1; total: number; target: number;
  hour: string; minute: string; pm: boolean; feedback: 'pending' | 'correct' | 'wrong'; showDigital: boolean; solved: string[]; wrong: number[];
}
export const initialClock = (): ClockSession => ({ mode: 'explore', format: '24', step: 5, total: 610, target: 485, hour: '10', minute: '10', pm: false, feedback: 'pending', showDigital: true, solved: [], wrong: [] });
export function validClock(v: unknown): v is ClockSession {
  return record(v) && ['explore', 'set', 'read'].includes(v.mode) && ['12', '24'].includes(v.format) && [30, 5, 1].includes(v.step) && integer(v.total, 0, 1439) && integer(v.target, 0, 1439) && typeof v.hour === 'string' && /^\d{0,2}$/.test(v.hour) && typeof v.minute === 'string' && /^\d{0,2}$/.test(v.minute) && typeof v.pm === 'boolean' && ['pending', 'correct', 'wrong'].includes(v.feedback) && typeof v.showDigital === 'boolean' && strings(v.solved) && v.solved.every(key => /^(set|read)-\d{1,4}$/.test(key)) && Array.isArray(v.wrong) && v.wrong.every((t: unknown) => integer(t, 0, 1439));
}
export function parsedClockInput(state: ClockSession): number | null {
  if (!/^\d{1,2}$/.test(state.hour) || !/^\d{1,2}$/.test(state.minute)) return null;
  let h = Number(state.hour); const m = Number(state.minute);
  if (m > 59 || h > (state.format === '24' ? 23 : 12) || (state.format === '12' && h < 1)) return null;
  if (state.format === '12') h = h % 12 + (state.pm ? 12 : 0);
  return h * 60 + m;
}
export function checkClock(state: ClockSession, answer: number): ClockSession {
  if (state.mode === 'explore' || state.feedback === 'correct') return state;
  const correct = answer === state.target;
  return { ...state, feedback: correct ? 'correct' : 'wrong', solved: correct ? unique([...state.solved, `${state.mode}-${state.target}`]) : state.solved, wrong: correct ? state.wrong.filter(t => t !== state.target) : unique([...state.wrong, state.target]) };
}

export interface PuzzleSession {
  current: string; options: string[]; selected: string; hints: number; submitted: boolean;
  category: string; difficulty: string; saved: string[]; solved: string[]; wrong: string[]; drafts: Record<string, { selected: string; hints: number; submitted: boolean }>;
}
export const initialPuzzle = (): PuzzleSession => ({ current: 'BT_001', options: shuffle(PRACTICE_PUZZLES[0].options), selected: '', hints: 0, submitted: false, category: 'all', difficulty: 'all', saved: [], solved: [], wrong: [], drafts: {} });
export function validPuzzle(v: unknown): v is PuzzleSession {
  return record(v) && puzzles.has(v.current) && strings(v.options) && v.options.length === 4 && unique(v.options).length === 4 && v.options.every(o => PRACTICE_PUZZLES.find(p => p.id === v.current)!.options.includes(o)) && typeof v.selected === 'string' && (!v.selected || v.options.includes(v.selected)) && integer(v.hints, 0, 2) && typeof v.submitted === 'boolean' && ['all', 'LOGIC', 'WORDPLAY', 'HUMOR', 'PARADOX'].includes(v.category) && ['all', 'EASY', 'MEDIUM', 'HARD'].includes(v.difficulty) && knownStrings(v.saved, puzzles) && knownStrings(v.solved, puzzles) && knownStrings(v.wrong, puzzles) && record(v.drafts) && Object.entries(v.drafts).every(([id, d]) => puzzles.has(id) && record(d) && typeof d.selected === 'string' && (!d.selected || PRACTICE_PUZZLES.find(p => p.id === id)!.options.includes(d.selected)) && integer(d.hints, 0, 2) && typeof d.submitted === 'boolean');
}
export function openPuzzle(state: PuzzleSession, id: string): PuzzleSession {
  const item = PRACTICE_PUZZLES.find(p => p.id === id); if (!item) return state;
  const drafts = { ...state.drafts, [state.current]: { selected: state.selected, hints: state.hints, submitted: state.submitted } };
  const draft = drafts[id] || { selected: '', hints: 0, submitted: false };
  return { ...state, current: id, options: shuffle(item.options), drafts, ...draft };
}
export function checkPuzzle(state: PuzzleSession): PuzzleSession {
  if (state.submitted || !state.selected) return state;
  const correct = PRACTICE_PUZZLES.find(p => p.id === state.current)!.answer === state.selected;
  return { ...state, submitted: true, solved: correct ? unique([...state.solved, state.current]) : state.solved, wrong: correct ? state.wrong.filter(id => id !== state.current) : unique([...state.wrong, state.current]) };
}

export interface VocabularySession {
  category: 'primary' | 'cosmos' | 'ielts'; current: number; revealed: boolean;
  progress: Record<string, WordProgress>; test: { id: string; ids: number[]; index: number; answers: Record<string, string>; input: string; submitted: boolean; kind: 'meaning' | 'spelling' } | null;
}
export const initialVocabulary = (): VocabularySession => ({ category: 'primary', current: 101, revealed: false, progress: initialWordProgress(legacyValue('exbeam.vocabulary.review.v2')), test: null });
export function validVocabulary(v: unknown): v is VocabularySession {
  return record(v) && ['primary', 'cosmos', 'ielts'].includes(v.category) && wordIds.has(v.current) && typeof v.revealed === 'boolean' && record(v.progress) && Object.values(v.progress).every(validWordProgress) && (v.test === null || (record(v.test) && typeof v.test.id === 'string' && Array.isArray(v.test.ids) && v.test.ids.length > 0 && v.test.ids.length <= PRACTICE_WORDS.length && v.test.ids.every((id: unknown) => typeof id === 'number' && wordIds.has(id)) && unique(v.test.ids).length === v.test.ids.length && integer(v.test.index, 0, v.test.ids.length) && record(v.test.answers) && Object.values(v.test.answers).every(a => typeof a === 'string') && typeof v.test.input === 'string' && v.test.input.length <= 80 && typeof v.test.submitted === 'boolean' && ['meaning', 'spelling'].includes(v.test.kind)));
}
