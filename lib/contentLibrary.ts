export const LIBRARY_COLLECTIONS = {
  idioms: { label: '成语', noun: '则' },
  poems: { label: '诗词', noun: '首' },
  sanzijing: { label: '三字经译注', noun: '段' },
  vocabulary: { label: '英语词汇', noun: '词' },
  categories: { label: '内容分类', noun: '项' },
  'brain-teasers': { label: '思维题', noun: '题' },
} as const;

export type LibraryCollection = keyof typeof LIBRARY_COLLECTIONS;
export const LIBRARY_PAGE_SIZE = 24;
export const LIBRARY_SEARCH_DELAY = 300;
export const LIBRARY_QUERY_LIMIT = 200;

export function cultureLibraryCollection(bookId: string): LibraryCollection | undefined {
  if (bookId === 'poetry') return 'poems';
  if (bookId === 'idiom') return 'idioms';
  if (bookId === 'sanzijing') return 'sanzijing';
  return undefined;
}

export interface LibraryPage {
  items: Record<string, unknown>[];
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export class ContentLibraryError extends Error {
  constructor(readonly code: 'unavailable' | 'invalid-response' | 'invalid-request') {
    super(code === 'invalid-response' ? '云端返回的内容格式异常，请重试。'
      : code === 'invalid-request' ? '资料库查询条件无效。'
        : '云端资料库暂时无法连接，请稍后重试。');
    this.name = 'ContentLibraryError';
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const isCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

export async function fetchLibraryPage(
  collection: LibraryCollection,
  { q = '', offset = 0, signal }: { q?: string; offset?: number; signal?: AbortSignal } = {},
  fetcher: typeof fetch = globalThis.fetch,
): Promise<LibraryPage> {
  if (!Object.prototype.hasOwnProperty.call(LIBRARY_COLLECTIONS, collection) || typeof q !== 'string' || !isCount(offset)) {
    throw new ContentLibraryError('invalid-request');
  }
  const params = new URLSearchParams({ q: q.trim().slice(0, LIBRARY_QUERY_LIMIT), limit: String(LIBRARY_PAGE_SIZE), offset: String(offset) });
  let response: Response;
  try {
    response = await fetcher(`/api/library/${collection}?${params}`, {
      method: 'GET', credentials: 'same-origin', mode: 'same-origin', redirect: 'error',
      cache: 'no-store', headers: { Accept: 'application/json' }, signal,
    });
  } catch {
    throw new ContentLibraryError('unavailable');
  }
  if (!response.ok || response.redirected) throw new ContentLibraryError('unavailable');
  if (!/^application\/(?:[a-z0-9.+-]+\+)?json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
    throw new ContentLibraryError('invalid-response');
  }
  let payload: unknown;
  try { payload = await response.json(); }
  catch { throw new ContentLibraryError('invalid-response'); }
  if (!isObject(payload) || !Array.isArray(payload.items) || !payload.items.every(isObject)
    || payload.limit !== LIBRARY_PAGE_SIZE || payload.offset !== offset || !isCount(payload.total)
    || typeof payload.hasMore !== 'boolean'
    || payload.items.length !== Math.min(LIBRARY_PAGE_SIZE, Math.max(0, payload.total - offset))
    || payload.hasMore !== (offset + payload.items.length < payload.total)) {
    throw new ContentLibraryError('invalid-response');
  }
  return { items: payload.items, limit: LIBRARY_PAGE_SIZE, offset, total: payload.total, hasMore: payload.hasMore };
}

export type LibraryLoadState =
  | { phase: 'loading' }
  | { phase: 'ready'; page: LibraryPage }
  | { phase: 'error'; message: string };

export function createLibrarySearch(
  onState: (state: LibraryLoadState) => void,
  { fetcher, delay = LIBRARY_SEARCH_DELAY }: { fetcher?: typeof fetch; delay?: number } = {},
) {
  let generation = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  return {
    load(collection: LibraryCollection, q = '', offset = 0, debounce = false) {
      if (disposed) return;
      const current = ++generation;
      clearTimeout(timer);
      controller?.abort();
      onState({ phase: 'loading' });
      const run = async () => {
        controller = new AbortController();
        try {
          const page = await fetchLibraryPage(collection, { q, offset, signal: controller.signal }, fetcher);
          if (!disposed && current === generation) onState({ phase: 'ready', page });
        } catch (error) {
          if (!disposed && current === generation) onState({
            phase: 'error', message: error instanceof ContentLibraryError ? error.message : new ContentLibraryError('unavailable').message,
          });
        }
      };
      if (debounce) timer = setTimeout(() => { void run(); }, delay);
      else void run();
    },
    dispose() {
      disposed = true;
      generation++;
      clearTimeout(timer);
      controller?.abort();
    },
  };
}

export interface LibraryEntry {
  id: string;
  title: string;
  subtitle: string;
  preview: string;
  lines: string[];
  characters: string[];
  pinyin: string[];
  sections: { label: string; text: string }[];
  source: string;
}

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export function libraryEntry(collection: LibraryCollection, item: Record<string, unknown>, index: number): LibraryEntry {
  const sections: LibraryEntry['sections'] = [];
  const add = (label: string, value: unknown) => { if (text(value)) sections.push({ label, text: text(value) }); };
  let title = '';
  let subtitle = '';
  let lines: string[] = [];
  let characters: string[] = [];
  let pinyin: string[] = [];
  let source = text(item.source);
  switch (collection) {
    case 'idioms':
      title = text(item.word);
      subtitle = text(item.pinyin);
      add('释义', item.explanation);
      add('例句', item.example);
      source = text(item.derivation) || source;
      break;
    case 'poems':
      title = text(item.title);
      subtitle = [text(item.dynasty), text(item.author)].filter(Boolean).join(' · ');
      lines = strings(item.lines);
      add('诗意与赏析', item.meaning);
      source = source || text(item.source_title);
      break;
    case 'sanzijing':
      characters = strings(item.content_chars);
      pinyin = strings(item.content_pinyin);
      title = text(item.content_raw) || characters.join('');
      subtitle = [text(item.chapter_name), isCount(item.verse_index) ? `第 ${item.verse_index} 段` : ''].filter(Boolean).join(' · ');
      if (!characters.length && title) lines = [title];
      add('白话译文', item.translation_vernacular);
      add('深入解读', item.interpretation_deep);
      add('英文对照', item.translation_english);
      add('典故', [text(item.allusion_title), text(item.allusion_context)].filter(Boolean).join('\n'));
      source = text(item.allusion_source) || source;
      break;
    case 'vocabulary':
      title = text(item.word);
      subtitle = text(item.phonetic) || text(item.phonetics);
      add('释义', text(item.definition) || text(item.meaning));
      add('例句', text(item.example) || text(item.example_sentence));
      add('译文', text(item.translation) || text(item.example_translation));
      break;
    case 'categories':
      title = text(item.name) || text(item.title);
      add('分类说明', item.description);
      break;
    case 'brain-teasers':
      title = text(item.question);
      subtitle = [text(item.category), text(item.difficulty)].filter(Boolean).join(' · ');
      add('答案', item.answer);
      add('解析', item.explanation);
      break;
  }
  return {
    id: typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : `${collection}:${index}`,
    title: title || '未题名条目', subtitle,
    preview: lines.join(' ') || sections[0]?.text || subtitle,
    lines, characters, pinyin, sections, source,
  };
}
