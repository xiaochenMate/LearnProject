export const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
export const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10000 && v.every(x => typeof x === 'string');
export const unique = <T,>(items: T[]): T[] => [...new Set(items)];
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.min(i, Math.floor(random() * (i + 1))); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function seededRandom(seed: string) {
  let value = 2166136261;
  for (const char of seed) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
  return () => { value = Math.imul(1664525, value) + 1013904223 | 0; return (value >>> 0) / 4294967296; };
}
export function shuffledOrder<T extends { id: string; year: number }>(items: T[], count: number, random = Math.random): T[] {
  const chosen = shuffle(items, random).slice(0, count);
  if (chosen.length > 1 && chosen.every((x, i) => !i || chosen[i - 1].year <= x.year)) [chosen[0], chosen[1]] = [chosen[1], chosen[0]];
  return chosen;
}
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (!integer(from, 0, items.length - 1) || !integer(to, 0, items.length - 1)) return items;
  const result = [...items]; const [item] = result.splice(from, 1); result.splice(to, 0, item); return result;
}
export const yearLabel = (year: number, approximate = false) => `${approximate ? '约' : ''}${year < 0 ? '公元前' : '公元'}${Math.abs(year)}年`;
export const normalizeMinutes = (value: number) => ((Math.round(value) % 1440) + 1440) % 1440;
export function timeLabel(value: number, format: '12' | '24' = '24') {
  const total = normalizeMinutes(value), h = Math.floor(total / 60), m = String(total % 60).padStart(2, '0');
  return format === '24' ? `${String(h).padStart(2, '0')}:${m}` : `${h < 12 ? '上午' : '下午'} ${String(h % 12 || 12).padStart(2, '0')}:${m}`;
}
export function dragClock(value: number, hand: 'hour' | 'minute', angle: number) {
  const normalized = ((angle % 360) + 360) % 360;
  if (hand === 'minute') {
    const minute = Math.round(normalized / 6) % 60, old = normalizeMinutes(value) % 60;
    const carry = old >= 45 && minute <= 15 ? 60 : old <= 15 && minute >= 45 ? -60 : 0;
    return normalizeMinutes(Math.floor(value / 60) * 60 + minute + carry);
  }
  const hour = Math.round((normalized - (value % 60) / 2) / 30);
  const current = Math.floor(value / 60), delta = ((hour - current % 12 + 18) % 12) - 6;
  return normalizeMinutes((current + delta) * 60 + value % 60);
}
export function clockTarget(step: number, previous = -1, random = Math.random) {
  const slots = 1440 / step;
  let target = Math.min(slots - 1, Math.floor(random() * slots)) * step;
  if (target === previous) target = normalizeMinutes(target + step);
  return target;
}
export function legacyValue(key: string): unknown {
  try { if (typeof window === 'undefined') return null; const value = window.localStorage.getItem(key); return value ? JSON.parse(value) : null; } catch { return null; }
}
export const newRunId = () => typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const normalizeWord = (value: string) => value.trim().normalize('NFKC').toLowerCase();

