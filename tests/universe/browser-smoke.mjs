async (page) => {
  const report = { desktop: [], mobile: [], errors: [] };
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const frames = (p, count = 90) => p.evaluate((count) => new Promise((resolve) => {
    let frame = 0;
    const next = () => ++frame >= count ? resolve(true) : requestAnimationFrame(next);
    requestAnimationFrame(next);
  }), count);
  const watch = (p) => {
    p.on('pageerror', (error) => report.errors.push(error.message));
    p.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes('/images/')) report.errors.push(`${response.status()}: ${response.url()}`);
    });
  };
  const open = async (p, space, object, overview = false) => {
    await p.goto(`http://127.0.0.1:8888/?module=e1&space=${space}&object=${object}${overview ? '&overview=1' : ''}#explore`);
    await p.locator('.universe-canvas').waitFor();
    await p.locator('.universe-loading').waitFor({ state: 'hidden' });
    assert(await p.locator('.universe-scene-error').count() === 0, `WebGL error in ${space}`);
    await frames(p);
  };
  const pixels = (p) => p.locator('.universe-canvas').evaluate((canvas) => new Promise((resolve) => requestAnimationFrame(() => {
    const gl = canvas.getContext('webgl2');
    const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const rgba = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    let bright = 0, sky = 0, hash = 0;
    for (let i = 0; i < rgba.length; i += 16) {
      const x = i / 4 % width, y = Math.floor(i / 4 / width);
      const light = rgba[i] + rgba[i + 1] + rgba[i + 2];
      if (light > 100) bright++;
      if (light > 60 && (x < width * .15 || x > width * .85 || y < height * .15 || y > height * .85)) sky++;
      hash = (hash * 31 + rgba[i] + rgba[i + 1] * 3 + rgba[i + 2] * 7) >>> 0;
    }
    resolve({ width, height, bright, sky, hash });
  })));
  const pause = async (p) => {
    const button = p.getByRole('button', { name: '暂停演示', exact: true });
    if (await button.count()) await button.click();
    await frames(p, 100);
  };
  watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, 'solar-system', 'earth', true);
  assert(await page.locator('.universe-label').count() === 20, 'Solar map must contain 9 primary bodies and 11 moons');
  await pause(page);
  const solarPixels = await pixels(page);
  assert(solarPixels.bright > 100 && solarPixels.sky > 10, 'Solar scene or star field is blank');
  await page.screenshot({ path: 'output/playwright/realistic-solar-desktop.png' });
  report.desktop.push({ scene: 'solar', pixels: solarPixels });

  await page.getByRole('button', { name: '重新定位地球', exact: true }).click();
  await frames(page, 120);
  await page.screenshot({ path: 'output/playwright/realistic-earth-desktop.png' });
  await page.getByRole('button', { name: '定位月球', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.universe-app')?.dataset.context === 'earth');
  assert(await page.locator('.universe-app').getAttribute('data-selected') === 'moon', 'Moon label tap did not select the Moon');
  report.desktop.push({ scene: 'earth', moonLabelClick: true });

  for (const [parent, count] of [['mars', 3], ['jupiter', 5], ['saturn', 3], ['uranus', 2], ['neptune', 2]]) {
    await open(page, parent, parent, true);
    await pause(page);
    const pixel = await pixels(page);
    assert(await page.locator('.universe-label').count() === count, `${parent} companions missing`);
    assert(pixel.bright > 30 && pixel.sky > 10, `${parent} scene is blank`);
    report.desktop.push({ scene: parent, count, pixels: pixel });
    if (parent === 'jupiter' || parent === 'saturn') await page.screenshot({ path: `output/playwright/realistic-${parent}-desktop.png` });
  }
  await open(page, 'jupiter', 'jupiter', true);
  await pause(page);
  const systemTime = await page.locator('.universe-time-controls time').getAttribute('datetime');
  await page.locator('.universe-catalog button').filter({ hasText: '木卫三' }).click();
  assert(await page.locator('.universe-app').getAttribute('data-selected') === 'ganymede', 'Ganymede catalogue selection failed');
  await page.getByRole('button', { name: '近距离观察木卫三', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.universe-app')?.dataset.context === 'detail:ganymede');
  await frames(page);
  assert(await page.locator('.universe-time-controls time').getAttribute('datetime') === systemTime, 'Navigation reset the simulation clock');
  const fixedTime = await page.locator('.universe-time-controls time').getAttribute('datetime');
  const still = await pixels(page);
  await frames(page, 45);
  assert(await page.locator('.universe-time-controls time').getAttribute('datetime') === fixedTime, 'Paused clock advanced');
  assert((await pixels(page)).hash === still.hash, 'Paused scene continued moving');
  await page.getByRole('button', { name: '回到当前时间', exact: true }).click();
  await frames(page, 5);
  const reset = Date.parse(await page.locator('.universe-time-controls time').getAttribute('datetime'));
  assert(Math.abs(reset - Date.now()) < 6000, 'Return-to-now failed');
  await page.getByRole('combobox', { name: '时间流速' }).selectOption('1');
  await page.getByRole('button', { name: '继续演示', exact: true }).click();
  await frames(page, 45);
  assert(Date.parse(await page.locator('.universe-time-controls time').getAttribute('datetime')) - reset > 6 * 3600000, 'Time rate had no effect');
  assert((await pixels(page)).hash !== still.hash, 'Playback did not change the rendering');
  await page.screenshot({ path: 'output/playwright/realistic-ganymede-desktop.png' });
  report.desktop.push({ scene: 'ganymede', closeup: true, pausedClockAndPixels: true, rateAndReset: true });

  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await context.newPage();
  watch(mobile);
  try {
    await open(mobile, 'solar-system', 'earth');
    await pause(mobile);
    await mobile.screenshot({ path: 'output/playwright/realistic-earth-mobile.png' });
    assert(await mobile.getByRole('button', { name: '定位月球', exact: true }).isVisible(), 'Moon clipped in portrait framing');
    const viewport = await mobile.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, scale: visualViewport.scale }));
    assert(viewport.width === viewport.scrollWidth && viewport.scale === 1, 'Mobile layout overflow');
    const pixel = await pixels(mobile);
    assert(pixel.bright > 100 && pixel.sky > 10, 'Mobile canvas is blank');
    await mobile.getByRole('button', { name: '定位月球', exact: true }).tap();
    await mobile.waitForFunction(() => document.querySelector('.universe-app')?.dataset.context === 'earth');
    assert(await mobile.locator('.universe-app').getAttribute('data-selected') === 'moon', 'Touch selection failed');
    report.mobile.push({ scene: 'earth', viewport, pixels: pixel, moonTouch: true });
    await open(mobile, 'jupiter', 'jupiter', true);
    await pause(mobile);
    await mobile.screenshot({ path: 'output/playwright/realistic-jupiter-mobile.png' });
    assert(await mobile.locator('.universe-label').count() === 5, 'Mobile Jupiter companions missing');
    report.mobile.push({ scene: 'jupiter', pixels: await pixels(mobile) });
  } finally {
    await context.close();
  }
  assert(report.errors.length === 0, report.errors.join('\n'));
  return report;
}
