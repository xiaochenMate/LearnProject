import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'vite';

const enabled = process.env.CONTENT_LIBRARY_BROWSER_TEST === '1';
const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = process.env.CONTENT_LIBRARY_PLAYWRIGHT_CLI || join(homedir(), '.codex/skills/playwright/scripts/playwright_cli.sh');

test('mock browser: culture entry, paging/search/reading, cancellation, retry, offline return and mobile dialog', { skip: !enabled, timeout: 180000 }, async t => {
  assert.ok(existsSync(cli), 'Set CONTENT_LIBRARY_PLAYWRIGHT_CLI to an installed Playwright CLI wrapper.');
  const output = mkdtempSync(join(tmpdir(), 'exbeam-content-library-'));
  const session = `content-library-${process.pid}`;
  const harness = join(root, '__content_library_harness__.tsx');
  const server = await createServer({
    root, configFile: false, envDir: false, cacheDir: join(output, 'vite-cache'),
    server: { host: '127.0.0.1', port: 4180, strictPort: false, hmr: false },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'lucide-react'] },
    plugins: [{
      name: 'content-library-mock-harness',
      resolveId(id) { if (id === '/__content_library_harness__.tsx') return harness; },
      load(id) {
        if (id === harness) return `
          import React from 'react';
          import { createRoot } from 'react-dom/client';
          import { CultureWorkspace } from '/lib/cultureUI.tsx';
          import { CULTURE_BOOKS } from '/lib/cultureContent.ts';
          const id = new URLSearchParams(location.search).get('book') || 'idiom';
          createRoot(document.getElementById('root')).render(<React.StrictMode><CultureWorkspace book={CULTURE_BOOKS[id]} onClose={() => {}} /></React.StrictMode>);
        `;
      },
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith('/__content_library_test__')) return next();
          res.setHeader('content-type', 'text/html');
          res.end(await vite.transformIndexHtml(req.url, '<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}#root{height:100dvh}</style></head><body><div id="root"></div><script type="module" src="/__content_library_harness__.tsx"></script></body></html>'));
        });
      },
    }],
  });
  const call = async (...args) => {
    const result = await promisify(execFile)(cli, [`--session=${session}`, ...args], {
      cwd: output, timeout: 150000, maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, npm_config_offline: 'true', npm_config_update_notifier: 'false' },
    });
    assert.doesNotMatch(result.stdout, /### Error/, result.stdout + result.stderr);
    return result.stdout;
  };
  try {
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}/__content_library_test__`;
    await call('open', base, '--headed');
    await call('snapshot');
    const result = await call('run-code', `async (page) => {
      const check = (value, label) => { if (!value) throw new Error(label); };
      const requests = [];
      const external = [];
      const errors = [];
      let retryWorks = false;
      let slowStarted;
      let slowFinished;
      const started = new Promise(resolve => { slowStarted = resolve; });
      const finished = new Promise(resolve => { slowFinished = resolve; });
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== new URL(${JSON.stringify(base)}).origin) { external.push(url.href); return route.abort(); }
        if (!url.pathname.startsWith('/api/library/')) return route.continue();
        const collection = url.pathname.split('/').at(-1);
        const q = url.searchParams.get('q');
        const offset = Number(url.searchParams.get('offset'));
        check(url.searchParams.get('limit') === '24', 'Unbounded page request');
        check(route.request().method() === 'GET', 'Unexpected write request');
        requests.push({ collection, q, offset });
        if (q === '断网') return route.abort('internetdisconnected');
        if (q === '错误' && !retryWorks) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'private upstream detail' }) });
        if (q === '慢') { slowStarted(); await new Promise(resolve => setTimeout(resolve, 650)); }
        const totals = { idioms: 30895, poems: 70, sanzijing: 61, vocabulary: 225, categories: 8, 'brain-teasers': 35 };
        const total = q === '空结果' ? 0 : q ? 1 : totals[collection];
        const items = Array.from({ length: Math.min(24, Math.max(0, total - offset)) }, (_, i) => {
          const id = offset + i + 1;
          if (collection === 'idioms') return { id, word: q === '新' ? '最新结果' : q === '慢' ? '迟到的旧结果' : q === '错误' ? '重试恢复' : id === 1 ? '学以致用' : '云端成语' + id, pinyin: 'xué yǐ zhì yòng', explanation: '释义 <img src="https://unsafe.invalid/x.jpg">', example: '源库例句', derivation: 'mock典籍出处', image_url: 'https://unsafe.invalid/x.jpg' };
          if (collection === 'poems') return { id, title: '云端诗作' + id, author: '李白', dynasty: '唐', lines: ['床前明月光', '疑是地上霜'], meaning: '源库诗意', source: 'mock诗词出处' };
          if (collection === 'sanzijing') return { id, content_raw: '人之初，性本善。', content_chars: ['人','之','初','性','本','善'], content_pinyin: ['rén','zhī','chū','xìng','běn','shàn'], translation_vernacular: '源库白话译文', interpretation_deep: '源库深入解读', allusion_title: '典故题名', allusion_context: '典故背景', allusion_source: 'mock孟子出处' };
          if (collection === 'vocabulary') return { id, word: 'orbit' + id, phonetic: '/orbit/', definition: '轨道', example: 'In orbit.', translation: '在轨道上。' };
          if (collection === 'categories') return { id, name: '自然' + id, description: '分类说明' };
          return { id, question: '思维题' + id, answer: '答案内容', explanation: '解析内容' };
        });
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items, limit: 24, offset, total, hasMore: offset + items.length < total }) }).catch(() => {});
        if (q === '慢') slowFinished();
      });
      await page.goto(${JSON.stringify(base)});
      await page.locator('.culture-workspace').waitFor();
      const stored = () => page.evaluate(() => localStorage.getItem('exbeam.culture.idiom.v3'));
      const before = await stored();
      check(requests.length === 0, 'Opening local content must not load cloud content');
      const entry = page.getByRole('button', { name: '云端资料库', exact: true });
      await entry.click();
      const dialog = page.getByRole('dialog', { name: '云端资料库', exact: true });
      const totalText = () => dialog.locator('.cl-result-heading').innerText();
      await dialog.locator('.cl-results li').first().waitFor();
      check((await totalText()).includes('30,895'), 'Server total not shown');
      check(await dialog.locator('.cl-results li').count() === 24, 'Must render only one page');
      await dialog.locator('.cl-results li button').first().click();
      check((await dialog.getByRole('article', { name: '条目精读' }).innerText()).includes('mock典籍出处'), 'Idiom source missing');
      check(await dialog.locator('img').count() === 0, 'Remote image or HTML was rendered');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.screenshot({ path: ${JSON.stringify(join(output, 'desktop.png'))} });
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        check(await dialog.locator('.cl-results').isHidden(), 'Mobile reader must hide the list');
        check(await dialog.getByRole('button', { name: '返回条目', exact: true }).isVisible(), 'Mobile back action missing');
        const bad = await dialog.evaluate(el => [...el.querySelectorAll('.wb-header,.cl-searchbar,.cl-reader,.cl-pagination,input,select,h3')].filter(node => { const rect = node.getBoundingClientRect(); return rect.width && (rect.left < -1 || rect.right > innerWidth + 1 || node.scrollWidth > node.clientWidth + 2); }).map(node => node.className));
        check(!bad.length, 'Mobile overflow at ' + width + ': ' + bad.join(','));
        await page.screenshot({ path: ${JSON.stringify(output)} + '/mobile-' + width + '.png' });
      }
      await dialog.getByRole('button', { name: '返回条目', exact: true }).click();
      check(await dialog.locator('.cl-results').isVisible(), 'Mobile list did not return');
      await dialog.getByRole('button', { name: '下一页', exact: true }).click();
      await dialog.getByText('云端成语25', { exact: true }).waitFor();
      check(requests.at(-1).offset === 24, 'Pagination offset incorrect');
      await dialog.getByRole('button', { name: '上一页', exact: true }).click();
      await dialog.getByText('学以致用', { exact: true }).waitFor();
      const search = dialog.getByRole('searchbox');
      await search.fill('a'); await search.fill('ab'); await search.fill('新');
      await dialog.getByText('最新结果', { exact: true }).waitFor();
      check(!requests.some(item => item.q === 'a' || item.q === 'ab'), 'Search not debounced');
      await search.fill('慢'); await started;
      await search.fill('新');
      await dialog.getByText('最新结果', { exact: true }).waitFor();
      await finished;
      check(!(await dialog.innerText()).includes('迟到的旧结果'), 'Stale result replaced current search');
      await search.fill('空结果');
      await dialog.getByText('没有匹配的内容', { exact: true }).waitFor();
      check((await totalText()).includes('0'), 'Empty total must come from server');
      await dialog.getByRole('button', { name: '查看全部', exact: true }).click();
      await dialog.locator('.cl-results li').first().waitFor();
      await search.fill('错误');
      await dialog.getByRole('alert').waitFor();
      check(!(await totalText()).includes('30,895'), 'Stale total shown after failure');
      check(!(await dialog.innerText()).includes('private upstream'), 'Server error detail exposed');
      retryWorks = true;
      await dialog.getByRole('button', { name: '重试', exact: true }).click();
      await dialog.getByText('重试恢复', { exact: true }).waitFor();
      const select = dialog.getByRole('combobox', { name: '资料分类', exact: true });
      for (const [collection, total] of [['poems', '70'], ['sanzijing', '61'], ['vocabulary', '225'], ['categories', '8'], ['brain-teasers', '35']]) {
        await select.selectOption(collection);
        await dialog.locator('.cl-results li').first().waitFor();
        check((await totalText()).includes(total), collection + ': wrong server total');
        check(requests.at(-1).q === '' && requests.at(-1).offset === 0, 'Collection switch must reset search/page');
        await dialog.locator('.cl-results li button').first().click();
        if (collection === 'sanzijing') {
          check(await dialog.locator('ruby').count() === 6, 'Character/pinyin reading missing');
          check(await dialog.locator('.cl-character-line').count() === 2, 'Three-character phrases must stay grouped');
          check((await dialog.locator('.cl-reader').innerText()).includes('mock孟子出处'), 'Sanzijing source missing');
          await page.screenshot({ path: ${JSON.stringify(join(output, 'sanzijing-mobile.png'))} });
        }
        if (collection === 'poems') check((await dialog.locator('.cl-reader').innerText()).includes('床前明月光'), 'Poem lines missing');
        if (collection === 'brain-teasers') {
          await dialog.locator('summary').click();
          check((await dialog.locator('details').innerText()).includes('答案内容'), 'Puzzle answer missing');
        }
        await dialog.getByRole('button', { name: '返回条目', exact: true }).click();
      }
      await search.fill('断网');
      await dialog.getByRole('alert').waitFor();
      check((await dialog.locator('.cl-result-heading').innerText()) === '云端内容未载入', 'Offline state must not masquerade as cloud data');
      await dialog.getByRole('button', { name: '返回本地精选', exact: true }).click();
      check(await dialog.count() === 0, 'Offline return did not close dialog');
      check(await stored() === before, 'Cloud browsing changed local practice state');
      check(await entry.evaluate(el => el === document.activeElement), 'Entry focus was not restored');
      await entry.click();
      await dialog.locator('.cl-results li').first().waitFor();
      await dialog.evaluate(el => { const nodes = [...el.querySelectorAll('button:not(:disabled),input,select')]; nodes.at(-1).focus(); });
      await page.keyboard.press('Tab');
      check(await dialog.evaluate(el => el.contains(document.activeElement)), 'Dialog focus escaped');
      await page.keyboard.press('Escape');
      check(await dialog.count() === 0, 'Escape did not close dialog');
      await page.goto(${JSON.stringify(base)} + '?book=qianziwen');
      await page.locator('.culture-workspace').waitFor();
      check(await page.getByRole('button', { name: '云端资料库', exact: true }).count() === 0, 'Thousand Character must not expose a nonexistent cloud source');
      check(external.length === 0, 'Unexpected remote request: ' + external.join(','));
      check(errors.length === 0, 'Browser error: ' + errors.join(','));
      return { ok: true, requests: requests.length, desktop: '1280x900', mobile: ['390x844','320x844'], screenshots: ${JSON.stringify(output)} };
    }`);
    const report = result.match(/^### Result\r?\n([^\r\n]+)/m);
    assert.ok(report, result);
    const summary = JSON.parse(report[1]);
    assert.equal(summary.ok, true);
    t.diagnostic(JSON.stringify(summary));
    t.diagnostic(`Screenshots: ${output}`);
  } finally {
    await call('close').catch(() => {});
    await server.close();
  }
});