export type Operation = '+' | '-' | '×' | '÷';
export interface MathSettings { level: 20 | 100 | 1000; operations: Operation[]; duration: 30 | 60 | 120; }
export interface MathQuestion { id: string; a: number; b: number; op: Operation; answer: number; }
export interface MathAttempt extends MathQuestion { response: string; correct: boolean; }
export interface MathRun {
  id: string; status: 'ready' | 'playing' | 'paused' | 'result'; settings: MathSettings;
  question: MathQuestion; input: string; attempts: MathAttempt[]; remaining: number; deadline: number | null;
  review: MathQuestion[]; reviewIndex: number; feedback: string;
}
export const DEFAULT_MATH: MathSettings = { level: 100, operations: ['+', '-'], duration: 60 };
export function mathQuestion(settings: MathSettings, id: string, random = Math.random): MathQuestion {
  const int = (min: number, max: number) => min + Math.min(max - min, Math.floor(random() * (max - min + 1)));
  const op = settings.operations[int(0, settings.operations.length - 1)] || '+';
  let a: number, b: number, answer: number;
  if (op === '+') { a = int(1, settings.level - 1); b = int(1, settings.level - a); answer = a + b; }
  else if (op === '-') { a = int(2, settings.level); b = int(1, a); answer = a - b; }
  else if (op === '×') { a = int(2, settings.level === 20 ? 4 : settings.level === 100 ? 9 : 25); b = int(2, Math.min(settings.level === 1000 ? 25 : 9, Math.floor(settings.level / a))); answer = a * b; }
  else { b = int(2, settings.level === 20 ? 5 : settings.level === 100 ? 9 : 25); answer = int(1, Math.min(settings.level === 1000 ? 25 : 9, Math.floor(settings.level / b))); a = b * answer; }
  return { id, a, b, op, answer };
}
export function createMathRun(settings: MathSettings = DEFAULT_MATH, now = Date.now(), review: MathQuestion[] = [], id = newRunId()): MathRun {
  return { id, status: 'playing', settings: { ...settings, operations: [...settings.operations] }, question: review.length ? { ...review[0], id: `${id}-0` } : mathQuestion(settings, `${id}-0`), input: '', attempts: [], remaining: settings.duration * 1000, deadline: now + settings.duration * 1000, review, reviewIndex: 0, feedback: '' };
}
export function finishMath(run: MathRun, includeCurrent = true): MathRun {
  if (run.status === 'result' || run.status === 'ready') return run;
  const attempts = includeCurrent && !run.attempts.some(a => a.id === run.question.id) ? [...run.attempts, { ...run.question, response: run.input.trim() ? `未提交：${run.input.trim()}` : '', correct: false }] : run.attempts;
  return { ...run, status: 'result', deadline: null, remaining: 0, attempts, feedback: '' };
}
export function submitMath(run: MathRun, now = Date.now(), skip = false): MathRun {
  if (run.status !== 'playing' || run.attempts.some(a => a.id === run.question.id)) return run;
  if (run.deadline !== null && now >= run.deadline) return finishMath(run);
  if (!skip && !/^\d+$/.test(run.input.trim())) return { ...run, feedback: '请输入完整的非负整数。' };
  const correct = !skip && Number(run.input.trim()) === run.question.answer;
  const attempts = [...run.attempts, { ...run.question, response: skip ? '' : run.input.trim(), correct }];
  const reviewIndex = run.reviewIndex + 1;
  const next = { ...run, attempts, reviewIndex, input: '', feedback: correct ? '正确' : `${run.question.a} ${run.question.op} ${run.question.b} = ${run.question.answer}` };
  if (run.review.length && reviewIndex >= run.review.length) return finishMath(next, false);
  const id = `${run.id}-${attempts.length}`;
  return { ...next, question: run.review.length ? { ...run.review[reviewIndex], id } : mathQuestion(run.settings, id) };
}
export function mathStats(attempts: MathAttempt[]) {
  let combo = 0, best = 0;
  for (const attempt of attempts) { combo = attempt.correct ? combo + 1 : 0; best = Math.max(best, combo); }
  const correct = attempts.filter(a => a.correct).length;
  return { correct, best, score: correct * 10, accuracy: attempts.length ? Math.round(correct / attempts.length * 100) : 0 };
}
export function validMathSettings(v: unknown): v is MathSettings {
  return record(v) && [20, 100, 1000].includes(v.level) && [30, 60, 120].includes(v.duration) && Array.isArray(v.operations) && v.operations.length > 0 && v.operations.length <= 4 && v.operations.every((op: unknown) => ['+', '-', '×', '÷'].includes(String(op)));
}
export function validMathQuestion(v: unknown): v is MathQuestion {
  if (!record(v) || typeof v.id !== 'string' || !integer(v.a, 0, 1000) || !integer(v.b, 0, 1000) || !integer(v.answer, 0, 1000)) return false;
  const result = v.op === '+' ? v.a + v.b : v.op === '-' ? v.a - v.b : v.op === '×' ? v.a * v.b : v.op === '÷' && v.b !== 0 ? v.a / v.b : NaN;
  return result === v.answer;
}
export function validMathRun(v: unknown): v is MathRun {
  const validAttempt = (a: unknown) => record(a) && typeof a.response === 'string' && typeof a.correct === 'boolean' && validMathQuestion(a) && (a as MathAttempt).correct === (/^\d+$/.test((a as MathAttempt).response) && Number((a as MathAttempt).response) === a.answer);
  return record(v) && typeof v.id === 'string' && ['ready', 'playing', 'paused', 'result'].includes(v.status) && validMathSettings(v.settings) && validMathQuestion(v.question) && typeof v.input === 'string' && v.input.length <= 12 && Array.isArray(v.attempts) && v.attempts.length < 10000 && v.attempts.every(validAttempt) && unique(v.attempts.map((a: MathAttempt) => a.id)).length === v.attempts.length && integer(v.remaining, 0, 120000) && (v.status === 'playing' ? integer(v.deadline) : v.deadline === null) && Array.isArray(v.review) && v.review.every(validMathQuestion) && integer(v.reviewIndex, 0, v.review.length || 10000) && typeof v.feedback === 'string';
}

export interface WordProgress { due: number; seen: boolean; correct: number; wrong: boolean; }
export function initialWordProgress(legacy: unknown): Record<string, WordProgress> {
  if (!record(legacy)) return {};
  return Object.fromEntries(Object.entries(legacy).filter(([, due]) => integer(due)).map(([id, due]) => [id, { due, seen: true, correct: 0, wrong: false }]));
}
export function updateWordProgress(previous: WordProgress | undefined, correct: boolean, tested: boolean, now = Date.now()): WordProgress {
  const streak = tested ? correct ? Math.min((previous?.correct || 0) + 1, 5) : 0 : previous?.correct || 0;
  return { seen: true, correct: streak, wrong: tested ? !correct : correct ? previous?.wrong || false : true, due: now + (correct ? tested ? [1, 1, 3, 7, 14, 30][streak] * 86400000 : 86400000 : 3600000) };
}
export const validWordProgress = (v: unknown): v is WordProgress => record(v) && integer(v.due) && typeof v.seen === 'boolean' && integer(v.correct, 0, 5) && typeof v.wrong === 'boolean';
