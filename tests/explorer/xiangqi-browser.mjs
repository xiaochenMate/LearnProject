async (page) => {
  const report = { errors: [], desktop: {}, mobile: {} };
  const ensure = (condition, message) => { if (!condition) throw new Error(message); };
  const key = 'exbeam.xiangqi.match.v3';
  const moves = (p) => p.evaluate((key) => JSON.parse(localStorage.getItem(key) || '{}').moves || [], key);
  const ctx = await page.context().browser().newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await ctx.newPage();
  p.on('pageerror', (error) => report.errors.push(error.message));
  try {
    await p.goto('http://127.0.0.1:8888/?module=ent5#explore');
    await p.getByRole('grid', { name: '中国象棋棋盘' }).waitFor();
    ensure(await p.locator('.xq-square img').count() === 32, 'Initial Xiangqi army incomplete');
    await p.locator('[data-square="e3"]').click(); await p.locator('[data-square="e4"]').click();
    await p.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || '{}').moves?.length === 2, key, { timeout: 20000 });
    report.desktop.workerReply = await moves(p);
    await p.getByRole('button', { name: '悔棋', exact: true }).click();
    ensure((await moves(p)).length === 0, 'Computer undo should return the full turn');
    await p.getByRole('button', { name: '新对局', exact: true }).click();
    await p.getByLabel('对弈模式').selectOption('local'); await p.getByLabel('每方用时').selectOption('0');
    await p.getByRole('button', { name: '开始对局', exact: true }).click();
    await p.locator('[data-square="e3"]').click(); await p.locator('[data-square="e4"]').click();
    await p.locator('[data-square="e6"]').click(); await p.locator('[data-square="e5"]').click();
    const before = await moves(p); ensure(before.length === 2, 'Local moves failed');
    await p.reload(); await p.getByRole('grid', { name: '中国象棋棋盘' }).waitFor();
    ensure(JSON.stringify(await moves(p)) === JSON.stringify(before), 'Saved match lost after reload');
    await p.getByRole('button', { name: '回到开局', exact: true }).click();
    ensure((await p.locator('[data-square="e3"]').getAttribute('aria-label')).includes('兵'), 'Replay did not restore starting position');
    await p.getByRole('button', { name: '返回当前对局', exact: true }).click();
    ensure((await p.locator('[data-square="e4"]').getAttribute('aria-label')).includes('兵'), 'Replay exit lost live position');
    const download = p.waitForEvent('download'); await p.getByRole('button', { name: '导出棋谱', exact: true }).click();
    report.desktop.download = (await download).suggestedFilename();
    await p.getByRole('button', { name: '导入棋谱', exact: true }).click();
    await p.getByLabel('FEN、PGN 或 ExBeam 对局存档').fill('not a valid game');
    await p.getByRole('button', { name: '校验并载入', exact: true }).click();
    ensure(await p.getByRole('alert').isVisible(), 'Invalid imported record should be rejected');
    await p.getByRole('button', { name: '关闭对话框', exact: true }).click();
    await p.getByRole('tab', { name: /训练/ }).click();
    await p.getByRole('button', { name: /双车封宫/ }).click();
    await p.locator('[data-square="f8"]').click(); await p.locator('[data-square="d8"]').click();
    ensure((await p.locator('.xq-state').textContent()).includes('目标达成'), 'Mating training task did not resolve');
    report.desktop.trainingMate = true;
    await p.getByRole('tab', { name: '棋子图鉴', exact: true }).click();
    await p.waitForFunction(() => [...document.querySelectorAll('.xq-piece-entry img')].every((img) => img.complete && img.naturalWidth > 0));
    ensure(await p.locator('.xq-piece-entry img').count() === 14, 'Not all fourteen Xiangqi piece designs are displayed');
    await p.screenshot({ path: 'output/playwright/xiangqi-piece-gallery.png' });
    await p.getByRole('tab', { name: '对局', exact: true }).click();
    await p.screenshot({ path: 'output/playwright/xiangqi-workbench-desktop.png' });
    report.desktop.restored = true;
  } finally { await ctx.close(); }
  const mobileCtx = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await mobileCtx.newPage();
  mobile.on('pageerror', (error) => report.errors.push(error.message));
  try {
    await mobile.goto('http://127.0.0.1:8888/?module=ent5#explore'); await mobile.getByRole('grid').waitFor();
    await mobile.getByRole('button', { name: '新对局', exact: true }).tap();
    await mobile.getByLabel('对弈模式').selectOption('local'); await mobile.getByLabel('每方用时').selectOption('0');
    await mobile.getByRole('button', { name: '开始对局', exact: true }).tap();
    await mobile.locator('[data-square="b2"]').tap(); await mobile.locator('[data-square="e2"]').tap();
    ensure((await moves(mobile))[0] === 'b2e2', 'Touch move failed');
    const layout = await mobile.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, content: document.querySelector('.wb-content').scrollWidth, contentWidth: document.querySelector('.wb-content').clientWidth }));
    ensure(layout.width === layout.scroll && layout.content <= layout.contentWidth + 1, 'Xiangqi mobile overflows horizontally');
    await mobile.screenshot({ path: 'output/playwright/xiangqi-workbench-mobile.png' });
    report.mobile = { layout, touchMove: true };
  } finally { await mobileCtx.close(); }
  ensure(report.errors.length === 0, report.errors.join('\n'));
  return report;
}
