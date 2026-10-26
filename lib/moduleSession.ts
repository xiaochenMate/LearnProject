import { useEffect, useRef, useState } from 'react';

export interface ModuleStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
function compatible(value: unknown, initial: unknown): boolean {
  if (initial === null) return value === null || typeof value === 'object';
  if (Array.isArray(initial)) return Array.isArray(value);
  if (typeof initial === 'object') return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.entries(initial).every(([key, fallback]) => compatible((value as Record<string, unknown>)[key], fallback)));
  return typeof value === typeof initial && (typeof value !== 'number' || Number.isFinite(value));
}
export function readModuleSession<T>(storage: ModuleStorage | null, key: string, initial: T, validate?: (value: unknown) => boolean): { value: T; available: boolean; restored: boolean } {
  if (!storage) return { value: initial, available: false, restored: false };
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch { return { value: initial, available: false, restored: false }; }
  try {
    if (!raw) return { value: initial, available: true, restored: false };
    const value: unknown = JSON.parse(raw);
    if (!(validate ? validate(value) : compatible(value, initial))) return { value: initial, available: true, restored: false };
    return { value: value as T, available: true, restored: true };
  } catch {
    return { value: initial, available: true, restored: false };
  }
}
export function useModuleState<T>(key: string, initial: T | (() => T), validate?: (value: unknown) => boolean) {
  const initialRead = useRef<ReturnType<typeof readModuleSession<T>> | null>(null);
  if (!initialRead.current) {
    const fallback = typeof initial === 'function' ? (initial as () => T)() : initial;
    try { initialRead.current = readModuleSession(window.localStorage, key, fallback, validate); }
    catch { initialRead.current = { value: fallback, available: false, restored: false }; }
  }
  const [value, setValue] = useState<T>(initialRead.current.value);
  const [available, setAvailable] = useState(initialRead.current.available);
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); setAvailable(true); }
    catch { setAvailable(false); }
  }, [key, value]);
  return [value, setValue, available] as const;
}
export function downloadModuleFile(name: string, content: string | Blob, type = 'application/json') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
