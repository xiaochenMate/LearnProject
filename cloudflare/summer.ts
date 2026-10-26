import { applySummerMutation } from '../lib/summerWorkspace';
import type { SummerWorkspaceState } from '../lib/summerWorkspace';
import { APIError, checked, primary } from './types';
import type { Env } from './types';
import { boundedJSON, isRecord, mutationInput, serializeState, workspaceState } from './summer-input';

const CODE = /^[A-HJ-NP-Z2-9]{8}$/;
const PIN = /^\d{4,8}$/;
const PBKDF2_ITERATIONS = 100_000;
const ATTEMPT_WINDOW = 15 * 60 * 1000;
const CAS_RETRIES = 8;
const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
const unhex = (value: string) => Uint8Array.from(value.match(/../g) || [], byte => Number.parseInt(byte, 16));

interface StoredWorkspace {
  code: string;
  pin_hash: string;
  state_json: string;
  version: number;
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function derivePin(pin: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations }, key, 256));
}

async function newPinHash(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${hex(salt)}$${await derivePin(pin, salt, PBKDF2_ITERATIONS)}`;
}

function equalHash(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function pinMatches(pin: string, stored: string) {
  if (!PIN.test(pin)) return false;
  if (/^[a-f0-9]{64}$/i.test(stored)) return equalHash(await sha256(`exbeam-summer:${pin}`), stored.toLowerCase());
  const match = /^pbkdf2-sha256\$(\d+)\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(stored);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > PBKDF2_ITERATIONS) {
    throw new APIError(503, 'PIN_STORAGE_INVALID', 'Parent PIN storage requires repair.');
  }
  return equalHash(await derivePin(pin, unhex(match[2]), Number(match[1])), match[3]);
}

async function readWorkspace(env: Env, code: string) {
  return primary(env.DB).prepare('SELECT code, pin_hash, state_json, version FROM summer_workspaces WHERE code = ?')
    .bind(code).first<StoredWorkspace>();
}

function storedState(row: StoredWorkspace) {
  try {
    const state = workspaceState(JSON.parse(row.state_json));
    if (row.version !== state.version) throw new Error('Version mismatch');
    return state;
  } catch {
    throw new APIError(503, 'WORKSPACE_STORAGE_INVALID', 'Workspace storage requires repair.');
  }
}

async function reserveAttempts(request: Request, env: Env, code: string) {
  const now = Date.now();
  const windowStart = Math.floor(now / ATTEMPT_WINDOW) * ATTEMPT_WINDOW;
  const scopes = [
    { scope: `family:${code}`, limit: 5 },
    { scope: `ip:${await sha256(request.headers.get('CF-Connecting-IP') || 'unknown')}`, limit: 30 },
  ];
  const db = primary(env.DB);
  const results = await db.batch(scopes.map(({ scope, limit }) => db.prepare(`
    INSERT INTO summer_pin_attempts(scope, window_start, attempts) VALUES(?, ?, 1)
    ON CONFLICT(scope) DO UPDATE SET window_start = excluded.window_start,
      attempts = CASE WHEN summer_pin_attempts.window_start = excluded.window_start
        THEN summer_pin_attempts.attempts + 1 ELSE 1 END
    WHERE summer_pin_attempts.window_start <> excluded.window_start OR summer_pin_attempts.attempts < ?
    RETURNING attempts
  `).bind(scope, windowStart, limit)));
  if (results.some(result => checked(result).results.length === 0)) {
    // Undo any partial reservation, but never erase a concurrent failure.
    const refunds = results.flatMap((result, index) => result.results.length ? [db.prepare(
      'UPDATE summer_pin_attempts SET attempts = attempts - 1 WHERE scope = ? AND window_start = ? AND attempts > 0',
    ).bind(scopes[index].scope, windowStart)] : []);
    if (refunds.length) await db.batch(refunds);
    throw new APIError(429, 'PIN_RATE_LIMITED', 'Too many parent PIN attempts. Try again later.', {}, {
      'Retry-After': String(Math.max(1, Math.ceil((windowStart + ATTEMPT_WINDOW - now) / 1000))),
    });
  }
  return async () => {
    await db.batch(scopes.map(({ scope }) => db.prepare(
      'UPDATE summer_pin_attempts SET attempts = attempts - 1 WHERE scope = ? AND window_start = ? AND attempts > 0',
    ).bind(scope, windowStart)));
  };
}

async function authenticate(request: Request, env: Env, row: StoredWorkspace, value: unknown) {
  const refund = await reserveAttempts(request, env, row.code);
  const pin = typeof value === 'string' ? value : '';
  if (!await pinMatches(pin, row.pin_hash)) {
    throw new APIError(403, 'INVALID_PIN', 'Parent PIN is incorrect.', { valid: false });
  }
  await refund();
  if (/^[a-f0-9]{64}$/i.test(row.pin_hash)) {
    const upgraded = await newPinHash(pin);
    const result = checked(await env.DB.prepare(
      'UPDATE summer_workspaces SET pin_hash = ? WHERE code = ? AND pin_hash = ?',
    ).bind(upgraded, row.code, row.pin_hash).run());
    if (result.meta.changes) return upgraded;
  }
  return row.pin_hash;
}

async function legacyWorkspace(request: Request, env: Env, code: string): Promise<SummerWorkspaceState | null> {
  if (!env.LEGACY_SUMMER_ORIGIN) return null;
  let origin: URL;
  try {
    origin = new URL(env.LEGACY_SUMMER_ORIGIN);
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' ||
        origin.search || origin.hash || origin.origin === new URL(request.url).origin) throw new Error('Invalid origin');
  } catch { throw new APIError(503, 'LEGACY_CONFIGURATION_INVALID', 'Legacy read origin is not configured safely.'); }
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 5000);
  try {
    const response = await fetch(new URL(`/api/summer-workspace?code=${encodeURIComponent(code)}`, origin), {
      method: 'GET', redirect: 'manual', credentials: 'omit', signal: abort.signal,
      headers: { Accept: 'application/json' },
    });
    if (response.status === 404) { await response.body?.cancel(); return null; }
    if (!response.ok || response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) {
      await response.body?.cancel();
      throw new Error('Legacy read failed');
    }
    const body = await boundedJSON(response);
    if (!isRecord(body) || body.code !== code || !isRecord(body.state)) throw new Error('Invalid legacy response');
    return workspaceState(body.state);
  } catch {
    throw new APIError(502, 'LEGACY_UNAVAILABLE', 'Legacy workspace could not be checked. No workspace was created or changed.');
  } finally { clearTimeout(timeout); }
}

function legacyReadOnly(): never {
  throw new APIError(409, 'LEGACY_PARENT_MIGRATION_REQUIRED',
    'Legacy workspace is read-only. Migration requires verification of the original parent PIN; no local workspace was created.',
    { readOnly: true, migrationRequired: true });
}

const normalizeCode = (value: unknown) => typeof value === 'string' ? value.trim().toUpperCase() : '';

export async function summerWorkspace(request: Request, env: Env): Promise<{ body: unknown; status?: number }> {
  const url = new URL(request.url);
  const payload = request.method === 'POST' ? await boundedJSON(request) : null;
  if (request.method === 'POST' && !isRecord(payload)) throw new APIError(400, 'INVALID_JSON', 'A JSON object is required.');
  const body = payload as Record<string, unknown> | null;
  const code = normalizeCode(body ? body.code : url.searchParams.get('code'));
  if (!CODE.test(code)) throw new APIError(400, 'INVALID_CODE', 'Invalid family sync code.');
  if (request.method === 'GET') {
    const row = await readWorkspace(env, code);
    if (row) return { body: { code, state: storedState(row) } };
    const legacy = await legacyWorkspace(request, env, code);
    if (legacy) return { body: { code, state: legacy, readOnly: true, migrationRequired: true, source: 'legacy' } };
    throw new APIError(404, 'WORKSPACE_NOT_FOUND', 'Family workspace not found.');
  }

  const action = body!.action;
  if (!['create', 'verify', 'mutate'].includes(String(action))) throw new APIError(400, 'INVALID_ACTION', 'Unknown workspace action.');
  if (action === 'create') {
    const pin = body!.pin;
    if (typeof pin !== 'string' || !PIN.test(pin)) throw new APIError(400, 'INVALID_PIN_FORMAT', 'Parent PIN must contain 4 to 8 digits.');
    if (await readWorkspace(env, code)) throw new APIError(409, 'CODE_IN_USE', '\u8fd9\u4e2a\u540c\u6b65\u7801\u5df2\u7ecf\u88ab\u4f7f\u7528\uff0c\u8bf7\u6362\u4e00\u4e2a');
    if (await legacyWorkspace(request, env, code)) legacyReadOnly();
    const state = workspaceState(body!.state);
    const now = new Date().toISOString();
    const result = checked(await env.DB.prepare(`
      INSERT INTO summer_workspaces(code, pin_hash, state_json, version, created_at, updated_at)
      VALUES(?, ?, ?, ?, ?, ?) ON CONFLICT(code) DO NOTHING
    `).bind(code, await newPinHash(pin), serializeState(state), state.version, now, now).run());
    if (!result.meta.changes) throw new APIError(409, 'CODE_IN_USE', '\u8fd9\u4e2a\u540c\u6b65\u7801\u5df2\u7ecf\u88ab\u4f7f\u7528\uff0c\u8bf7\u6362\u4e00\u4e2a');
    return { body: { code, state }, status: 201 };
  }

  let row = await readWorkspace(env, code);
  if (!row) {
    if (await legacyWorkspace(request, env, code)) legacyReadOnly();
    throw new APIError(404, 'WORKSPACE_NOT_FOUND', 'Family workspace not found.');
  }
  if (action === 'verify') {
    await authenticate(request, env, row, body!.pin);
    return { body: { valid: true } };
  }

  const mutation = mutationInput(body!.mutation);
  const role = body!.role === undefined ? 'child' : body!.role;
  if (role !== 'parent' && role !== 'child') throw new APIError(400, 'INVALID_ROLE', 'Unknown workspace role.');
  if (mutation.type === 'save-config' && role !== 'parent') throw new APIError(403, 'PARENT_REQUIRED', 'Only a parent can change workspace configuration.');
  const mutationHash = await sha256(canonical(mutation));
  let verifiedHash: string | undefined;
  for (let attempt = 0; attempt < CAS_RETRIES; attempt++) {
    if (role === 'parent' && verifiedHash !== row.pin_hash) {
      verifiedHash = await authenticate(request, env, row, body!.pin);
      row = { ...row, pin_hash: verifiedHash };
    }
    const state = storedState(row);
    const receipt = await primary(env.DB).prepare(
      'SELECT mutation_hash FROM summer_mutations WHERE workspace_code = ? AND mutation_id = ?',
    ).bind(code, mutation.id).first<{ mutation_hash: string }>();
    if (receipt && receipt.mutation_hash !== mutationHash) {
      throw new APIError(409, 'MUTATION_ID_CONFLICT', 'This mutation ID was already used for a different operation.');
    }
    if (receipt || state.appliedActionIds.includes(mutation.id)) {
      // A competing request may have committed after our original state read.
      const latest = await readWorkspace(env, code);
      if (!latest) throw new Error('Workspace disappeared');
      return { body: { code, state: storedState(latest), duplicate: true } };
    }
    const next = applySummerMutation(state, mutation);
    if (next.version === state.version) {
      // Already-completed tasks are harmless when distinct devices queued them.
      if (mutation.type === 'complete-task' && state.days[mutation.date]?.completedTaskIds.includes(mutation.taskId!)) {
        return { body: { code, state, applied: false, reason: 'TASK_ALREADY_COMPLETED' } };
      }
      throw new APIError(409, 'MUTATION_REJECTED', 'Operation is not valid for the current workspace state.');
    }
    workspaceState(next);
    const result = checked(await env.DB.prepare(`
      UPDATE summer_workspaces SET state_json = ?, version = ?, updated_at = ?, last_mutation_id = ?, last_mutation_hash = ?
      WHERE code = ? AND version = ? AND pin_hash = ?
        AND NOT EXISTS (SELECT 1 FROM summer_mutations WHERE workspace_code = ? AND mutation_id = ?)
    `).bind(serializeState(next), next.version, next.updatedAt, mutation.id, mutationHash,
      code, row.version, row.pin_hash, code, mutation.id).run());
    if (result.meta.changes) return { body: { code, state: next } };
    const latest = await readWorkspace(env, code);
    if (!latest) throw new Error('Workspace disappeared');
    row = latest;
  }
  throw new APIError(409, 'WORKSPACE_BUSY', 'Workspace changed concurrently. Retry the same mutation ID.', {}, { 'Retry-After': '1' });
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
