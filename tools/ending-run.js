// A scripted run of the main ending, start to finish, for the Playwright MCP's browser_run_code tool (its
// body is the function below; it gets `page`). Serve the game first: node tools/serve.js
// It fills the habit log with a strong run (his picture, the nest, the notebook, the deputy called in the
// daytime) and plays the epilogue through: the porch and the cards, the tape, the notebook, the news,
// Dave and the cashier, the verdict, the later visit, the fridge, the credits and the hum. Screenshots go
// to .playwright-mcp/ending-*.jpg. Returns the stages in order, the tier, the achievements and every
// console error. Expected: tier 'strong', errors [].
async (page) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload();
  await page.waitForFunction(() => document.body.getAttribute('data-booted') === '1');
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => {
    OC.debug.lock();
    const g = OC.game.g;
    g.habits.reset();
    [
      ['photoWes', {}, '11:40 PM'], ['dinner', { kind: 'lasagna' }, '7:42 PM'], ['twoScoops', {}, '8:01 PM'],
      ['brushedTeeth', {}, '10:30 PM'], ['lockedPatio', {}, '10:34 PM'], ['dayTwo'], ['coffee', {}, '10:15 AM'],
      ['sawPoster', {}, '4:40 PM'], ['calledDeputy'], ['sawShopper', { looked: true }], ['nightTwo'],
      ['crawl', { kind: 'tally' }], ['photoNest'], ['readNotebook'], ['notebook', { kind: 'photo' }], ['photoEye'],
      ['faceAtGlass'], ['survived', { ray: true }],
    ].forEach((l) => g.habits.log(l[0], l[1] || {}, { clock: l[2] || '', t: 0 }));
    g.startEpilogue('main');
  });
  const shots = { porch: 17, found: 2.5, notebook: 13, news: 3, verdict: 7, house: 3.5, fridge: 3, vo: 4, done: 0 };
  const taken = {};
  let stage = null;
  let since = 0;
  const log = [];
  for (let s = 0; s < 400; s += 0.5) {
    const st = await page.evaluate(() => { OC.debug.advance(0.5); return OC.game.act.stage(); });
    if (st !== stage) { stage = st; since = 0; log.push(st + '@' + s); } else since += 0.5;
    if (shots[st] !== undefined && !taken[st] && since >= shots[st]) {
      taken[st] = true;
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '.playwright-mcp/ending-' + st + '.jpg', type: 'jpeg', quality: 82 });
    }
    if (st === 'done') break;
  }
  const info = await page.evaluate(() => ({
    tier: OC.game.act.tier,
    ach: OC.game.g.achievements.unlocked(),
    shown: OC.game.act.shown().length,
  }));
  return { log, info, errors };
}
