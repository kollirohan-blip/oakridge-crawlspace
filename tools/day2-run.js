// A scripted run of Day 2, start to finish, for the Playwright MCP's browser_run_code tool (its body is
// the function below; it gets `page`). Serve the game first: node tools/serve.js
// It plays the morning (Cooper's nap, coffee, the bowl, the pet cam clip, every call), calls Ray and
// takes his tour, reads Ethan's link, does the afternoon lore, drives to the Gas-N-Go, shops, meets
// the hooded shopper, pays, and drives home past the deer and the man at the roadside into Night 2.
// Screenshots go to .playwright-mcp/day2-*.png. Returns the beats reached and every console error.
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
    await page.screenshot({ path: '.playwright-mcp/day2-' + name + '.png' });
  };
  await page.evaluate(() => {
    window.T = {
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      act: () => OC.game.act,
      closeReader: async () => {
        await new Promise((r) => setTimeout(r, 320));
        document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
        document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
        OC.debug.advance(0.1);
      },
      // play a conversation through, always taking choice n (or a list of choices in order)
      talkThrough: async (picks) => {
        const D = OC.debug;
        const a = OC.game.act;
        let i = 0;
        for (let t = 0; t < 240; t += 0.5) {
          D.advance(0.5);
          await new Promise((r) => setTimeout(r, 0));
          if (OC.game.phone.choosing()) {
            const p = Array.isArray(picks) ? picks[Math.min(i, picks.length - 1)] : picks || 1;
            i++;
            D.choose(p);
            await new Promise((r) => setTimeout(r, 0));
          }
          if (!a.ctx.talking()) return t;
        }
        return 'still talking';
      },
      until: async (pred, max) => {
        const D = OC.debug;
        for (let t = 0; t < max; t += 0.5) {
          if (pred()) return t;
          D.advance(0.5);
          await new Promise((r) => setTimeout(r, 0));
        }
        return pred() ? max : 'timed out';
      },
      done: (id) => OC.game.act.director.done(id),
    };
  });

  // ---- the morning --------------------------------------------------------------------------------
  await ev('start', () => { const D = OC.debug; D.startAct('day2'); D.lock(); D.advance(2); return document.getElementById('stamp').textContent; });
  await shot('wake');
  await ev('nap', () => {
    const D = OC.debug;
    D.teleport(19.6, 4.0, 0, 0);
    D.aim(21.3, 0.3, 5.3);
    D.advance(0.3);
    return OC.game.cooper.poseName;
  });
  await shot('sunpatch');
  await ev('petCooper', () => OC.debug.use('napCooper'));
  await ev('coffee', () => { OC.debug.use('coffee'); return T.done('coffee'); });
  await ev('bowl', () => { OC.debug.use('bowl'); OC.debug.advance(1); return T.done('feedCooper'); });
  await ev('clip', async () => {
    const D = OC.debug;
    await T.until(() => T.act().mods.morning.state.clip === 'ready', 20);
    D.phoneApp('petcam');
    D.advance(4);
    return OC.game.g.petcam.playingClip() ? 'playing' : 'not playing';
  });
  await shot('clip');
  await ev('clipSeen', async () => {
    const D = OC.debug;
    await T.until(() => T.done('petcam'), 12);
    D.phoneApp(null);
    return T.done('petcam') && OC.game.g.petcam.turned();
  });
  await ev('turnCam', () => { const D = OC.debug; D.use('turnCam'); return T.done('turnCam') && !OC.game.g.petcam.turned(); });
  await ev('texts', async () => { await T.until(() => T.act().flags.daveTexted, 40); return OC.game.phone.messages().length; });
  await ev('callMom', async () => {
    OC.game.phone.call('mom');
    const r = await T.talkThrough([2, 2]);
    return r + ' s, done ' + T.done('callMom');
  });
  await ev('callDave', async () => {
    OC.game.phone.call('dave');
    const r = await T.talkThrough([1, 1, 1]);
    OC.debug.advance(5);
    return r + ' s, done ' + T.done('callDave') + ', contacts ' + OC.game.phone.contacts().map((c) => c.id).join();
  });
  await shot('call');
  await ev('callEthan', async () => {
    OC.game.phone.call('ethan');
    const r = await T.talkThrough(1);
    OC.debug.advance(6);
    return r + ' s';
  });
  await ev('article', async () => {
    const l = OC.game.phone.openLink();
    OC.debug.advance(0.2);
    const reading = OC.hud.isReading();
    await T.closeReader();
    return (l ? l.title : 'no link') + ', reading ' + reading + ', after ' + OC.hud.isReading();
  });
  await ev('callRay', async () => {
    OC.game.phone.call('ray');
    const r = await T.talkThrough(1);
    return r + ' s, ' + OC.game.g.habits.has('calledDeputy') + ', ' + T.act().mods.deputy.state.stage;
  });
  await ev('cruiser', async () => {
    const D = OC.debug;
    D.teleport(2.5, -4.5, Math.PI, 0);
    await T.until(() => T.act().mods.deputy.state.stage === 'walking', 40);
    D.aim(10, 0.8, -16);
    return T.act().mods.deputy.state.stage;
  });
  await shot('cruiser');
  await ev('knock', async () => {
    const D = OC.debug;
    D.teleport(2.5, 1.2, 0, 0);
    await T.until(() => T.act().mods.deputy.state.stage === 'knocking', 30);
    return D.use('answerDoor');
  });
  await ev('tour', async () => {
    const D = OC.debug;
    const a = T.act();
    const seen = [];
    for (let t = 0; t < 200 && a.ctx.talking(); t += 0.5) {
      D.advance(0.5);
      await new Promise((r) => setTimeout(r, 0));
      if (OC.game.phone.choosing()) D.choose(1);
      const n = a.mods.deputy.state.talk.node();
      if (seen[seen.length - 1] !== n) seen.push(n);
    }
    return seen.join(' > ');
  });
  await ev('rayLeaves', async () => {
    await T.until(() => T.act().mods.deputy.state.stage === 'done', 60);
    return T.act().mods.deputy.state.stage + ', ' + OC.game.g.habits.has('rayVisited');
  });
  await ev('afternoon', async () => {
    await T.until(() => T.act().flags.phase === 'afternoon', 10);
    OC.debug.advance(2);
    return T.act().flags.phase + ' ' + OC.game.clock.label();
  });

  // ---- the afternoon ------------------------------------------------------------------------------
  await ev('closet', () => { const D = OC.debug; D.goto('closet', 0); D.use('closet'); return T.done('unpack'); });
  await ev('growth', async () => {
    const D = OC.debug;
    D.teleport(2.9, 17.3, Math.PI / 2, 0);
    D.aim(1.9, 1.6, 17.74);
    D.advance(0.3);
    return OC.game.interact.target ? OC.game.interact.target.id : 'nothing';
  });
  await shot('growth');
  await ev('readGrowth', async () => { OC.debug.use('growth'); await T.closeReader(); return OC.game.g.habits.has('sawGrowthMarks'); });
  await ev('email', async () => { const D = OC.debug; D.teleport(9.3, 9.6, 0, 0); D.use('computer'); await T.closeReader(); return T.done('email'); });
  await ev('shed', async () => {
    const D = OC.debug;
    D.teleport(27.6, -4.4, -Math.PI / 2 - 0.4, -0.35);
    D.advance(0.3);
    return 'ok';
  });
  await shot('shed');
  await ev('shedLore', async () => {
    const D = OC.debug;
    for (const id of ['photo', 'yearbook', 'haleBoxes']) {
      D.use(id);
      await T.closeReader();
    }
    D.use('hook');
    D.use('kibble');
    return T.done('dogFood');
  });
  await ev('errand', async () => { await T.until(() => T.act().flags.phase === 'errand', 6); return T.act().flags.phase; });

  // ---- the store trip -----------------------------------------------------------------------------
  await ev('drive', async () => {
    const D = OC.debug;
    D.goto('car', 0);
    D.use('car');
    await T.until(() => T.act().mods.trip.state.stage === 'driveOut', 4);
    D.advance(14);
    return T.act().mods.trip.state.stage + ' at ' + Math.round(T.act().mods.trip.state.speed) + ' m/s';
  });
  await shot('drive');
  await ev('shop', async () => {
    await T.until(() => T.act().mods.trip.state.stage === 'shop', 70);
    OC.debug.advance(1.5);
    return T.act().flags.phase + ' ' + OC.game.clock.label();
  });
  await shot('lot');
  await ev('shopping', () => {
    const D = OC.debug;
    D.teleport(397.9, 5.6, Math.PI / 2, -0.3);
    D.use('grabDogFood');
    D.teleport(402.9, 2.1, 0, -0.4);
    D.use('grabBatteries');
    return OC.game.phone.messages && T.act().mods.trip.list.map((l) => l[0]).join();
  });
  await ev('shopper', async () => {
    const D = OC.debug;
    D.teleport(398.4, 2.2, Math.PI, 0);
    D.advance(0.5);
    D.aim(398.4, 1.7, 6.85);
    return T.act().mods.trip.state.wes;
  });
  await shot('shopper');
  await ev('shopperLeaves', async () => {
    const r = await T.until(() => T.act().mods.trip.state.wes === 'gone', 40);
    return r + ' s, ' + T.act().mods.trip.state.wes;
  });
  await ev('board', async () => {
    const D = OC.debug;
    D.teleport(395.4, 1.9, Math.PI / 2, 0);
    D.advance(0.2);
    D.use('board');
    D.advance(0.2);
    return OC.hud.isReading();
  });
  await shot('board');
  await ev('boardClose', async () => { await T.closeReader(); return OC.game.g.habits.has('sawPoster'); });
  await ev('snack', async () => {
    const D = OC.debug;
    D.teleport(401.0, 3.8, -Math.PI / 2, -0.2);
    D.use('grabSnack');
    await new Promise((r) => setTimeout(r, 0));
    D.choose(2);
    await new Promise((r) => setTimeout(r, 0));
    if (T.act().mods.trip.list.some((l) => l[0] === 'milk')) D.use('grabMilk');
    return T.act().mods.trip.allPicked();
  });
  await ev('pay', async () => {
    const D = OC.debug;
    D.teleport(404.0, 2.4, 0, 0);
    D.use('cashier');
    D.advance(1);
    return 'talking ' + T.act().ctx.talking();
  });
  await shot('cashier');
  await ev('paid', async () => { const r = await T.talkThrough([1, 1]); return r + ' s, paid ' + T.act().mods.trip.state.paid; });
  await ev('home', async () => {
    const D = OC.debug;
    D.teleport(394.8, -10.2, Math.PI, 0);
    D.use('shopCar');
    await T.until(() => T.act().mods.trip.state.stage === 'driveHome', 4);
    return T.act().flags.phase + ' ' + OC.game.clock.label();
  });
  await ev('deer', async () => {
    const r = await T.until(() => T.act().mods.trip.state.deer === 'standing', 40);
    OC.debug.advance(2.5);
    return r + ' s';
  });
  await shot('deer');
  await ev('roadside', async () => {
    const r = await T.until(() => T.act().mods.trip.state.deer === 'passing', 15);
    OC.debug.advance(1.5);
    return r + ' s';
  });
  await shot('roadside');
  await ev('night2', async () => {
    const r = await T.until(() => T.act().mods.trip.state.stage === 'ending', 40);
    await new Promise((res) => setTimeout(res, 13500));
    return r + ' s, now ' + OC.game.current.id;
  });
  return { errors: errs, log };
}
