import { APIError, checked, primary } from './types';
import type { Env } from './types';

const COLLECTIONS: Record<string, { table: string; columns: string; search: string[]; json: string[] }> = {
  idioms: {
    table: 'idioms', columns: 'id, word, pinyin, abbreviation, derivation, explanation, example',
    search: ['word', 'pinyin', 'abbreviation', 'explanation'], json: [],
  },
  poems: {
    table: 'poems', columns: 'id, title, author, dynasty, lines, meaning, category, image_url, created_at',
    search: ['title', 'author', 'dynasty', 'lines', 'meaning'], json: ['lines'],
  },
  'brain-teasers': {
    table: 'brain_teasers', columns: 'id, question, answer, hints, category, difficulty, created_at',
    search: ['question', 'answer', 'category'], json: ['hints'],
  },
  sanzijing: {
    table: 'sanzijing_verses',
    columns: 'id, verse_index, chapter_name, content_raw, content_chars, content_pinyin, translation_vernacular, translation_english, interpretation_deep, allusion_title, allusion_context, allusion_source, char_analysis, difficulty_level, key_vocabulary, audio_url, tags',
    search: ['content_raw', 'chapter_name', 'translation_vernacular', 'translation_english', 'tags'],
    json: ['content_chars', 'content_pinyin', 'char_analysis', 'key_vocabulary', 'tags'],
  },
  vocabulary: {
    table: 'vocab_words', columns: 'id, word, phonetic, definition, example_sentence, category_id',
    search: ['word', 'definition', 'example_sentence'], json: [],
  },
  categories: {
    table: 'vocab_categories', columns: 'id, name, label', search: ['name', 'label'], json: [],
  },
};

export const SOURCE_TABLES = [
  'brain_teasers', 'idioms', 'poems', 'portal_favorites', 'portal_users',
  'sanzijing_verses', 'vocab_categories', 'vocab_progress', 'vocab_words',
] as const;

export async function library(url: URL, env: Env) {
  const name = url.pathname.slice('/api/library/'.length);
  const collection = Object.prototype.hasOwnProperty.call(COLLECTIONS, name) ? COLLECTIONS[name] : undefined;
  if (!collection) throw new APIError(404, 'NOT_FOUND', 'Unknown library collection.');
  for (const key of url.searchParams.keys()) {
    if (!['q', 'limit', 'offset'].includes(key) || url.searchParams.getAll(key).length !== 1) {
      throw new APIError(400, 'INVALID_QUERY', 'Only q, limit and offset are supported.');
    }
  }
  const integer = (key: string, fallback: number) => {
    const raw = url.searchParams.get(key);
    if (raw === null) return fallback;
    if (!/^\d{1,9}$/.test(raw) || (key === 'limit' && Number(raw) === 0)) {
      throw new APIError(400, 'INVALID_PAGINATION', 'Pagination must use non-negative integers and a positive limit.');
    }
    return Number(raw);
  };
  const limit = Math.min(100, integer('limit', 50));
  const offset = integer('offset', 0);
  if (offset > 1_000_000) throw new APIError(400, 'INVALID_PAGINATION', 'Offset is too large.');
  const query = (url.searchParams.get('q') || '').trim();
  if (query.length > 200) throw new APIError(400, 'INVALID_QUERY', 'Search is limited to 200 characters.');
  const where = query ? ` WHERE (${collection.search.map(column => `${column} LIKE ? ESCAPE '\\'`).join(' OR ')})` : '';
  const escaped = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const values = query ? collection.search.map(() => escaped) : [];
  const db = primary(env.DB);
  // One transaction gives the page and its total a consistent snapshot.
  const [count, page] = await db.batch([
    db.prepare(`SELECT COUNT(*) AS total FROM ${collection.table}${where}`).bind(...values),
    db.prepare(`SELECT ${collection.columns} FROM ${collection.table}${where} ORDER BY id LIMIT ? OFFSET ?`)
      .bind(...values, limit, offset),
  ]);
  const total = Number(checked(count).results[0]?.total);
  if (!Number.isSafeInteger(total) || total < 0) throw new Error('Invalid library count');
  const items = checked(page).results.map(row => {
    const item = { ...row };
    for (const key of collection.json) {
      if (typeof item[key] === 'string') item[key] = JSON.parse(item[key] as string);
    }
    return item;
  });
  return { items, limit, offset, total, hasMore: offset + items.length < total };
}

interface ManifestRow {
  table_name: string;
  expected_count: number;
  imported_count: number;
  status: string;
  source_sha256: string | null;
  imported_sha256: string | null;
  verified_at: string | null;
}

export async function dataStatus(env: Env) {
  const db = primary(env.DB);
  const results = await db.batch([
    db.prepare('SELECT 1 AS ok'),
    db.prepare('SELECT table_name, expected_count, imported_count, status, source_sha256, imported_sha256, verified_at FROM migration_manifest'),
    ...SOURCE_TABLES.map(table => db.prepare(`SELECT COUNT(*) AS total FROM ${table}`)),
  ]);
  if (checked(results[0]).results[0]?.ok !== 1) throw new Error('Database probe failed');
  const manifest = checked(results[1]).results as unknown as ManifestRow[];
  const tables = SOURCE_TABLES.map((table, index) => {
    const row = manifest.find(item => item.table_name === table);
    const actualCount = Number(checked(results[index + 2]).results[0]?.total);
    const digestMatches = !!row && (
      (!row.source_sha256 && !row.imported_sha256) ||
      (/^[a-f0-9]{64}$/i.test(row.source_sha256 || '') && row.source_sha256 === row.imported_sha256)
    );
    const ready = !!row && row.status === 'complete' && Number.isSafeInteger(actualCount) &&
      actualCount === row.expected_count && actualCount === row.imported_count &&
      !!row.verified_at && Number.isFinite(Date.parse(row.verified_at)) && digestMatches;
    return {
      table, expectedCount: row?.expected_count ?? null, importedCount: row?.imported_count ?? null,
      actualCount, status: row?.status ?? 'missing', verifiedAt: row?.verified_at ?? null, ready,
    };
  });
  const ready = tables.every(table => table.ready);
  const emptyAt = env.LEGACY_BLOBS_VERIFIED_EMPTY;
  const verifiedEmpty = !!emptyAt && /^\d{4}-\d{2}-\d{2}$/.test(emptyAt) &&
    Number.isFinite(Date.parse(`${emptyAt}T00:00:00Z`)) &&
    new Date(`${emptyAt}T00:00:00Z`).toISOString().slice(0, 10) === emptyAt;
  return {
    ok: true, ready, release: env.EXBEAM_RELEASE || null, database: { connected: true },
    migration: { status: ready ? 'complete' : 'incomplete', tables, totalRows: tables.reduce((sum, table) => sum + table.actualCount, 0) },
    // Legacy Blobs are not covered by the nine-table Neon migration.
    summerWorkspace: {
      storage: 'd1', legacyReadEnabled: !!env.LEGACY_SUMMER_ORIGIN,
      legacyMigration: verifiedEmpty ? 'verified-empty' : 'not-verified',
      legacyVerifiedEmptyAt: verifiedEmpty ? emptyAt : null,
    },
  };
}
