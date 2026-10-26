import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const enabled = process.env.CULTURE_BROWSER_TEST === '1';
const cli = process.env.CULTURE_PLAYWRIGHT_CLI || join(homedir(), '.codex/skills/playwright/scripts/playwright_cli.sh');
const base = process.env.CULTURE_BASE_URL || 'http://127.0.0.1:8888/';

test('culture browser: four complete reading/practice/review journeys, restoration, device states and responsive layouts', { skip: !enabled, timeout: 240000 }, () => {
  assert.ok(existsSync(cli), 'Set CULTURE_PLAYWRIGHT_CLI to the Playwright CLI wrapper.');
  const output = mkdtempSync(join(tmpdir(), 'exbeam-culture-'));
  const session = `culture-qa-${process.pid}`;
  const call = (...args) => {
    const result = spawnSync(cli, [`-s=${session}`, ...args], { cwd: output, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /### Error/);
    return result.stdout;
  };
  try {
    call('open', `${base}?module=e5`, '--headed');
    const result = call('run-code', `async (page) => {
      const check = (condition, message) => { if (!condition) throw new Error(message); };
      const report = [];
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const modules = [['poetry', 'e5'], ['sanzijing', 'e20'], ['qianziwen', 'e21'], ['idiom', 'u3']];
      for (const [id, route] of modules) {
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(${JSON.stringify(base)} + '?module=' + route);
        await page.locator('.culture-workspace').waitFor();
        const data = await page.evaluate(async id => {
          const { CULTURE_BOOKS } = await import('/lib/cultureContent.ts');
          const { questionsForUnit } = await import('/lib/culturePractice.ts');
          const book = CULTURE_BOOKS[id];
          return { unit: book.units[0], questions: questionsForUnit(book, book.units[0]), count: book.units.length, original: book.original || null };
        }, id);
        const key = 'exbeam.culture.' + id + '.v3';
        const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
        const region = page.locator('.culture-workspace');
        check(await region.locator('.culture-items li').count() === data.count, id + ': full catalog');
        await region.getByRole('button', { name: '收藏本篇', exact: true }).click();
        await region.getByRole('textbox', { name: '我的理解', exact: true }).fill('观察原文后，我记下了自己的理解。');
        await region.getByRole('button', { name: '记入探索', exact: true }).click();
        await region.getByRole('searchbox', { name: '搜索内容', exact: true }).fill('没有这一项zzzz');
        check(await region.locator('.culture-main .wb-empty').count() === 1, id + ': empty result');
        await region.getByRole('button', { name: '重置筛选', exact: true }).first().click();
        await region.getByRole('combobox', { name: '书架', exact: true }).selectOption('saved');
        check(await region.locator('.culture-items li').count() === 1, id + ': saved shelf');
        await region.getByRole('combobox', { name: '书架', exact: true }).selectOption('unread');
        await region.getByRole('button', { name: '开始练习', exact: true }).click();
        await region.getByRole('button', { name: '候选 1：' + data.questions[0].tokens[0], exact: true }).click();
        await page.reload();
        await page.locator('.culture-order').waitFor();
        check((await state()).draft.order.length === 1, id + ': partial ordering restored');
        const recall = data.questions.find(q => q.kind === 'text');
        await region.getByRole('combobox', { name: '练习题型', exact: true }).selectOption(recall.id);
        await region.getByRole('textbox', { name: '练习答案', exact: true }).fill('错');
        await region.getByRole('button', { name: '核对答案', exact: true }).click();
        await region.locator('.culture-feedback.is-correction').waitFor();
        check((await state()).credits.length === 0, id + ': error cannot score');
        await region.getByRole('button', { name: /^复习/ }).click();
        await region.getByRole('textbox', { name: '练习答案', exact: true }).fill(recall.answer);
        await region.getByRole('button', { name: '核对答案', exact: true }).click();
        await region.locator('.culture-feedback.is-correct').waitFor();
        check((await state()).credits.length === 1, id + ': independent correction earns credit');
        check((await state()).read.includes(data.unit.id), id + ': correction synchronizes reading');
        await region.getByRole('button', { name: '下一题 / 完成复习', exact: true }).click();
        await region.locator('.culture-main .wb-empty').waitFor();
        await region.getByRole('button', { name: '阅读', exact: true }).click();
        await region.getByRole('combobox', { name: '书架', exact: true }).selectOption('saved');
        await region.getByRole('combobox', { name: '书架', exact: true }).selectOption('all');
        const selected = await state();
        check(selected.saved.includes(data.unit.id), id + ': bookmark retained');
        check(selected.notes[data.unit.id].includes('自己的理解'), id + ': note retained');
        const main = region.locator('.culture-main');
        await main.screenshot({ path: ${JSON.stringify(output)} + '/' + id + '-desktop.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        await main.screenshot({ path: ${JSON.stringify(output)} + '/' + id + '-mobile.png' });
        await region.locator('.wb-content').evaluate(el => { el.scrollTop = 0; });
        check(await region.locator('.culture-library').isHidden(), id + ': directory collapsed by default');
        const firstScreen = await region.evaluate(el => {
          const area = el.querySelector('.wb-content').getBoundingClientRect();
          const header = el.querySelector('.wb-header').getBoundingClientRect();
          const footer = el.querySelector('.wb-status').getBoundingClientRect();
          const text = el.querySelector('.culture-text-poetry p,.culture-character-line').getBoundingClientRect();
          return { height: area.height, textTop: text.top, textBottom: text.bottom, bottom: area.bottom, boundary: area.top >= header.bottom - 1 && area.bottom <= footer.top + 1 };
        });
        check(firstScreen.height > 200 && firstScreen.boundary, id + ': scroll area and fixed header/footer');
        check(firstScreen.textTop < firstScreen.bottom && firstScreen.textBottom <= firstScreen.bottom, id + ': original content visible in first screen');
        await page.screenshot({ path: ${JSON.stringify(output)} + '/' + id + '-mobile-first-screen.png' });
        await region.getByRole('button', { name: '目录', exact: true }).click();
        check(await region.locator('.culture-library').isVisible(), id + ': mobile directory opens');
        await region.getByRole('button', { name: '目录', exact: true }).click();
        for (const width of [390, 320]) {
          await page.setViewportSize({ width, height: 844 });
          const overflow = await region.evaluate(el => Array.from(el.querySelectorAll('.culture-summary,.culture-main,.culture-reading-header,.culture-character-line')).filter(node => {
            const rect = node.getBoundingClientRect(); return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
          }).map(node => node.className));
          check(overflow.length === 0, id + ': layout overflow ' + width + ': ' + overflow.join(','));
        }
        await page.setViewportSize({ width: 1280, height: 900 });
        const voice = region.getByRole('button', { name: '朗读原文', exact: true });
        if (await voice.count() && await voice.isEnabled()) {
          await voice.click();
          await region.getByRole('button', { name: '练习', exact: true }).click();
          await page.waitForFunction(() => !window.speechSynthesis.speaking);
        } else await region.getByRole('button', { name: '练习', exact: true }).click();
        for (const question of data.questions) {
          await region.getByRole('combobox', { name: '练习题型', exact: true }).selectOption(question.id);
          const before = await state();
          if (before.draft.result) {
            await region.getByRole('combobox', { name: '练习题型', exact: true }).selectOption(data.questions.find(q => q.id !== question.id).id);
            await region.getByRole('combobox', { name: '练习题型', exact: true }).selectOption(question.id);
          }
          if (question.kind === 'order') for (let i = 0; i < question.tokens.length; i++) {
            await region.getByRole('button', { name: '候选 ' + (i + 1) + '：' + question.tokens[i], exact: true }).click();
          }
          else if (question.kind === 'text') await region.getByRole('textbox', { name: '练习答案', exact: true }).fill(question.answer);
          else await region.getByRole('radio', { name: question.answer, exact: false }).check();
          await region.getByRole('button', { name: '核对答案', exact: true }).click();
          await region.locator('.culture-feedback.is-correct').waitFor();
        }
        const completed = await state();
        check(completed.credits.length === 4, id + ': four unique credits, no duplicate credit on replay');
        const evidence = await page.evaluate(route => JSON.parse(localStorage.getItem('exbeam.explorer.v2')).discoveries.filter(item => item.moduleId === route), route);
        check(evidence.filter(item => item.kind === 'challenge').length === 4, id + ': actual onDiscover evidence');
        check(evidence.some(item => item.kind === 'note' && item.detail.includes('自己的理解')), id + ': actual note evidence');
        await region.getByRole('button', { name: '回到原文', exact: true }).click();
        await region.getByText('内容来源与收录范围', { exact: true }).click();
        check((await region.locator('.culture-source').innerText()).includes('本地'), id + ': transparent source');
        await page.reload();
        await page.locator('.culture-workspace').waitFor();
        const restored = await state();
        check(restored.credits.length === 4 && restored.saved.includes(data.unit.id), id + ': persisted completion');
        check(await region.locator('.culture-summary img').evaluate(img => img.complete && img.naturalWidth > 0), id + ': cover rendered');
        if (data.original) {
          await region.getByRole('button', { name: /^完整原文/ }).click();
          check(await region.locator('.culture-original-lines > li').count() === 10, id + ': original first page');
          const last = data.original.paragraphs[data.original.paragraphs.length - 1];
          const query = last.simplified.replace(/[\\s，。；、：？！,.!?;:]/g, '').slice(-4);
          await region.getByRole('searchbox', { name: '搜索完整原文', exact: true }).fill(query);
          check((await region.locator('.culture-original-lines').innerText()).includes(last.text), id + ': full text searchable through final line');
          await region.getByRole('button', { name: '收藏第 ' + last.index + ' 行', exact: true }).click();
          await region.getByRole('button', { name: '本页已读', exact: true }).click();
          await region.getByRole('combobox', { name: '原文字形', exact: true }).selectOption('simplified');
          await page.reload();
          await page.locator('.culture-original-lines').waitFor();
          let full = await state();
          check(full.readingScope === 'original' && full.original.query === query && full.original.script === 'simplified', id + ': original scope/query/script restoration');
          check(full.original.saved.includes(last.id) && full.original.read.includes(last.id) && full.credits.length === 4, id + ': original bookmarks/read records separate from exercise credits');
          await region.getByRole('searchbox', { name: '搜索完整原文', exact: true }).fill('');
          const start = Math.floor((data.original.paragraphs.length - 1) / 10) * 10 + 1;
          await region.getByRole('button', { name: new RegExp('第 ' + start + '–' + last.index + ' 行') }).click();
          check((await region.locator('.culture-original-lines').innerText()).includes(last.simplified), id + ': final page reachable');
          await page.reload();
          await page.locator('.culture-original-lines').waitFor();
          full = await state();
          check(full.original.page === Math.floor((last.index - 1) / 10), id + ': original page restored');
          await page.setViewportSize({ width: 390, height: 844 });
          await region.locator('.wb-content').evaluate(el => { el.scrollTop = 0; });
          await page.screenshot({ path: ${JSON.stringify(output)} + '/' + id + '-complete-original-mobile.png' });
          check(await region.locator('.culture-library').isHidden(), id + ': full-original directory collapsed');
          await page.setViewportSize({ width: 1280, height: 900 });
        }
        report.push({ id, catalog: data.count, challenges: completed.credits.length, note: true, restored: true, viewports: [1280, 390, 320] });
      }
      await page.addInitScript(() => {
        Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
        Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage disabled for QA'); } });
      });
      await page.goto(${JSON.stringify(base)} + '?module=e21');
      await page.locator('.culture-workspace').waitFor();
      check(await page.getByText('当前设备不支持语音朗读', { exact: true }).count() > 0, 'unsupported speech status');
      check(await page.locator('.culture-workspace .wb-notice.is-error').count() === 1, 'unavailable storage status');
      check(errors.length === 0, 'browser errors: ' + errors.join('; '));
      return { report, deviceFallbacks: true, browserErrors: errors, screenshots: ${JSON.stringify(output)} };
    }`);
    console.log(result.replace(/### Ran Playwright code[\s\S]*?(?=### Page|$)/, ''));
  } finally {
    call('close');
  }
});
