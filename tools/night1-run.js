// A scripted run of Night 1, start to finish, for the Playwright MCP's browser_run_code tool (its
// body is the function below; it gets `page`). Serve the game first: node tools/serve.js
// It plays the routine, every dread beat, bed and the 2:13 pet cam, then the gag ending, saving
// screenshots as .playwright-mcp/night1-*.png (relative to wherever Playwright writes), and returns
// the beats it reached and every console error. Expected: errors [].
async (page) => {
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:8123/index.html');
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.goto('http://127.0.0.1:8123/index.html');
  await page.waitForFunction(() => document.body.getAttribute('data-booted') === '1');
  const log = [];
  const ev = async (label, fn) => {
    const r = await page.evaluate(fn);
    log.push(label + ': ' + r);
    return r;
  };
  const shot = async (name, opts) => {
    await page.evaluate(() => document.getElementById('flash').classList.remove('on'));
    await page.screenshot(Object.assign({ path: '.playwright-mcp/night1-' + name + '.png' }, opts || {}));
  };
  // shared in-page helpers
  await page.evaluate(() => {
    window.T = {
      tick: () => new Promise((r) => setTimeout(r, 0)),
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      closeReader: () => document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' })),
      until: (pred, max) => { const D = OC.debug; let t = 0; while (!pred() && t < max) { D.advance(0.5); t += 0.5; } return t; },
    };
  });

  // ---- the routine ------------------------------------------------------------------------------
  await ev('start', async () => {
    const D = OC.debug; D.startAct('act1'); D.lock(); D.advance(2);
    return D.act1() ? 'act1' : 'no act';
  });
  await ev('dinner', async () => {
    const D = OC.debug;
    D.teleport(6.3, 1.55, 0, -0.15); OC.game.cooper.setPos(8.5, 2.2);
    D.use('fridge'); await T.tick(); D.choose(1); await T.tick();
    D.use('microwave');
    ['Digit2', 'Digit3', 'Digit0'].forEach((c) => window.dispatchEvent(new KeyboardEvent('keydown', { code: c })));
    D.advance(0.2);
    return 'keypad open=' + D.act1().mods.dinner.keypadOpen();
  });
  await shot('keypad');
  await ev('eat', async () => {
    const D = OC.debug;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter' }));
    D.advance(16); D.use('microwave'); D.use('table'); D.advance(4);
    OC.game.ctl.yaw = Math.PI / 2 + 0.55; OC.game.ctl.pitch = -0.5; D.advance(0.2);
    return 'seated, dinner ' + D.act1().mods.dinner.dinner().state;
  });
  await shot('dinner');
  await ev('bite', async () => {
    const D = OC.debug;
    D.use('eat'); D.advance(7); await T.tick(); D.choose(1); await T.tick(); D.advance(5);
    return D.act1().mods.dinner.dinner().state;
  });
  await ev('cooper', async () => {
    const D = OC.debug;
    D.use('bin'); D.use('bowl'); D.advance(8);
    D.teleport(21, 4.2, Math.PI, -0.2); OC.game.cooper.setPos(20, 5); D.advance(0.3);
    D.use('cooper'); await T.tick(); D.choose(1); await T.tick(); D.advance(2);
    D.use('ball'); D.use('throw'); T.until(() => D.act1().mods.cooperPlay.state.fetches > 0, 20);
    return 'fed=' + D.act1().director.done('feedCooper') + ' fetches=' + D.act1().mods.cooperPlay.state.fetches;
  });
  await ev('mail', async () => {
    const D = OC.debug;
    D.use('mailbox'); await T.wait(300); T.closeReader(); await T.wait(300); T.closeReader(); await T.tick();
    return D.act1().director.done('mail');
  });
  await ev('trash', async () => {
    const D = OC.debug;
    D.use('trashBag'); D.teleport(-1.4, -2.2, 0, 0); OC.game.cooper.setPos(0, -3); D.use('bins'); D.advance(0.2);
    D.aim(-14, 1.6, -18); OC.game.ctl.yaw -= 0.15; D.advance(0.7);
    return 'treeSeen=' + D.act1().mods.chores.state.treeSeen;
  });
  await shot('treeline');
  await ev('dishes+teeth', async () => {
    const D = OC.debug;
    D.advance(6); D.use('laundrySink'); D.advance(7);
    D.teleport(3.95, 22.2, Math.PI, 0); OC.game.cooper.setPos(6, 17);
    D.use('vanity'); D.advance(4.2);
    OC.game.ctl.pitch = 0; OC.game.ctl.yaw = Math.PI - 0.08; D.advance(0.1);
    return 'washed=' + D.act1().director.done('washUp');
  });
  await shot('mirror');
  await ev('tv', async () => {
    const D = OC.debug;
    D.advance(4);
    D.teleport(19.25, 3.3, 0, 0); D.advance(0.3); D.use('tv'); D.advance(0.3);
    D.use('couch'); D.advance(1.2); OC.game.ctl.pitch = -0.05;
    document.getElementById('subtitle').classList.remove('on'); D.advance(0.1);
    return 'channel ' + D.act1().mods.tv.tv.channel().n + ', settled stage=' + D.dread();
  });
  await shot('tv');

  // ---- the alert and the reflection (both armed by the settled-in gate) ---------------------------
  await ev('alert', async () => {
    const D = OC.debug;
    T.until(() => D.act1().mods.tv.tv.alerting(), 20); D.advance(1.5);
    document.getElementById('subtitle').classList.remove('on');
    return 'alerting=' + D.act1().mods.tv.tv.alerting();
  });
  await shot('alert');
  await ev('reflection', async () => {
    const D = OC.debug;
    T.until(() => !D.act1().mods.tv.tv.alerting() && D.act1().director.done('watchTv'), 30);
    D.teleport(19.4, 2.6, 0, -0.12); D.advance(0.3);
    D.use('remote'); D.advance(0.1);
    document.getElementById('subtitle').classList.remove('on');
    return 'reflection=' + D.act1().mods.tv.state.sawReflection;
  });
  await shot('reflection', { clip: { x: 340, y: 180, width: 600, height: 380 } });
  await ev('settled', async () => {
    const D = OC.debug;
    D.advance(8); D.use('latch'); D.advance(1);
    return 'tasks=' + D.act1().flags.tasksDone + ' stage=' + D.dread();
  });

  // ---- the photo -----------------------------------------------------------------------------------
  await ev('photo', async () => {
    const D = OC.debug;
    T.until(() => D.act1().director.list().some((x) => x.id === 'photo') && D.act1().dread.state.photoAsked >= 0, 30);
    D.teleport(6.1, 6.6, Math.PI + 0.05, 0); D.advance(0.3);
    D.phoneApp('camera'); const p = D.shoot(); D.phoneApp(null);
    window.__photo = p.url;
    return 'subject=' + p.subject;
  });
  await page.evaluate(() => { const i = document.createElement('img'); i.id = '__big'; i.src = window.__photo; i.style.cssText = 'position:fixed;inset:0;margin:auto;width:1100px;image-rendering:pixelated;z-index:50;border:6px solid #e8e6df'; document.body.appendChild(i); });
  await page.waitForTimeout(300);
  await shot('photo-redeye');
  await page.evaluate(() => document.getElementById('__big').remove());

  // ---- the scratching ------------------------------------------------------------------------------
  await ev('scratch', async () => {
    const D = OC.debug;
    D.advance(18);
    D.teleport(9.5, 2.5, Math.PI * 0.85, -0.6);
    const t = T.until(() => D.dread() === 'scratchChoice', 90); D.advance(2.6);
    return 'reached in ' + t + 's, choosing=' + OC.game.phone.choosing();
  });
  await shot('scratching');

  // ---- Dave's window --------------------------------------------------------------------------------
  await ev('window', async () => {
    const D = OC.debug;
    D.choose(2); await T.tick(); D.advance(10);
    D.teleport(24, 6.5, 0, 0);
    const t = T.until(() => D.dread() === 'window', 80);
    const look = (z, s) => { D.aim(13, 1.5, z); D.advance(s); };
    const away = () => { D.aim(20, 1.5, 0); D.advance(0.4); };
    look(17.5, 0.6); away(); look(17.5, 0.6);
    return 'lamp after ' + t + 's, master=' + OC.game.props.master.stage;
  });
  await shot('window');
  await ev('gone', async () => {
    const D = OC.debug;
    const look = (z, s) => { D.aim(13, 1.5, z); D.advance(s); };
    const away = () => { D.aim(20, 1.5, 0); D.advance(0.4); };
    away(); look(21.5, 0.6); away(); look(17.5, 0.6); away();
    return 'stage=' + D.dread() + ' master=' + OC.game.props.master.stage;
  });

  // ---- the laundry door, the knocks ----------------------------------------------------------------
  await ev('door', async () => {
    const D = OC.debug;
    T.until(() => D.dread() === 'knocks', 40); D.advance(6);
    D.teleport(6.6, 12.6, 0, 0); OC.game.ctl.light.on = true; D.advance(1.2);
    D.aim(5, 0.9, 10.5); OC.game.ctl.yaw -= 0.1; D.advance(0.3);
    return 'stage=' + D.dread() + ' door closed=' + OC.game.props.laundryDoor.closed;
  });
  await shot('knocks');
  await ev('relief', async () => {
    const D = OC.debug;
    D.use('laundryDoor'); D.advance(9);
    T.until(() => D.dread() === 'bed', 30); D.advance(4);
    D.teleport(17, 3.5, -0.4, -0.2); D.advance(0.5);
    return 'stage=' + D.dread() + ' lights=' + D.act1().mods.chores.lightsOn();
  });
  await shot('relief');

  // ---- bed, and the pet cam at 2:13 ------------------------------------------------------------------
  await ev('bed', async () => {
    const D = OC.debug;
    D.teleport(2.9, 15.6, Math.PI / 2, -0.3); D.advance(0.3);
    D.use('bed'); D.advance(10);
    return 'stage=' + D.dread() + ' petcam=' + OC.game.g.petcam.on;
  });
  await page.waitForTimeout(2000); // the fade to black is a real-time CSS transition
  await shot('petcam-213');
  await ev('end', async () => {
    const D = OC.debug; D.advance(8);
    return 'ending=' + D.act1().flags.ending;
  });
  await page.waitForTimeout(13500);
  await ev('night2', async () => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem('oakridge.habits')); } catch (e) {}
    return 'act=' + OC.game.current.id + ' saved habits=' + (saved ? saved.entries.length : 0) +
      ' notebook=' + JSON.stringify(OC.habits.notebookLines(saved ? saved.entries : []));
  });

  // ---- the gag ending ------------------------------------------------------------------------------
  await ev('gag', async () => {
    const D = OC.debug; D.startAct('act1'); D.lock(); D.advance(0.5);
    D.use('fridge'); await T.tick(); D.choose(5); await T.tick();
    D.use('microwave'); D.keypad('200'); D.advance(12.5); D.use('microwave'); D.use('table'); D.advance(1); D.use('eat'); D.advance(13);
    D.act1().dread.state.stage = 'bed';
    D.teleport(2.9, 15.6, Math.PI / 2, 0); D.use('bed');
    return 'gag=' + OC.game.g.state.gag;
  });
  await page.waitForTimeout(2500); // the fade, on a real timer
  await ev('gagCard', async () => {
    OC.debug.advance(19); // the card's lines run on game time
    return 'act=' + OC.game.current.id + ' variant=' + (OC.game.act && OC.game.act.variant);
  });
  await page.waitForTimeout(3000); // its lines fade in on a real-time CSS animation
  await shot('gag-ending');
  return { log, errs };
}
