async (page) => {
  const report = { desktop: {}, mobile: {}, errors: [] };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const frames = (p, count = 100) => p.evaluate((count) => new Promise((resolve) => {
    let frame = 0;
    const tick = () => ++frame >= count ? resolve(true) : requestAnimationFrame(tick);
    requestAnimationFrame(tick);
  }), count);
  const pixels = (p) => p.locator('.hero-scene canvas').evaluate((canvas) => new Promise((resolve) => requestAnimationFrame(() => {
    const gl = canvas.getContext('webgl2');
    const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
    const bytes = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    let bright = 0, hash = 0;
    for (let i = 0; i < bytes.length; i += 16) {
      if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 100) bright++;
      hash = (hash * 31 + bytes[i] + bytes[i + 1] * 3 + bytes[i + 2] * 7) >>> 0;
    }
    resolve({ width, height, bright, hash });
  })));
  const check = async (p, device) => {
    p.on('pageerror', (error) => report.errors.push(error.message));
    await p.goto('http://127.0.0.1:8888/#explore');
    await p.locator('.hero-scene canvas').waitFor();
    await p.waitForFunction(() => document.querySelectorAll('.hero-scene .universe-label').length === 20);
    await frames(p);
    const group = p.getByRole('group', { name: '首页宇宙视角' });
    assert(await group.getByRole('button', { name: '太阳系', exact: true }).getAttribute('aria-pressed') === 'true', 'Home must start with the Solar System');
    const visible = await p.locator('.hero-scene .universe-label:visible').allTextContents();
    assert(visible.length >= 4, 'Home still isolates a single planet');
    await p.getByRole('button', { name: '暂停首页演示', exact: true }).click();
    await frames(p);
    const still = await pixels(p);
    assert(still.bright > 100, 'Blank homepage canvas');
    await frames(p, 30);
    assert((await pixels(p)).hash === still.hash, 'Pause did not stop the preview');
    await p.screenshot({ path: `output/playwright/home-solar-${device}.png` });
    await group.getByRole('button', { name: '地球', exact: true }).click();
    await frames(p);
    assert(await p.getByRole('button', { name: '定位月球', exact: true }).isVisible(), 'Earth preview lost its Moon');
    await p.getByRole('button', { name: '定位月球', exact: true }).click();
    assert(await p.getByRole('button', { name: '定位月球', exact: true }).getAttribute('aria-pressed') === 'true', 'Moon label is not selectable');
    await group.getByRole('button', { name: '太阳系', exact: true }).click();
    await frames(p);
    assert(await p.locator('.hero-scene .universe-label:visible').count() >= 4, 'Overview did not restore the other planets');
    await p.getByRole('button', { name: '继续首页演示', exact: true }).click();
    await frames(p, 45);
    assert((await pixels(p)).hash !== still.hash, 'Playback did not resume');
    await p.getByRole('button', { name: '放大首页场景', exact: true }).click();
    await p.getByRole('button', { name: '缩小首页场景', exact: true }).click();
    assert(await p.locator('.hero-fallback').count() === 0, 'Unexpected rendering fallback');
    return { visible, pixels: still, moonSelection: true, pause: true, resumed: true };
  };
  await page.setViewportSize({ width: 1440, height: 900 });
  report.desktop = await check(page, 'desktop');
  const context = await page.context().browser().newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mobile = await context.newPage();
  try {
    report.mobile = await check(mobile, 'mobile');
    await mobile.setViewportSize({ width: 320, height: 740 });
    await frames(mobile, 10);
    const layout = await mobile.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, controls: [...document.querySelectorAll('.hero-scene-controls button')].map((button) => ({ x: button.getBoundingClientRect().x, right: button.getBoundingClientRect().right })) }));
    assert(layout.scrollWidth === layout.width && layout.controls.every((r) => r.x >= 0 && r.right <= layout.width), 'Narrow-screen controls overflow');
    report.mobile.narrowWidth = layout.width;
  } finally {
    await context.close();
  }
  assert(report.errors.length === 0, report.errors.join('\n'));
  return report;
}
