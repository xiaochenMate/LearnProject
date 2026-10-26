async (page) => {
  const ids = ['ent5','ent6','ent4','ent7','e3','e2','u1','e4','e5','e6','e7','e18','e20','e21','ent3','u2','u3','u4'];
  const report = { desktop: [], mobile: [], problems: [] };
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const p = await context.newPage();
  let current = '';
  p.on('pageerror', error => report.problems.push({ id: current, error: error.message }));
  try {
    for (const width of [1440, 390]) {
      await p.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const id of ids) {
        current = `${id}-${width}`;
        try {
          await p.goto(`http://127.0.0.1:8888/?module=${id}#explore`);
          await p.locator('.workbench').waitFor({ timeout: 25000 });
          await p.evaluate(() => new Promise(resolve => { let count = 0; const next = () => ++count >= 25 ? resolve(true) : requestAnimationFrame(next); requestAnimationFrame(next); }));
          const state = await p.evaluate(() => {
            const workbench = document.querySelector('.workbench');
            const content = document.querySelector('.wb-content');
            return {
              title: workbench.querySelector('h2')?.textContent,
              text: workbench.textContent.length,
              buttons: workbench.querySelectorAll('button').length,
              controls: workbench.querySelectorAll('button,input,select,textarea').length,
              width: workbench.clientWidth,
              scroll: workbench.scrollWidth,
              contentWidth: content.clientWidth,
              contentScroll: content.scrollWidth,
              broken: [...workbench.querySelectorAll('img')].filter(img => img.complete && !img.naturalWidth).map(img => img.src),
              canvases: [...workbench.querySelectorAll('canvas')].map(c => ({ width: c.width, height: c.height, cssWidth: c.clientWidth, cssHeight: c.clientHeight })),
            };
          });
          if (!state.title || state.text < 60 || state.controls < 3) report.problems.push({ id: current, error: 'Incomplete workbench', state });
          if (state.scroll > state.width + 2 || state.contentScroll > state.contentWidth + 2) report.problems.push({ id: current, error: 'Horizontal overflow', state });
          if (state.broken.length) report.problems.push({ id: current, error: 'Broken assets', assets: state.broken });
          if (state.canvases.some(c => c.width < 20 || c.height < 20 || c.cssWidth < 20 || c.cssHeight < 20)) report.problems.push({ id: current, error: 'Collapsed canvas', canvases: state.canvases });
          await p.screenshot({ path: `output/playwright/module-rollout/${id}-${width}.png` });
          (width === 390 ? report.mobile : report.desktop).push({ id, ...state });
        } catch (error) { report.problems.push({ id: current, error: error.message.slice(0, 350) }); }
      }
    }
  } finally { await context.close(); }
  return report;
}
