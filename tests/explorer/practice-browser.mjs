// Run with the Playwright CLI: run-code --filename=/absolute/path/to/this/file
async (page) => {
  const base = new URL(page.url()).origin;
  const context = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 } });
  const p = await context.newPage();
  p.setDefaultTimeout(12000);
  const report = { modules: [], assertions: 0, errors: [], artifacts: [], scope: 'Real Chromium button/input flows in a fresh isolated context; no progress fixtures, no dimension checks, no unit tests.' };
  p.on('pageerror', error => report.errors.push(error.message));
  const keys = {
    character: 'exbeam.practice.character.v1', history: 'exbeam.practice.history.v1',
    clock: 'exbeam.practice.clock.v1', math: 'exbeam.practice.math.run.v1',
    puzzle: 'exbeam.practice.puzzle.v1', vocabulary: 'exbeam.practice.vocabulary.v1',
  };
  const assert = (condition, label) => { report.assertions++; if (!condition) throw new Error(label); };
  const equal = (actual, expected, label) => assert(JSON.stringify(actual) === JSON.stringify(expected), `${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  const button = name => p.getByRole('button', { name, exact: true });
  const read = key => p.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key);
  const saved = (key, path, expected) => p.waitForFunction(({ key, path, expected }) => {
    let value = JSON.parse(localStorage.getItem(key) || 'null');
    for (const field of path) value = value?.[field];
    return JSON.stringify(value) === JSON.stringify(expected);
  }, { key, path, expected });
  const open = async id => { await p.goto(`${base}/?module=${id}`); await p.locator('.practice .wb-main').waitFor(); };
  const reload = async () => { await p.reload(); await p.locator('.practice .wb-main').waitFor(); };
  const feedback = async text => { await p.locator('.practice-feedback').waitFor(); assert((await p.locator('.practice-feedback').innerText()).includes(text), `Missing feedback: ${text}`); };
  const complete = async (name, detail) => {
    const path = `/tmp/exbeam-practice-flow-${name}.png`;
    await p.screenshot({ path }); report.artifacts.push(path);
    report.modules.push({ name, passed: true, ...detail });
  };
  const solveMath = async () => {
    const values = await p.locator('.practice-equation > span').allTextContents();
    const a = Number(values[0]), b = Number(values[2]);
    assert(Number.isFinite(a) && Number.isFinite(b), 'Math question is visible and numeric');
    return values[1] === '+' ? a + b : values[1] === '-' ? a - b : values[1] === '×' ? a * b : a / b;
  };
  try {
    // Character: wrong selection, draft reload, actual correct part, close/reopen.
    await open('e4');
    assert((await p.locator('.practice-prompt').innerText()).includes('大河'), 'Fresh character question is 江');
    const candidates = await p.locator('.practice-choices button').allTextContents();
    const wrongPart = candidates.find(part => part !== '工');
    await button(`选择部件${wrongPart}`).click();
    await feedback('不是本题的答案');
    await saved(keys.character, ['selection'], wrongPart);
    await reload();
    await feedback('不是本题的答案');
    equal((await read(keys.character)).selection, wrongPart, 'Wrong character selection survives reload');
    await button('选择部件工').click();
    await feedback('组合正确：江');
    await saved(keys.character, ['learned'], ['江']);
    equal((await read(keys.character)).wrong, [], 'Successful correction clears character review');
    await button('关闭汉字练习').click(); await open('e4');
    await feedback('组合正确：江');
    assert(await button('选择部件工').isDisabled(), 'Solved character cannot be submitted again');
    equal((await read(keys.character)).learned, ['江'], 'Character completion is persisted and deduplicated');
    await complete('character', { actions: 'Wrong part → reload draft → 工 → close/reopen', recovered: 'selection, solved state, one learned character, empty wrong queue' });

    // History: both move controls, incorrect check, explanation, correction, reload.
    await open('e6');
    const titles = () => p.locator('.practice-order > li strong').allTextContents();
    const original = await titles();
    await button(`下移${original[0]}`).click();
    equal((await titles())[1], original[0], 'History down control moves one position');
    await button(`上移${original[0]}`).click();
    equal(await titles(), original, 'History up control restores previous order');
    await saved(keys.history, ['order', 'length'], 4);
    const beforeHistoryReload = await read(keys.history);
    await reload(); equal(await titles(), original, 'History order survives reload');
    equal((await read(keys.history)).order, beforeHistoryReload.order, 'Saved event IDs survive reload');
    await button('核对顺序').click(); await feedback('还有事件位置不对');
    assert((await p.locator('.practice-feedback').innerText()).includes('公元前221年'), 'Incorrect history answer reveals factual chronology');
    await saved(keys.history, ['result'], 'wrong');
    await reload(); await feedback('还有事件位置不对');
    assert((await read(keys.history)).wrong.length > 0, 'History review queue persists');
    await button('调整顺序再试').click();
    const chronological = ['夏朝建立', '商汤灭夏', '武王伐纣', '秦灭六国'];
    for (let target = 0; target < chronological.length; target++) {
      let index = (await titles()).indexOf(chronological[target]);
      assert(index >= 0, 'Expected history event is present');
      while (index > target) { await button(`上移${chronological[target]}`).click(); index--; }
    }
    equal(await titles(), chronological, 'History buttons construct the correct order');
    await button('核对顺序').click(); await feedback('时间线已还原');
    await saved(keys.history, ['result'], 'correct');
    await reload(); await feedback('时间线已还原');
    assert(await button('核对顺序').isDisabled(), 'History success is locked against duplicate scoring');
    const history = await read(keys.history);
    equal(history.completed.length, 1, 'One distinct history completion'); equal(history.learned.length, 4, 'Four learned history events'); equal(history.wrong, [], 'History review resolves');
    await complete('history', { actions: 'Down/up → wrong check → reload → button sort → correct check → reload', recovered: 'order, explanation, completed group, learned events, cleared review' });

    // Clock: actual input, midnight rollover, 12/24h, wrong/correct read challenge.
    await open('e7');
    await p.getByRole('textbox', { name: '小时', exact: true }).fill('23');
    await p.getByRole('textbox', { name: '分钟', exact: true }).fill('59');
    await saved(keys.clock, ['total'], 1439);
    equal(await p.locator('.practice-number').innerText(), '23:59', 'Clock inputs drive the digital display');
    await reload();
    equal(await p.getByRole('textbox', { name: '小时', exact: true }).inputValue(), '23', 'Clock hour survives reload');
    equal(await p.getByRole('textbox', { name: '分钟', exact: true }).inputValue(), '59', 'Clock minute survives reload');
    await button('增加一分钟').click(); await saved(keys.clock, ['total'], 0);
    equal(await p.locator('.practice-number').innerText(), '00:00', 'Clock crosses midnight correctly');
    await button('12小时').click();
    equal(await p.locator('.practice-number').innerText(), '上午 12:00', '12-hour midnight conversion');
    await button('24小时').click(); await button('读时挑战').click();
    const renderedTime = await p.evaluate(() => {
      const angle = selector => Number(document.querySelector(selector).style.transform.match(/rotate\(([-\d.]+)/)[1]);
      const hour = Math.floor((angle('.clock-hour') + 0.001) / 30) % 12;
      const minute = Math.round(angle('.clock-minute') / 6) % 60;
      return hour * 60 + minute + (document.querySelector('.wb-main > .practice-meta').textContent.includes('下午') ? 720 : 0);
    });
    const clockQuestion = await read(keys.clock);
    equal(renderedTime, clockQuestion.target, 'Visible clock hands agree with the stored read-time question');
    const hour = Math.floor(renderedTime / 60), minute = renderedTime % 60;
    await p.getByRole('textbox', { name: '小时', exact: true }).fill(String((hour + 1) % 24));
    await p.getByRole('textbox', { name: '分钟', exact: true }).fill(String(minute));
    await button('核对时间').click(); await feedback('再检查');
    await saved(keys.clock, ['feedback'], 'wrong');
    await reload(); await feedback('再检查');
    equal(await p.getByRole('textbox', { name: '小时', exact: true }).inputValue(), String((hour + 1) % 24), 'Clock challenge answer draft restores');
    await p.getByRole('textbox', { name: '小时', exact: true }).fill(String(hour));
    await button('核对时间').click(); await feedback('时间正确');
    await saved(keys.clock, ['feedback'], 'correct');
    await reload(); await feedback('时间正确');
    assert(await button('核对时间').isDisabled(), 'Correct clock question cannot score twice');
    equal((await read(keys.clock)).solved.length, 1, 'Clock records one verified success');
    equal((await read(keys.clock)).wrong, [], 'Correct read-time review clears its error');
    await complete('clock', { actions: '23:59 input → reload → midnight + 12/24h → read hands → wrong answer → reload → correct answer', recovered: 'clock values, read challenge, wrong draft, correct result' });

    // Math: all actions use the live form, not helper/reducer calls or fixtures.
    await open('e18');
    await p.getByRole('combobox', { name: '挑战时长', exact: true }).selectOption('120');
    await button('开始挑战').click();
    const mathInput = () => p.getByRole('textbox', { name: '心算答案', exact: true });
    assert(await mathInput().isEnabled(), 'Math start enables the answer form');
    const answer = await solveMath(); await mathInput().fill(String(answer));
    equal((await read(keys.math)).attempts.length, 0, 'Typing a correct answer alone does not submit');
    await button('提交答案').click(); await saved(keys.math, ['attempts', 'length'], 1);
    equal((await read(keys.math)).attempts[0].correct, true, 'Math correct answer is checked by live form');
    const badAnswer = (await solveMath()) + 1; await mathInput().fill(String(badAnswer));
    await button('提交答案').click(); await saved(keys.math, ['attempts', 'length'], 2);
    equal((await read(keys.math)).attempts[1].correct, false, 'Math incorrect answer is recorded');
    await mathInput().fill('7'); await button('暂停计时').click();
    await saved(keys.math, ['status'], 'paused'); await saved(keys.math, ['input'], '7');
    const paused = await read(keys.math);
    assert(await mathInput().isDisabled(), 'Paused math cannot accept answers');
    await reload();
    assert(await mathInput().isDisabled(), 'Paused math form restores disabled');
    equal(await mathInput().inputValue(), '7', 'Unsubmitted math input restores');
    equal((await read(keys.math)).remaining, paused.remaining, 'Pause does not lose remaining time');
    equal((await read(keys.math)).question.id, paused.question.id, 'Pause reload preserves current question');
    await button('继续计时').click(); await saved(keys.math, ['status'], 'playing');
    assert(await mathInput().isEnabled(), 'Math resumes the same form');
    equal(await mathInput().inputValue(), '7', 'Resume retains the unsubmitted input');
    await button('结束并查看结果').click(); await saved(keys.math, ['status'], 'result');
    assert(await p.getByRole('heading', { name: '本轮结果', exact: true }).isVisible(), 'Math end opens the actual result view');
    const ended = await read(keys.math);
    equal(await p.locator('.practice-table tbody tr').count(), ended.attempts.length, 'Math results include every recorded attempt');
    equal(ended.attempts.filter(a => a.correct).length, 1, 'Wrong and unfinished answers do not earn points');
    const wrongCount = ended.attempts.filter(a => !a.correct).length;
    await reload();
    equal((await read(keys.math)).attempts, ended.attempts, 'Full math result history survives reload');
    await button(`错题再练 ${wrongCount}`).click();
    await saved(keys.math, ['status'], 'playing');
    for (let index = 0; index < wrongCount; index++) {
      const correct = await solveMath(); await mathInput().fill(String(correct)); await button('提交答案').click();
      await saved(keys.math, ['attempts', 'length'], index + 1);
    }
    await saved(keys.math, ['status'], 'result');
    const retried = await read(keys.math);
    equal(retried.attempts.length, wrongCount, 'Finite math retry has no extra phantom question');
    assert(retried.attempts.every(a => a.correct), 'All actual math retries are checked correct');
    equal(new Set(retried.attempts.map(a => a.id)).size, retried.attempts.length, 'No duplicate math question scores');
    await reload(); equal((await read(keys.math)).attempts, retried.attempts, 'Completed math retry restores');
    await complete('math', { actions: 'Start → correct + wrong submissions → pause/reload/resume → end/result → wrong-only retry → reload', recovered: 'question, typed input, paused remaining time, complete results, finite retry results', originalAttempts: ended.attempts.length, retried: wrongCount });

    // Puzzle: answer gate, explanation after submission, bookmarks, correction.
    await open('ent3');
    equal(await p.locator('.practice-feedback').count(), 0, 'Puzzle explanation is hidden before answering');
    await p.locator('.practice-option').filter({ hasText: '桌子' }).click();
    equal(await p.locator('.practice-feedback').count(), 0, 'Selecting an option still does not reveal explanation');
    await button('提交答案').click(); await feedback('正确答案：人');
    assert((await p.locator('.practice-feedback').innerText()).includes('人生'), 'Puzzle submission reveals its real explanation');
    await button('收藏此题').click(); await saved(keys.puzzle, ['saved'], ['BT_001']);
    await reload(); await feedback('正确答案：人');
    equal((await read(keys.puzzle)).selected, '桌子', 'Puzzle selection restores');
    assert(await button('取消收藏此题').isVisible(), 'Puzzle bookmark restores');
    await button('收藏 1').click();
    equal(await p.locator('.practice-catalog .practice-entry').count(), 1, 'Saved puzzle is actually listed');
    await button('打开题目').click(); await feedback('正确答案：人');
    await button('重新作答').click();
    equal(await p.locator('.practice-feedback').count(), 0, 'Puzzle retry hides explanation again');
    await p.locator('.practice-option').filter({ hasText: /^\s*[A-D]\s*人\s*$/ }).click();
    await button('提交答案').click(); await feedback('答对了');
    await saved(keys.puzzle, ['solved'], ['BT_001']);
    await reload(); await feedback('答对了');
    equal((await read(keys.puzzle)).wrong, [], 'Puzzle correction clears review');
    equal((await read(keys.puzzle)).saved, ['BT_001'], 'Puzzle correction keeps bookmark');
    await complete('puzzle', { actions: 'Select → submit/explanation → bookmark → reload → collection → retry/correct → reload', recovered: 'selection, submitted explanation, bookmark, solved/review state' });

    // Vocabulary: complete a real spelling test, then test the wrong-word queue.
    await open('u2');
    await p.getByRole('combobox', { name: '测验题型', exact: true }).selectOption('spelling');
    await button('开始10词测验').click();
    const spelling = () => p.getByRole('textbox', { name: '英文拼写', exact: true });
    const definitions = {
      '苹果': 'Apple', '学校': 'School', '水': 'Water', '花园': 'Garden', '云': 'Cloud',
      '河流': 'River', '光；光线': 'Light', '形状': 'Shape', '颜色': 'Color', '图片；图画': 'Picture',
      '朋友': 'Friend', '家庭；家人': 'Family', '听；倾听': 'Listen', '建造': 'Build',
    };
    const firstMeaning = await p.locator('form .practice-word').innerText();
    const firstWord = definitions[firstMeaning]; assert(Boolean(firstWord), 'Visible vocabulary prompt has a real expected spelling');
    const draft = firstWord.slice(0, 2).toLowerCase(); await spelling().fill(draft);
    await saved(keys.vocabulary, ['test', 'input'], draft);
    const firstTest = (await read(keys.vocabulary)).test;
    await reload();
    equal(await spelling().inputValue(), draft, 'Vocabulary spelling draft survives reload');
    equal(await p.locator('form .practice-word').innerText(), firstMeaning, 'Vocabulary keeps the same prompt after reload');
    equal((await read(keys.vocabulary)).test.id, firstTest.id, 'Vocabulary resumes the same test');
    await spelling().fill('definitelywrong'); await button('提交答案').click(); await feedback('已加入错词复习');
    const incorrect = await read(keys.vocabulary), wrongId = incorrect.test.ids[0];
    await saved(keys.vocabulary, ['progress', String(wrongId), 'wrong'], true);
    await reload(); await feedback('已加入错词复习');
    assert(await spelling().isDisabled(), 'Already-submitted word cannot be rescored after reload');
    equal((await read(keys.vocabulary)).test.answers[wrongId], 'definitelywrong', 'Wrong word answer persists');
    await button('下一词').click();
    for (let index = 1; index < firstTest.ids.length; index++) {
      const meaning = await p.locator('form .practice-word').innerText();
      const correct = definitions[meaning]; assert(Boolean(correct), `Expected spelling exists for ${meaning}`);
      await spelling().fill(correct.toLowerCase()); await button('提交答案').click(); await feedback('回答正确');
      await button(index + 1 === firstTest.ids.length ? '查看结果' : '下一词').click();
    }
    await saved(keys.vocabulary, ['test', 'index'], firstTest.ids.length);
    assert(await p.getByRole('heading', { name: '本轮测验结果', exact: true }).isVisible(), 'Complete vocabulary test has actual results');
    const completeTest = (await read(keys.vocabulary)).test;
    equal(Object.keys(completeTest.answers).length, 10, 'All vocabulary responses are recorded');
    await reload();
    equal((await read(keys.vocabulary)).test.answers, completeTest.answers, 'Complete vocabulary results survive reload');
    await button('错词 1').click();
    equal(await p.locator('.practice-entry').count(), 1, 'One actual wrong word appears in review');
    assert((await p.locator('.practice-entry').innerText()).includes(firstWord), 'Wrong-word review contains the failed word');
    await button('错词再测').click();
    equal(await p.locator('form .practice-word').innerText(), firstMeaning, 'Wrong-word test presents the actual failed word');
    await spelling().fill(firstWord.toLowerCase()); await button('提交答案').click(); await feedback('回答正确');
    await button('查看结果').click();
    await saved(keys.vocabulary, ['progress', String(wrongId), 'wrong'], false);
    const reviewed = await read(keys.vocabulary);
    equal(reviewed.test.ids.length, 1, 'Wrong-word retry tests only the failed word');
    equal(reviewed.progress[wrongId].correct, 1, 'One real correction adds one verified result');
    await reload();
    equal((await read(keys.vocabulary)).progress[wrongId], reviewed.progress[wrongId], 'Corrected vocabulary progress survives reload');
    await button('错词 0').click();
    assert((await p.locator('.wb-empty').innerText()).includes('没有错词'), 'Wrong-word queue is visibly empty after actual correction');
    await complete('vocabulary', { actions: 'Start spelling test → draft/reload → wrong answer/reload → complete 10 words → reload → wrong-word test → correct → reload', recovered: 'test ID, prompt, draft, submitted answer, complete results, corrected review', testedWords: 10, wrongWordsReviewed: 1 });

    equal(report.modules.length, 6, 'Every practice module completed a real browser flow');
    equal(report.errors, [], 'No page runtime errors during the six flows');
  } catch (error) {
    report.failure = error.message;
    const path = '/tmp/exbeam-practice-flow-failure.png';
    try { await p.screenshot({ path }); report.artifacts.push(path); } catch {}
    throw error;
  } finally {
    await page.evaluate(report => { window.__practiceFlowReport = report; }, report);
    await context.close();
  }
  return report;
}
