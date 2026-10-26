export type Side = 0 | 1;
export type Point = [number, number]; // [column, row], matching Sabaki vertices.
export type Difficulty = 1 | 2 | 3;
export interface MatchSettings {
  mode: 'local' | 'computer';
  human: Side;
  level: Difficulty;
  minutes: number;
}
export interface MatchBase {
  version: 1;
  settings: MatchSettings;
  remaining: [number, number];
  timeout: Side | null;
  flipped: boolean;
  hints: boolean;
}

export const DEFAULT_SETTINGS: MatchSettings = { mode: 'local', human: 0, level: 2, minutes: 10 };
export const TIME_OPTIONS = [0, 5, 10, 20] as const;
export const pointKey = (point: Point) => point.join(',');
export const otherSide = (side: Side): Side => side === 0 ? 1 : 0;
export const coordinate = ([x, y]: Point, size: number) => `${'ABCDEFGHJKLMNOPQRST'[x]}${size - y}`;

export function newMatchBase(settings: MatchSettings = DEFAULT_SETTINGS): MatchBase {
  return { version: 1, settings: { ...settings }, remaining: [settings.minutes * 60_000, settings.minutes * 60_000], timeout: null, flipped: false, hints: true };
}

export function validSettings(value: unknown): value is MatchSettings {
  if (!value || typeof value !== 'object') return false;
  const s = value as MatchSettings;
  return ['local', 'computer'].includes(s.mode) && [0, 1].includes(s.human) && [1, 2, 3].includes(s.level) && TIME_OPTIONS.includes(s.minutes as 0);
}

export function validBase(value: unknown): value is MatchBase {
  if (!value || typeof value !== 'object') return false;
  const s = value as MatchBase;
  return s.version === 1 && validSettings(s.settings) && Array.isArray(s.remaining) && s.remaining.length === 2
    && s.remaining.every(n => Number.isFinite(n) && n >= 0 && n <= s.settings.minutes * 60_000)
    && (s.timeout === null ? s.settings.minutes === 0 || s.remaining.every(n => n > 0) : (s.settings.minutes > 0 && [0, 1].includes(s.timeout) && s.remaining[s.timeout] === 0))
    && typeof s.flipped === 'boolean' && typeof s.hints === 'boolean';
}

export function validPoint(value: unknown, size: number): value is Point {
  return Array.isArray(value) && value.length === 2 && value.every(n => Number.isInteger(n) && n >= 0 && n < size);
}

export function chargeClock<T extends MatchBase>(match: T, side: Side, elapsed: number): T {
  if (!match.settings.minutes || match.timeout !== null || elapsed <= 0) return match;
  const remaining: [number, number] = [...match.remaining];
  remaining[side] = Math.max(0, remaining[side] - Math.max(0, elapsed));
  return { ...match, remaining, timeout: remaining[side] === 0 ? side : null };
}

export function formatClock(ms: number, minutes: number): string {
  if (!minutes) return '不限时';
  const seconds = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function undoCount(length: number, settings: MatchSettings, turn: Side): number {
  if (!length) return 0;
  if (settings.mode === 'local') return 1;
  return Math.min(length, turn === settings.human ? 2 : 1);
}

export interface StrategyStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

// Preserve damaged data before the shared hook writes a clean session over it.
export function recoverStrategySession<T>(storage: StrategyStorage | null, key: string, initial: T, validate: (value: unknown) => boolean): { value: T; message: string } {
  if (!storage) return { value: initial, message: '本地存储不可用，本局仍可继续。' };
  try {
    const raw = storage.getItem(key);
    if (!raw) return { value: initial, message: '' };
    try {
      const parsed = JSON.parse(raw);
      if (validate(parsed)) return { value: parsed as T, message: '已恢复上次对局，计时已暂停。' };
    } catch { /* Try the last independently validated checkpoint below. */ }
    let preserved = false;
    try { storage.setItem(`${key}.damaged`, raw); preserved = true; } catch { /* A full disk must not prevent recovery. */ }
    const preservation = preserved ? '原记录已保留。' : '存储不可写，无法备份损坏记录。';
    const backup = storage.getItem(`${key}.backup`);
    if (backup) {
      try {
        const parsed = JSON.parse(backup);
        if (validate(parsed)) return { value: parsed as T, message: `存档损坏，已从备份恢复；${preservation}` };
      } catch { /* The backup is also invalid. */ }
    }
    return { value: initial, message: `存档损坏，已安全新建对局；${preservation}` };
  } catch { return { value: initial, message: '本地存储不可用，本局仍可继续。' }; }
}
