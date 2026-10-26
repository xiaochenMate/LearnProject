const tables = new Set(['brain_teasers', 'idioms', 'poems', 'portal_favorites', 'portal_users', 'sanzijing_verses', 'vocab_categories', 'vocab_words', 'vocab_progress', 'migration_manifest', 'family_workspaces']);
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

async function authorized(request, expected) {
  if (!expected || expected.length < 40) return false;
  const actual = request.headers.get('Authorization') || '';
  const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const a = await digest(actual), b = await digest(`Bearer ${expected}`);
  return a.reduce((different, byte, index) => different | (byte ^ b[index]), 0) === 0;
}

export default {
  async fetch(request, env) {
    if (request.method !== 'POST' || !(await authorized(request, env.TRANSFER_TOKEN))) return json({ error: 'Not found' }, 404);
    try {
      if (Number(request.headers.get('Content-Length')) > 2_000_000) return json({ error: 'Payload too large' }, 413);
      const text = await request.text();
      if (text.length > 2_000_000) return json({ error: 'Payload too large' }, 413);
      const body = JSON.parse(text);
      const route = new URL(request.url).pathname.replace(/^\/__exbeam_transfer/, '');
      if (route === '/cleanup-qa') {
        if (!Array.isArray(body.codes) || body.codes.length > 10 || !body.codes.every(code => /^QA[A-HJ-NP-Z2-9]{6}$/.test(code))) return json({ error: 'Invalid QA codes' }, 400);
        const statements = body.codes.map(code => env.DB.prepare("DELETE FROM summer_workspaces WHERE code=? AND json_extract(state_json,'$.childName')='Cloudflare migration QA'").bind(code));
        const results = await env.DB.batch(statements);
        return json({ changedQARowsIncludingReceipts: results.reduce((sum, result) => sum + (result.meta?.changes || 0), 0) });
      }
      if (route === '/execute') {
        if (!Array.isArray(body.statements) || body.statements.length > 100) return json({ error: 'Invalid batch' }, 400);
        const statements = body.statements.map(item => {
          if (typeof item.sql !== 'string' || !/^\s*(CREATE\s+(?:UNIQUE\s+)?(?:TABLE|INDEX|TRIGGER)|INSERT\s+INTO|PRAGMA\s+foreign_key_check)/i.test(item.sql)) throw new Error('Unsupported migration statement');
          return env.DB.prepare(item.sql).bind(...(item.params || []));
        });
        return json({ results: await env.DB.batch(statements) });
      }
      if (route === '/rows') {
        if (!tables.has(body.table) || !Array.isArray(body.columns) || !body.columns.includes('id') || !body.columns.every(c => /^[a-z_]+$/.test(c)) || !Array.isArray(body.rows) || body.rows.length > 200) return json({ error: 'Invalid rows' }, 400);
        const columns = body.columns.map(c => `"${c}"`).join(',');
        const updates = body.columns.filter(c => c !== 'id').map(c => `"${c}"=excluded."${c}"`).join(',');
        const sql = `INSERT INTO "${body.table}" (${columns}) VALUES (${body.columns.map(() => '?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${updates}`;
        const statements = body.rows.map(row => env.DB.prepare(sql).bind(...row));
        const result = await env.DB.batch(statements);
        return json({ table: body.table, rows: result.length, written: result.reduce((sum, r) => sum + (r.meta?.changes || 0), 0) });
      }
      if (route === '/export') {
        if (!tables.has(body.table)) return json({ error: 'Unknown table' }, 400);
        const limit = Math.min(1000, Math.max(1, Number(body.limit) || 100));
        const offset = Math.max(0, Number(body.offset) || 0);
        const rows = await env.DB.prepare(`SELECT * FROM "${body.table}" ORDER BY id LIMIT ? OFFSET ?`).bind(limit, offset).all();
        return json({ rows: rows.results });
      }
      if (route === '/check') {
        const counts = {};
        for (const table of tables) {
          try { counts[table] = (await env.DB.prepare(`SELECT count(*) AS n FROM "${table}"`).first())?.n; } catch { counts[table] = null; }
        }
        const integrity = await env.DB.prepare('PRAGMA quick_check').all();
        const foreignKeys = await env.DB.prepare('PRAGMA foreign_key_check').all();
        return json({ counts, integrity: integrity.results, foreignKeys: foreignKeys.results });
      }
      return json({ error: 'Not found' }, 404);
    } catch {
      return json({ error: 'Transfer request failed; inspect the private client report.' }, 500);
    }
  },
};
