-- Source arrays/jsonb are serialized JSON TEXT; timestamps remain ISO TEXT.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS brain_teasers (
  id TEXT PRIMARY KEY NOT NULL,
  question TEXT NOT NULL, answer TEXT NOT NULL,
  hints TEXT NOT NULL CHECK (json_valid(hints)),
  category TEXT NOT NULL, difficulty TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS brain_teasers_category_idx ON brain_teasers(category);

CREATE TABLE IF NOT EXISTS idioms (
  id INTEGER PRIMARY KEY NOT NULL,
  word TEXT NOT NULL, pinyin TEXT, abbreviation TEXT, derivation TEXT,
  explanation TEXT, example TEXT
);
CREATE INDEX IF NOT EXISTS idioms_word_idx ON idioms(word);
CREATE INDEX IF NOT EXISTS idioms_pinyin_idx ON idioms(pinyin);

CREATE TABLE IF NOT EXISTS poems (
  id INTEGER PRIMARY KEY NOT NULL,
  title TEXT NOT NULL, author TEXT NOT NULL, dynasty TEXT NOT NULL,
  lines TEXT NOT NULL CHECK (json_valid(lines) AND json_type(lines) = 'array'),
  meaning TEXT, category TEXT, image_url TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS poems_category_idx ON poems(category);
CREATE INDEX IF NOT EXISTS poems_author_idx ON poems(author);

CREATE TABLE IF NOT EXISTS portal_users (
  id INTEGER PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS portal_favorites (
  id INTEGER PRIMARY KEY NOT NULL, user_email TEXT NOT NULL, module_id TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(user_email, module_id)
);

CREATE TABLE IF NOT EXISTS sanzijing_verses (
  id INTEGER PRIMARY KEY NOT NULL, verse_index INTEGER UNIQUE, chapter_name TEXT,
  content_raw TEXT,
  content_chars TEXT CHECK (content_chars IS NULL OR (json_valid(content_chars) AND json_type(content_chars) = 'array')),
  content_pinyin TEXT CHECK (content_pinyin IS NULL OR (json_valid(content_pinyin) AND json_type(content_pinyin) = 'array')),
  translation_vernacular TEXT, translation_english TEXT, interpretation_deep TEXT,
  allusion_title TEXT, allusion_context TEXT, allusion_source TEXT,
  char_analysis TEXT CHECK (char_analysis IS NULL OR json_valid(char_analysis)),
  difficulty_level INTEGER,
  key_vocabulary TEXT CHECK (key_vocabulary IS NULL OR (json_valid(key_vocabulary) AND json_type(key_vocabulary) = 'array')),
  audio_url TEXT,
  tags TEXT CHECK (tags IS NULL OR (json_valid(tags) AND json_type(tags) = 'array'))
);

CREATE TABLE IF NOT EXISTS vocab_categories (
  id INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, label TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vocab_words (
  id INTEGER PRIMARY KEY NOT NULL, word TEXT NOT NULL, phonetic TEXT, definition TEXT NOT NULL,
  example_sentence TEXT, category_id INTEGER REFERENCES vocab_categories(id)
);
CREATE INDEX IF NOT EXISTS vocab_words_category_idx ON vocab_words(category_id);
CREATE INDEX IF NOT EXISTS vocab_words_word_idx ON vocab_words(word);
CREATE TABLE IF NOT EXISTS vocab_progress (
  id INTEGER PRIMARY KEY NOT NULL, user_email TEXT NOT NULL,
  word_id INTEGER REFERENCES vocab_words(id), status TEXT DEFAULT 'New',
  next_review_date TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  correct_count INTEGER DEFAULT 0,
  UNIQUE(user_email, word_id)
);

-- Import tooling owns this manifest. Production has no import/token endpoint.
CREATE TABLE IF NOT EXISTS migration_manifest (
  table_name TEXT PRIMARY KEY NOT NULL,
  expected_count INTEGER NOT NULL CHECK (expected_count >= 0),
  imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'importing', 'complete', 'failed')),
  source_sha256 TEXT, imported_sha256 TEXT, verified_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT INTO migration_manifest(table_name, expected_count) VALUES
  ('brain_teasers', 58), ('idioms', 30895), ('poems', 70),
  ('portal_favorites', 1), ('portal_users', 61), ('sanzijing_verses', 61),
  ('vocab_categories', 8), ('vocab_progress', 28), ('vocab_words', 225)
ON CONFLICT(table_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS summer_workspaces (
  code TEXT PRIMARY KEY NOT NULL,
  pin_hash TEXT NOT NULL,
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  version INTEGER NOT NULL CHECK (version >= 0),
  last_mutation_id TEXT, last_mutation_hash TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS summer_mutations (
  workspace_code TEXT NOT NULL REFERENCES summer_workspaces(code) ON DELETE CASCADE,
  mutation_id TEXT NOT NULL, mutation_hash TEXT NOT NULL,
  applied_version INTEGER NOT NULL, applied_at TEXT NOT NULL,
  PRIMARY KEY(workspace_code, mutation_id)
);
-- A successful CAS and its receipt commit together, including across isolates.
CREATE TRIGGER IF NOT EXISTS summer_workspace_mutation_receipt
AFTER UPDATE OF version ON summer_workspaces
WHEN NEW.version > OLD.version AND NEW.last_mutation_id IS NOT NULL
BEGIN
  INSERT INTO summer_mutations(workspace_code, mutation_id, mutation_hash, applied_version, applied_at)
  VALUES(NEW.code, NEW.last_mutation_id, NEW.last_mutation_hash, NEW.version, NEW.updated_at);
END;

-- Shared fixed-window attempt budgets reserve before hashing, so parallel guesses
-- cannot bypass the limit. Both family and IP scopes are used by the worker.
CREATE TABLE IF NOT EXISTS summer_pin_attempts (
  scope TEXT PRIMARY KEY NOT NULL,
  window_start INTEGER NOT NULL, attempts INTEGER NOT NULL CHECK (attempts >= 0)
);
