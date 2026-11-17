// A scripted run of Night 2, start to finish, for the Playwright MCP's browser_run_code tool (its body
// is the function below; it gets `page`). Serve the game first: node tools/serve.js
// It gets in (porch light, deadbolt, fake rock), puts the groceries down, finds every wrong thing,
// locks up, loses the food, trips and resets the breaker, goes under the house (the nest, the notebook,
// the footsteps, the sitting, the phone), answers Dave, finds the chair in the hall and the notebook on
// the pillow, and goes to bed. Screenshots go to .playwright-mcp/night2-*.png. Returns the beats it
// reached and every console error. Expected: errors [].
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
  const ev = async (label, fn, arg) => {
    let r;
    try {
      r = await page.evaluate(fn, arg);
    } catch (e) {
      r = 'THREW ' + e.message.split('\n')[0];
    }
    log.push(label + ': ' + (typeof r === 'string' ? r : JSON.stringify(r)));
    return r;
  };
  const shot = async (name) => {
    await page.evaluate(() => OC.debug.advance(0.05));
    await page.screenshot({ path: '.playwright-mcp/night2-' + name + '.png' });
  };
  await page.evaluate(() => {
    window.T = {
      act: () => OC.game.act,
      st: (m) => OC.game.act.mods[m].state,
      done: (id) => OC.game.act.director.done(id),
      closeReader: async (pages) => {
        for (let i = 0; i < (pages || 1) + 6 && OC.hud.isReading(); i++) {
          await new Promise((r) => setTimeout(r, 300));
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
          OC.debug.advance(0.1);
        }
        return !OC.hud.isReading();
      },
      until: async (pred, max, step) => {
        const D = OC.debug;
        for (let t = 0; t < max; t += step || 0.5) {
          if (pred()) return t;
          D.advance(step || 0.5);
          await new Promise((r) => setTimeout(r, 0));
        }
        return pred() ? max : 'timed out';
      },
      talkThrough: async (picks) => {
        const D = OC.debug;
        const a = OC.game.act;
        let i = 0;
        for (let t = 0; t < 240; t += 0.5) {
          D.advance(0.5);
          await new Promise((r) => setTimeout(r, 0));
          if (OC.game.phone.choosing()) {
            D.choose(Array.isArray(picks) ? picks[Math.min(i, picks.length - 1)] : picks || 1);
            i++;
            await new Promise((r) => setTimeout(r, 0));
          }
          if (!a.ctx.talking()) return t;
        }
        return 'still talking';
      },
      key: (code, up) => window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code })),
    };
  });

  // ---- getting in ---------------------------------------------------------------------------------
  await ev('start', () => {
    const D = OC.debug;
    // a night one worth reading: lasagna, TV, teeth, bed with every light on (so: the breaker)
    const h = OC.game.g.habits;
    h.reset();
    [['dinner', { kind: 'lasagna' }, '7:48 PM'], ['gaveBite', {}, '7:55 PM'], ['fedCooper', {}, '8:02 PM'], ['tvOn', {}, '8:20 PM'], ['mail', {}, '8:41 PM'],
      ['brushedTeeth', {}, '9:30 PM'], ['scratch', { kind: 'hatch' }, '10:12 PM'], ['knocksOpened', {}, '11:40 PM'], ['bed', { lights: 4 }, '1:52 AM'],
      ['dayTwo'], ['calledDeputy', {}, '11:42 AM'], ['rayVisited', {}, '12:20 PM'], ['sawGrowthMarks', {}, '3:05 PM'], ['snack', { kind: 'b' }, '7:20 PM'], ['sawShopper', {}, '7:25 PM'], ['sawRoadside', {}, '8:12 PM'],
    ].forEach((e) => h.log(e[0], e[1], { clock: e[2] || '' }));
    D.startAct('act2');
    D.lock();
    D.advance(2);
    return JSON.stringify(T.act().plan);
  });
  await shot('driveway');
  await ev('porchLight', async () => {
    const D = OC.debug;
    D.teleport(2.5, -2.4, Math.PI, 0);
    D.advance(1.5);
    return T.st('arrival').porchLit + ', porch ' + OC.game.world.lightById.porch.intensity;
  });
  await shot('porch');
  await ev('door', () => { const D = OC.debug; D.use('frontDoor'); D.advance(1); return 'key ' + T.st('arrival').hasKey; });
  await ev('rock', () => { const D = OC.debug; D.goto('rock', 0); D.aim(4.78, 0.12, -1.42); D.advance(0.2); const tgt = OC.game.interact.target; D.use('rock'); return (tgt ? tgt.id : 'no target') + ', key ' + T.st('arrival').hasKey; });
  await ev('walkIn', async () => {
    const D = OC.debug;
    D.teleport(2.5, -1.2, Math.PI, 0);
    D.use('frontDoor');
    T.key('KeyW');
    D.advance(3);
    T.key('KeyW', true);
    return 'inside ' + T.done('inside') + ' at z ' + OC.game.ctl.pos.z.toFixed(2) + ', cooper ' + OC.game.cooper.mode;
  });
  await shot('cooper-door');
  await ev('list', async () => { OC.debug.advance(11); return document.getElementById('notif').textContent; });

  // ---- the groceries, the wrong things --------------------------------------------------------------
  await ev('groceries', () => { const D = OC.debug; D.goto('groceries', 0); D.aim(9.4, 0.9, 4.3); D.advance(0.2); D.use('groceries'); return T.done('groceries') + ', snack ' + OC.game.props.changes.groceries.has('snack'); });
  await shot('groceries');
  await ev('chair', () => { const D = OC.debug; D.teleport(10.2, 6.2, Math.PI + 0.6, -0.25); D.advance(0.3); return D.use('chair'); });
  await shot('chair');
  await ev('tablet', async () => { const D = OC.debug; D.goto('tablet', 0); D.aim(8.1, 1.04, 0.34); D.advance(0.3); const tgt = OC.game.interact.target; D.use('tablet'); D.advance(0.2); return (tgt ? tgt.id : 'none') + ' reading ' + OC.hud.isReading(); });
  await shot('tablet');
  await ev('tabletClose', async () => { await T.closeReader(); OC.debug.advance(1); return T.act().mods.changes.count(); });
  await ev('photo', () => { const D = OC.debug; D.goto('photoTable', 0); D.aim(4.25, 0.9, 0.46); D.advance(0.3); const r = D.use('photo'); D.advance(8); return r + ', down ' + OC.game.props.changes.photo.down; });
  await ev('seat', () => { const D = OC.debug; D.teleport(3.0, 20.5, -Math.PI / 2, -0.4); OC.game.act.ctx.lights.set('bath', true); D.advance(0.3); return D.use('seat'); });
  await shot('seat');
  await ev('doorNote', async () => { const D = OC.debug; D.teleport(6.2, 16.5, Math.PI / 2, -0.05); D.aim(5.11, 1.48, 16.63); OC.game.act.ctx.lights.set('hall', true); D.advance(0.3); const tgt = OC.game.interact.target; return tgt ? tgt.id : 'none'; });
  await shot('doornote');
  await ev('doorNoteRead', async () => { OC.debug.use('doorNote'); OC.debug.advance(0.2); const r = OC.hud.isReading(); await T.closeReader(); return r; });
  await ev('bed', () => { const D = OC.debug; D.teleport(3.3, 15.6, Math.PI / 2, -0.35); D.advance(0.3); return D.use('bed2'); });
  await shot('bed-made');
  await ev('laundry', async () => { const D = OC.debug; D.teleport(4.2, 10.5, Math.PI / 2, -0.55); D.advance(1.5); return 'hatchSeen ' + T.st('changes').hatchSeen + ', ajar ' + OC.game.props.hatch.ajar; });
  await shot('hatch-prints');
  await ev('prints', () => { const D = OC.debug; const r = D.use('prints'); D.use('keyHook'); return r + ', wrong ' + T.act().mods.changes.count() + '/' + T.act().mods.changes.total; });
  await ev('slider', async () => {
    const D = OC.debug;
    D.goto('latch', Math.PI);
    D.advance(1.5);
    D.use('slider');
    D.advance(0.5);
    D.use('slider');
    const tried = T.st('changes').latchTried;
    D.goto('broom', 0);
    D.use('broom');
    D.goto('latch', Math.PI);
    D.use('slider');
    return 'latchTried ' + tried + ', secure ' + T.done('secure') + ', stage ' + T.act().flags.stage;
  });
  await ev('foodGone', async () => {
    const D = OC.debug;
    D.teleport(6, 14, Math.PI, 0);
    await T.until(() => T.st('arrival').foodGone, 12);
    D.goto('groceries', 0);
    D.aim(9.4, 0.8, 4.3);
    D.advance(1);
    return 'gone ' + T.st('arrival').foodGone + ', noticed ' + T.st('arrival').foodNoticed + ', dog food still ' + OC.game.props.changes.groceries.has('dogFood');
  });
  await shot('food-gone');
  await ev('unpack', async () => {
    const D = OC.debug;
    D.advance(9);
    D.use('batteries');
    D.use('dogFood');
    D.use('bin');
    D.use('bowl');
    D.goto('junkDrawer', 0);
    D.use('drawer');
    const found = T.st('arrival').torchFound;
    D.use('drawer');
    D.use('fridge');
    D.advance(6);
    return 'found ' + found + ', unpack ' + T.done('unpack') + ', power ' + OC.game.ctl.light.power + ', fed ' + T.st('arrival').fed;
  });

  // ---- the storm, the breaker --------------------------------------------------------------------------
  await ev('storm', async () => {
    const r = await T.until(() => T.st('dread').stormed, 30);
    OC.debug.advance(3);
    return r + ' s, level ' + T.act().weather.storm.level().toFixed(2);
  });
  await ev('rain', async () => { const D = OC.debug; D.teleport(21, 6.6, Math.PI, 0.1); T.act().weather.setLevel(1); D.advance(8); T.act().weather.strike(1, 0.4); D.advance(0.05); return 'flash ' + T.act().weather.flash.toFixed(2) + ', where ' + T.act().weather.where(); });
  await shot('lightning');
  await ev('breakerTrip', async () => {
    const D = OC.debug;
    D.teleport(9, 2.2, 0, 0);
    const r = await T.until(() => T.st('dread').breaker === 'tripped', 80);
    D.advance(8);
    return r + ' s, power ' + T.act().ctx.lights.hasPower() + ', task shown ' + OC.debug.stats().tasks.some((x) => x.id === 'breaker');
  });
  await shot('power-out');
  await ev('breakerReset', async () => {
    const D = OC.debug;
    D.goto('breaker', Math.PI / 2);
    D.aim(0.16, 1.5, 10.5);
    D.advance(2.5);
    const breath = T.st('dread').breathSaid;
    const tgt = OC.game.interact.target;
    D.use('breaker');
    D.advance(4);
    return 'breath ' + breath + ', target ' + (tgt ? tgt.id : 'none') + ', power ' + T.act().ctx.lights.hasPower() + ', prints ' + OC.game.props.changes.prints.showing();
  });
  await ev('printsOut', async () => { const D = OC.debug; D.teleport(1.6, 11.6, -Math.PI / 2 - 0.5, -0.6); D.advance(0.5); return D.use('printsOut'); });
  await shot('prints-out');

  // ---- under the house ---------------------------------------------------------------------------------
  await ev('hatch', async () => {
    const D = OC.debug;
    D.advance(8);
    D.goto('hatch', 0);
    D.use('hatch');
    await new Promise((r) => setTimeout(r, 0));
    const n = document.querySelectorAll('#choiceOpts .opt').length;
    D.choose(2);
    await new Promise((r) => setTimeout(r, 0));
    await T.until(() => T.act().flags.inCrawl, 4, 0.1);
    D.advance(2.5);
    return n + ' options, inCrawl ' + T.act().flags.inCrawl + ', prone ' + OC.game.ctl.prone + ', eye ' + OC.game.render.camera.position.y.toFixed(2);
  });
  await shot('crawl-in');
  await ev('crawlWalk', async () => {
    const D = OC.debug;
    // crawl east to the gap in the stem wall, with real key presses
    const c = OC.game.ctl;
    c.yaw = -Math.PI / 2;
    T.key('KeyW');
    D.advance(2);
    T.key('KeyW', true);
    return 'x ' + c.pos.x.toFixed(2) + ' (0.85 m/s for 2 s from 202.5)';
  });
  await ev('glow', async () => { const D = OC.debug; D.teleport(204.1, 13.4, Math.PI - 0.9, 0); D.advance(1); return 'glowSaid ' + T.st('under').glowSaid; });
  await shot('crawl-glow');
  await ev('nest', async () => { const D = OC.debug; D.teleport(202.6, 15.3, Math.PI / 2 + 0.2, -0.08); D.advance(4); return 'nestSaid ' + T.st('under').nestSaid; });
  await shot('crawl-nest');
  await ev('crawlLooks', async () => {
    const D = OC.debug;
    const out = [];
    for (const id of ['soup', 'tupperware', 'kibble', 'tally', 'up', 'moon']) out.push(D.use('crawl.' + id));
    D.use('crawl.photo');
    await T.closeReader();
    return out.join() + ', seen ' + Object.keys(T.st('under').seen).length;
  });
  await ev('notebook', async () => {
    const D = OC.debug;
    D.teleport(201.75, 15.3, Math.PI / 2, -0.25);
    D.advance(0.3);
    const tgt = OC.game.interact.target;
    D.use('crawl.notebook');
    D.advance(0.2);
    return (tgt ? tgt.id : 'none') + ', title: ' + document.getElementById('readerTitle').textContent + ' | ' + document.getElementById('readerBody').textContent.split('\n').slice(0, 3).join(' / ');
  });
  await shot('notebook-1');
  await ev('notebookPages', async () => {
    const pages = [];
    for (let i = 0; i < 6 && OC.hud.isReading(); i++) {
      pages.push(document.getElementById('readerTitle').textContent.trim());
      if (/PLAN/.test(pages[pages.length - 1])) await page_shot();
      await new Promise((r) => setTimeout(r, 300));
      document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
      OC.debug.advance(0.1);
    }
    return pages.join(' > ');
    function page_shot() { window.__planBody = document.getElementById('readerBody').textContent; }
  });
  await ev('plan', () => window.__planBody || 'no plan page');
  await ev('bookChoice', async () => {
    const D = OC.debug;
    await T.until(() => OC.game.phone.choosing(), 12);
    D.choose(2);
    await new Promise((r) => setTimeout(r, 0));
    D.advance(1);
    return 'book ' + T.st('under').book + ', shown ' + OC.game.g.crawl.book.visible;
  });
  await ev('overheadSteps', async () => {
    const D = OC.debug;
    const o = T.act().mods.under.overhead;
    await T.until(() => o.phase() === 'following', 8);
    const c = OC.game.ctl;
    c.yaw = Math.PI / 2 + Math.PI; // east
    for (let i = 0; i < 2; i++) {
      T.key('KeyW');
      D.advance(3);
      T.key('KeyW', true);
      D.advance(2.2);
    }
    return 'phase ' + o.phase() + ', stops ' + o.stops() + ', stepsSaid ' + T.st('under').stepsSaid;
  });
  await ev('sit', async () => {
    const r = await T.until(() => T.st('under').sat, 30);
    OC.debug.advance(2.2);
    return r + ' s';
  });
  await shot('crawl-dust');
  await ev('ring', async () => {
    const r = await T.until(() => T.st('under').rang, 20);
    OC.debug.advance(11);
    return r + ' s, ringing ' + !!T.st('dread').ring;
  });
  await ev('climb', async () => {
    const D = OC.debug;
    D.teleport(202.5, 11.3, 0, 0.5);
    D.advance(0.3);
    const tgt = OC.game.interact.target;
    D.use('crawl.climb');
    await T.until(() => !T.act().flags.inCrawl, 4, 0.1);
    D.advance(2);
    return (tgt ? tgt.id : 'none') + ', out ' + !T.act().flags.inCrawl + ', prone ' + OC.game.ctl.prone + ', room ' + OC.debug.stats().room;
  });

  // ---- the house phone, and bed ----------------------------------------------------------------------------
  await ev('answer', async () => {
    const D = OC.debug;
    D.goto('landline', Math.PI);
    D.aim(7.5, 1.4, 7.82);
    D.advance(0.3);
    const tgt = OC.game.interact.target;
    D.use('landline');
    D.advance(1);
    return (tgt ? tgt.id : 'none') + ', talking ' + T.act().ctx.talking();
  });
  await shot('landline');
  await ev('daveCall', async () => { const r = await T.talkThrough([1, 2]); return r + ' s, done ' + T.done('landline') + ', stage ' + T.act().flags.stage; });
  await ev('after', async () => {
    const D = OC.debug;
    D.teleport(20, 4, 0, 0);
    const r = await T.until(() => T.st('dread').bedOpen, 80);
    return r + ' s, hummed ' + T.st('dread').hummed + ', chair ' + OC.game.props.changes.chair.where + ', texts ' + OC.game.phone.messages().filter((m) => m.thread === 'ethan').length;
  });
  await ev('chairHall', async () => {
    const D = OC.debug;
    D.teleport(6, 10.5, Math.PI, 0);
    D.advance(1.5);
    return 'said ' + T.st('dread').chairSaid;
  });
  await shot('chair-hall');
  await ev('pillow', async () => {
    const D = OC.debug;
    D.advance(10);
    D.goto('bed', Math.PI / 2);
    D.aim(0.42, 0.75, 15.6);
    D.advance(0.3);
    await page_noop();
    D.use('bed');
    D.advance(0.2);
    const reading = OC.hud.isReading();
    return 'reading ' + reading + ': ' + document.getElementById('readerBody').textContent.replace(/\n/g, ' ');
    function page_noop() {}
  });
  await shot('pillow');
  await ev('sleep', async () => {
    const D = OC.debug;
    await T.closeReader();
    D.advance(7);
    D.use('bed');
    D.advance(6);
    return 'sleeping ' + T.st('dread').sleeping + ', notif ' + document.getElementById('notif').textContent;
  });
  await ev('act3', async () => {
    await T.until(() => T.act() && OC.game.current.id !== 'act2', 40);
    if (OC.game.current.id === 'act2') {
      await new Promise((res) => setTimeout(res, 13500));
    }
    return 'now ' + OC.game.current.id + ', log ' + OC.game.g.habits.entries().filter((e) => ['notebook', 'satOn', 'breakerReset', 'daveLandline', 'gotNoteBack'].includes(e.action)).map((e) => e.action + (e.detail.kind ? ':' + e.detail.kind : '')).join();
  });
  return { errors: errs, log };
}
