import { getStore } from '@netlify/blobs';
import type { Config, Context } from '@netlify/functions';
import {
  applySummerMutation,
  normalizeSummerWorkspace,
  SummerMutation,
  SummerWorkspaceState,
} from '../../lib/summerWorkspace';

interface StoredWorkspace {
  pinHash: string;
  state: SummerWorkspaceState;
}

const STORE_NAME = 'exbeam-summer-workspaces';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  });

const hashPin = async (pin: string) => {
  const bytes = new TextEncoder().encode(`exbeam-summer:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const normalizeCode = (value: unknown) => String(value || '').trim().toUpperCase();

const readWorkspace = async (code: string) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  return store.get(`workspace/${code}`, { type: 'json' }) as Promise<StoredWorkspace | null>;
};

const writeWorkspace = async (code: string, workspace: StoredWorkspace) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  await store.setJSON(`workspace/${code}`, workspace, {
    metadata: {
      version: workspace.state.version,
      updatedAt: workspace.state.updatedAt,
    },
  });
};

export default async (request: Request, _context: Context) => {
  if (request.method === 'GET') {
    const code = normalizeCode(new URL(request.url).searchParams.get('code'));
    if (!CODE_PATTERN.test(code)) return json({ error: '同步码格式不正确' }, 400);
    const workspace = await readWorkspace(code);
    if (!workspace) return json({ error: '没有找到这个家庭工作台' }, 404);
    return json({ code, state: normalizeSummerWorkspace(workspace.state) });
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: '请求内容格式不正确' }, 400);
  }

  const action = String(payload.action || '');
  const code = normalizeCode(payload.code);
  if (!CODE_PATTERN.test(code)) return json({ error: '同步码格式不正确' }, 400);

  if (action === 'create') {
    const pin = String(payload.pin || '');
    if (!/^\d{4,8}$/.test(pin)) return json({ error: '家长口令需要 4 至 8 位数字' }, 400);
    const existing = await readWorkspace(code);
    if (existing) return json({ error: '这个同步码已经被使用，请换一个' }, 409);
    const state = normalizeSummerWorkspace(payload.state as SummerWorkspaceState);
    await writeWorkspace(code, { pinHash: await hashPin(pin), state });
    return json({ code, state }, 201);
  }

  const workspace = await readWorkspace(code);
  if (!workspace) return json({ error: '没有找到这个家庭工作台' }, 404);

  if (action === 'verify') {
    const valid = workspace.pinHash === await hashPin(String(payload.pin || ''));
    return valid ? json({ valid: true }) : json({ valid: false, error: '家长口令不正确' }, 403);
  }

  if (action !== 'mutate') return json({ error: '不支持的操作' }, 400);

  const mutation = payload.mutation as SummerMutation | undefined;
  const role = payload.role === 'parent' ? 'parent' : 'child';
  if (!mutation?.id || !mutation.type || !mutation.date) {
    return json({ error: '操作内容不完整' }, 400);
  }

  const parentOnly = mutation.type === 'save-config';
  if (parentOnly && role !== 'parent') {
    return json({ error: '只有家长模式可以修改任务' }, 403);
  }
  if (role === 'parent') {
    const valid = workspace.pinHash === await hashPin(String(payload.pin || ''));
    if (!valid) return json({ error: '家长口令不正确' }, 403);
  }

  const nextState = applySummerMutation(workspace.state, mutation);
  await writeWorkspace(code, { ...workspace, state: nextState });
  return json({ code, state: nextState });
};

export const config: Config = {
  path: '/api/summer-workspace',
};
