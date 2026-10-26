import { normalizeSummerWorkspace } from '../lib/summerWorkspace';
import type { SummerMutation, SummerTask, SummerWorkspaceState } from '../lib/summerWorkspace';
import { APIError } from './types';

export const MAX_JSON_BYTES = 1_048_576;
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const MOODS = ['great', 'good', 'okay', 'low', 'upset'];
const TYPES = ['complete-task', 'plant', 'redeem', 'save-config', 'save-check-in', 'log-focus'];

function requireValue(condition: unknown): asserts condition {
  if (!condition) throw new APIError(400, 'INVALID_PAYLOAD', 'Invalid workspace or mutation fields.');
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

const text = (value: unknown, max: number, empty = false): value is string =>
  typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const id = (value: unknown): value is string => typeof value === 'string' && ID.test(value) &&
  !['__proto__', 'constructor', 'prototype'].includes(value);
const date = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const timestamp = (value: unknown) => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));

function score(value: unknown) {
  requireValue(isRecord(value) && integer(value.total, 1, 1000) && integer(value.correct, 0, Number(value.total)));
}

function tasks(value: unknown): asserts value is SummerTask[] {
  requireValue(Array.isArray(value) && value.length <= 100);
  const ids = new Set();
  for (const task of value) {
    requireValue(isRecord(task) && id(task.id) && !ids.has(task.id) &&
      ['chinese', 'math', 'english', 'sport'].includes(String(task.subject)) &&
      ['check', 'quiz', 'reading', 'practice'].includes(String(task.kind)) &&
      text(task.title, 200) && text(task.description, 2000, true) &&
      integer(task.minutes, 1, 240) && integer(task.reward, 0, 10000));
    if (task.testKind !== undefined) requireValue([
      'pinyin', 'poetry', 'arithmetic', 'multiplication', 'logic', 'words', 'sentences',
    ].includes(String(task.testKind)));
    if (task.custom !== undefined) requireValue(typeof task.custom === 'boolean');
    ids.add(task.id);
  }
}

function ids(value: unknown, max = 100) {
  requireValue(Array.isArray(value) && value.length <= max && value.every(id) && new Set(value).size === value.length);
}

export function workspaceState(value: unknown): SummerWorkspaceState {
  if (value !== undefined && value !== null) requireValue(isRecord(value) && value.schemaVersion === 1);
  const state = normalizeSummerWorkspace(value as Partial<SummerWorkspaceState> | undefined);
  requireValue(integer(state.version, 0, Number.MAX_SAFE_INTEGER - 1) &&
    integer(state.sun, 0, Number.MAX_SAFE_INTEGER) && text(state.childName, 100) &&
    date(state.vacationStart) && date(state.vacationEnd) && state.vacationStart <= state.vacationEnd &&
    timestamp(state.updatedAt));
  tasks(state.tasks);
  ids(state.appliedActionIds, 150);
  requireValue(isRecord(state.days) && Object.keys(state.days).length <= 4000);
  for (const [key, day] of Object.entries(state.days)) {
    requireValue(date(key) && isRecord(day) && day.date === key && integer(day.defeatedMonsters, 0, 4));
    ids(day.expectedTaskIds);
    ids(day.completedTaskIds);
    requireValue(isRecord(day.quizScores) && Object.keys(day.quizScores).length <= 100);
    for (const [taskId, result] of Object.entries(day.quizScores)) { requireValue(id(taskId)); score(result); }
    if (day.mood !== undefined) requireValue(MOODS.includes(day.mood));
    if (day.moodNote !== undefined) requireValue(text(day.moodNote, 160, true));
    if (day.focusMinutes !== undefined) requireValue(integer(day.focusMinutes, 0, 240));
  }
  requireValue(Array.isArray(state.garden) && state.garden.length <= 45);
  const occupied = new Set();
  for (const plant of state.garden) {
    requireValue(isRecord(plant) && id(plant.id) &&
      ['sun-bloom', 'leaf-guard', 'water-bud', 'star-fruit'].includes(plant.plantId) &&
      integer(plant.row, 0, 4) && integer(plant.column, 0, 8) && timestamp(plant.plantedAt));
    const cell = `${plant.row}:${plant.column}`;
    requireValue(!occupied.has(cell));
    occupied.add(cell);
  }
  requireValue(Array.isArray(state.redemptions) && state.redemptions.length <= 100);
  for (const reward of state.redemptions) {
    requireValue(isRecord(reward) && id(reward.id) && id(reward.rewardId) &&
      text(reward.title, 200) && integer(reward.cost, 0, 10000) && timestamp(reward.redeemedAt));
  }
  // Only protocol fields are persisted or returned, not arbitrary request properties.
  return {
    schemaVersion: 1, version: state.version, childName: state.childName,
    vacationStart: state.vacationStart, vacationEnd: state.vacationEnd, tasks: state.tasks,
    days: state.days, sun: state.sun, garden: state.garden, redemptions: state.redemptions,
    appliedActionIds: state.appliedActionIds, updatedAt: state.updatedAt,
  };
}

