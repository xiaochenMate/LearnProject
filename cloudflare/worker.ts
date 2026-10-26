import { dataStatus, library } from './library';
import { summerWorkspace } from './summer';
import { APIError, primary } from './types';
import type { Env } from './types';

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function secure(response: Response, api: boolean, https: boolean) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  if (https) headers.set('Strict-Transport-Security', 'max-age=31536000');
  if (api) {
    headers.set('Cache-Control', 'no-store');
    headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    headers.set('Vary', 'Origin, Sec-Fetch-Site');
    for (const key of Array.from(headers.keys())) if (key.startsWith('access-control-')) headers.delete(key);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const site = request.headers.get('sec-fetch-site');
  if ((origin !== null && origin !== new URL(request.url).origin) ||
      (site !== null && site !== 'same-origin' && site !== 'none') ||
      (request.method === 'POST' && origin !== new URL(request.url).origin)) {
    throw new APIError(403, 'ORIGIN_FORBIDDEN', 'API access requires the same origin.');
  }
}

function method(request: Request, allowed: string[]) {
  if (!allowed.includes(request.method)) {
    throw new APIError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.', {}, { Allow: allowed.join(', ') });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const api = url.pathname === '/api' || url.pathname.startsWith('/api/');
    let response: Response;
    try {
      if (url.hostname === 'www.exbeam.com' && (request.method === 'GET' || request.method === 'HEAD')) {
        const canonical = new URL('https://exbeam.com');
        canonical.pathname = url.pathname;
        canonical.search = url.search;
        response = new Response(null, { status: 308, headers: { Location: canonical.href } });
      } else if (!api) {
        response = await env.ASSETS.fetch(request);
      } else {
        assertSameOrigin(request);
        if (url.pathname === '/api/health') {
          method(request, ['GET']);
          const probe = await primary(env.DB).prepare('SELECT 1 AS ok').first<{ ok: number }>();
          if (probe?.ok !== 1) throw new Error('Database probe failed');
          response = Response.json({ ok: true, release: env.EXBEAM_RELEASE || null, database: { connected: true } });
        } else if (url.pathname === '/api/data-status') {
          method(request, ['GET']);
          response = Response.json(await dataStatus(env));
        } else if (url.pathname.startsWith('/api/library/')) {
          method(request, ['GET']);
          response = Response.json(await library(url, env));
        } else if (url.pathname === '/api/summer-workspace') {
          method(request, ['GET', 'POST']);
          if (request.method === 'POST' && !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) {
            throw new APIError(415, 'JSON_REQUIRED', 'Content-Type must be application/json.');
          }
          const result = await summerWorkspace(request, env);
          response = Response.json(result.body, { status: result.status || 200 });
        } else throw new APIError(404, 'NOT_FOUND', 'Unknown API route.');
      }
    } catch (error) {
      response = error instanceof APIError
        ? Response.json({ error: error.message, code: error.code, ...error.details }, { status: error.status, headers: error.headers })
        : Response.json({ error: 'Service temporarily unavailable.', code: 'SERVICE_UNAVAILABLE', ok: false }, { status: 503 });
    }
    return secure(response, api, url.protocol === 'https:');
  },
};