export function mutationInput(value: unknown): SummerMutation {
  requireValue(isRecord(value) && id(value.id) && date(value.date) && TYPES.includes(String(value.type)));
  const mutation = { id: value.id, date: value.date, type: value.type } as SummerMutation;
  if (value.type === 'complete-task') {
    requireValue(id(value.taskId));
    mutation.taskId = value.taskId;
    if (value.score !== undefined) { score(value.score); mutation.score = value.score as SummerMutation['score']; }
  } else if (value.type === 'plant') {
    requireValue(['sun-bloom', 'leaf-guard', 'water-bud', 'star-fruit'].includes(String(value.plantId)) &&
      integer(value.row, 0, 4) && integer(value.column, 0, 8));
    Object.assign(mutation, { plantId: value.plantId, row: value.row, column: value.column });
  } else if (value.type === 'redeem') {
    requireValue(['defeat-monster', 'skip-card', 'game-time', 'playground'].includes(String(value.rewardId)));
    mutation.rewardId = value.rewardId as string;
  } else if (value.type === 'log-focus') {
    requireValue(integer(value.minutes, 1, 120));
    mutation.minutes = value.minutes as number;
  } else if (value.type === 'save-check-in') {
    requireValue(MOODS.includes(String(value.mood)) && (value.note === undefined || text(value.note, 160, true)));
    Object.assign(mutation, { mood: value.mood, ...(value.note === undefined ? {} : { note: value.note }) });
  } else {
    requireValue(['childName', 'vacationStart', 'vacationEnd', 'tasks'].some(key => value[key] !== undefined));
    if (value.childName !== undefined) { requireValue(text(value.childName, 100)); mutation.childName = value.childName; }
    if (value.vacationStart !== undefined) { requireValue(date(value.vacationStart)); mutation.vacationStart = value.vacationStart; }
    if (value.vacationEnd !== undefined) { requireValue(date(value.vacationEnd)); mutation.vacationEnd = value.vacationEnd; }
    if (value.tasks !== undefined) { tasks(value.tasks); mutation.tasks = value.tasks; }
  }
  return mutation;
}

export async function boundedJSON(message: Request | Response): Promise<unknown> {
  const length = Number(message.headers.get('content-length') || 0);
  if (length > MAX_JSON_BYTES) throw new APIError(413, 'PAYLOAD_TOO_LARGE', 'Workspace data exceeds the size limit.');
  if (!message.body) throw new APIError(400, 'INVALID_JSON', 'A JSON object is required.');
  const reader = message.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new APIError(413, 'PAYLOAD_TOO_LARGE', 'Workspace data exceeds the size limit.');
      }
      chunks.push(part.value);
    }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(bytes);
  let position = 0;
  for (const chunk of chunks) { all.set(chunk, position); position += chunk.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all)); }
  catch { throw new APIError(400, 'INVALID_JSON', 'The request must contain valid JSON.'); }
}

export function serializeState(state: SummerWorkspaceState) {
  const serialized = JSON.stringify(state);
  if (new TextEncoder().encode(serialized).byteLength > MAX_JSON_BYTES) {
    throw new APIError(413, 'WORKSPACE_TOO_LARGE', 'Workspace storage limit reached.');
  }
  return serialized;
}
