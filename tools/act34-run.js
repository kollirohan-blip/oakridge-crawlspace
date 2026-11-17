// A scripted run of 12:30 AM ("The Call") and 12:35 AM ("The Search") for the Playwright MCP's
// browser_run_code tool (its body is the function below; it gets `page`). Serve the game first:
// node tools/serve.js. Plays Act 3 to the bathroom (Dave's call, the taps, the flash photo, Ethan, the
// bluff, the walk), the closet bad end on its own, and Act 4 through the bathroom, the search (a hide,
// a catch), the chain, the car and the face at the glass, to the end. Screenshots go to
// .playwright-mcp/act34-*.png. Returns the beats it reached and every console error.
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
    await page.screenshot({ path: '.playwright-mcp/act34-' + name + '.png' });
  };
  await page.evaluate(() => {
    window.T = {
      act: () => OC.game.act,
      until: async (pred, max, step) => {
        const D = OC.debug;
        for (let t = 0; t < max; t += step || 0.5) {
          if (pred()) return t;
          D.advance(step || 0.5);
          await new Promise((r) => setTimeout(r, 0));
        }
        return pred() ? max : 'timed out';
      },
      // answer every choice that comes up with `pick` until pred() is true
      answering: async (pick, pred, max) => {
        const D = OC.debug;
        for (let t = 0; t < max; t += 0.5) {
          if (pred()) return t;
          D.advance(0.5);
          await new Promise((r) => setTimeout(r, 0));
          if (OC.game.phone.choosing()) {
            D.choose(typeof pick === 'function' ? pick() : pick);
            await new Promise((r) => setTimeout(r, 0));
          }
        }
        return pred() ? max : 'timed out';
      },
      key: (code, up) => window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code })),
      aimAt: (p) => {
        const c = OC.game.ctl;
        const dx = p.x - c.pos.x;
        const dz = p.z - c.pos.z;
        c.yaw = Math.atan2(-dx, -dz);
        c.pitch = Math.atan2(p.y - OC.game.render.camera.position.y, Math.hypot(dx, dz));
      },
    };
  });

  // ---- Act 3 ------------------------------------------------------------------------------------------
  await ev('act3', () => {
    const D = OC.debug;
    OC.game.g.habits.log('calledDeputy', {}, { clock: '11:40 AM' });
    D.startAct('act3');
    D.lock();
    D.advance(2);
    return OC.game.current.id + ' ' + document.getElementById('stamp').textContent;
  });
  await ev('dave', async () => {
    await T.until(() => T.act().flags.phase === 'dave', 15);
    OC.debug.advance(6);
    return document.getElementById('callName').textContent + ': ' + document.getElementById('callLines').textContent.slice(0, 90);
  });
  await shot('dave-call');
  await ev('taps', async () => {
    const r = await T.answering(1, () => T.act().flags.phase === 'taps', 120);
    await T.until(() => OC.game.phone.choosing(), 6, 0.25);
    return r + ' s, choosing ' + OC.game.phone.choosing() + ': ' + document.getElementById('choicePrompt').textContent;
  });
  await shot('taps');
  await ev('cooper', async () => {
    OC.debug.choose(2);
    await new Promise((r) => setTimeout(r, 0));
    const r = await T.until(() => T.act().flags.phase === 'photo', 20);
    return r + ' s, photo task shown ' + OC.debug.stats().tasks.length;
  });
  await ev('photo', async () => {
    const D = OC.debug;
    T.aimAt(OC.game.props.closet.eyeAt);
    D.phoneApp('camera');
    D.advance(0.2);
    const p = D.shoot();
    D.advance(0.15);
    return 'subject ' + (p && p.subject) + ', phase ' + T.act().flags.phase + ', big photo ' + document.getElementById('flashImage').classList.contains('on');
  });
  await shot('eye-photo');
  await ev('ethan', async () => {
    const r = await T.until(() => T.act().flags.phase === 'choice', 40);
    await T.until(() => OC.game.phone.choosing(), 4, 0.25);
    return r + ' s: ' + document.getElementById('callLines').textContent.slice(-80);
  });
  await shot('bluff');
  await ev('survive', async () => {
    OC.debug.choose(3);
    await new Promise((r) => setTimeout(r, 0));
    const r = await T.until(() => T.act().flags.phase === 'walk', 40);
    return r + ' s, standing ' + !OC.game.ctl.frozen;
  });
  await ev('walk', async () => {
    const D = OC.debug;
    D.teleport(1.0, 14.9, Math.PI / 2 + 0.3, -0.3);
    T.aimAt({ x: 0.33, y: 0.62, z: 14.5 });
    D.advance(0.2);
    const took = D.use('charger');
    D.teleport(4.0, 16.0, -Math.PI / 2, 0);
    D.advance(0.4);
    D.teleport(6.0, 18.5, Math.PI, 0);
    D.advance(2);
    D.teleport(3.5, 21.5, -Math.PI / 2, 0);
    await T.until(() => OC.game.current.id === 'act4', 3);
    await new Promise((r) => setTimeout(r, 2800));
    return 'charger ' + took + ', now ' + OC.game.current.id + ', battery ' + OC.game.ctl.light.battery.toFixed(2);
  });

  // ---- the closet ending ----------------------------------------------------------------------------------
  await ev('bad', async () => {
    const D = OC.debug;
    D.startAct('act3');
    D.lock();
    await T.answering(1, () => T.act().flags.phase === 'taps', 140);
    await T.until(() => OC.game.phone.choosing(), 6, 0.25);
    D.choose(3);
    await new Promise((r) => setTimeout(r, 0));
    D.advance(3.6);
    return 'phase ' + T.act().flags.phase + ', wes ' + OC.game.props.intruder.visible();
  });
  await shot('closet-open');
  await ev('badEnd', async () => {
    await new Promise((r) => setTimeout(r, 5500));
    OC.debug.advance(12);
    return 'now ' + OC.game.current.id + ', variant ' + (OC.game.act && OC.game.act.variant);
  });

  // ---- Act 4 -----------------------------------------------------------------------------------------------
  await ev('act4', () => {
    const D = OC.debug;
    D.startAct('act4');
    D.lock();
    D.advance(1);
    D.use('bathDoor');
    D.use('shower');
    D.use('window');
    return 'locked ' + T.act().flags.doorLocked + ', shower ' + T.act().flags.showerOn;
  });
  await ev('feet', async () => {
    const D = OC.debug;
    await T.until(() => T.act().flags.seq, 3);
    D.advance(13.5);
    D.teleport(3.6, 21.5, -Math.PI / 2, -0.62);
    D.advance(0.2);
    return 'feet ' + OC.game.g.cache.bathGap.mesh.visible;
  });
  await shot('feet');
  await ev('leaves', async () => {
    const r = await T.until(() => T.act().flags.unlockReady, 30);
    return r + ' s, search ' + T.act().search.job() + ' at ' + T.act().search.pos().x.toFixed(1) + ',' + T.act().search.pos().z.toFixed(1);
  });
  await ev('unlock', () => {
    const D = OC.debug;
    D.teleport(4.2, 21.5, -Math.PI / 2, 0);
    D.use('bathDoor');
    return 'phase ' + T.act().flags.phase;
  });
  await ev('watch', async () => {
    const D = OC.debug;
    // from the hall, dark, light off, watch him work
    OC.game.ctl.light.on = false;
    D.teleport(6.0, 17.5, 0, 0);
    await T.until(() => T.act().search.job() === 'check' || T.act().search.job() === 'listen', 40, 0.25);
    const sp = T.act().search.pos();
    return 'job ' + T.act().search.job() + ' in ' + T.act().search.room() + ' at ' + sp.x.toFixed(1) + ',' + sp.z.toFixed(1) + ', caught? ' + (OC.game.current.id !== 'act4');
  });
  await ev('hide', async () => {
    const D = OC.debug;
    const a = T.act();
    // under Dave's bed, while he works the rest of the house
    a.search.send('kitchen');
    D.teleport(9.6, 21.0, Math.PI, -0.4);
    D.advance(0.2);
    const used = D.use('hide.masterBed');
    D.advance(1);
    return 'used ' + used + ', hidden ' + a.flags.hidden + ', eye ' + OC.game.render.camera.position.y.toFixed(2);
  });
  await shot('under-bed');
  await ev('unhide', async () => {
    const D = OC.debug;
    D.advance(1);
    T.key('KeyE');
    T.key('KeyE', true);
    D.advance(0.3);
    return 'hidden ' + T.act().flags.hidden + ', modal ' + OC.game.g.state.modal;
  });
  await ev('door', async () => {
    const D = OC.debug;
    const a = T.act();
    a.search.send('master');
    D.teleport(4.0, 3.0, 0, 0);
    D.advance(0.6);
    return 'phase ' + a.flags.phase;
  });
  await ev('chain', async () => {
    const D = OC.debug;
    D.teleport(2.5, 1.0, 0, 0);
    D.advance(0.2);
    D.use('chain');
    D.advance(4);
    const behind = OC.game.props.intruder.visible();
    return 'tries ' + T.act().flags.chainTries + ', he is behind ' + behind;
  });
  await ev('turn', () => { const D = OC.debug; OC.game.ctl.yaw = Math.PI; OC.game.ctl.pitch = 0.15; D.advance(0.2); return 'looked'; });
  await shot('behind');
  await ev('open', async () => {
    const D = OC.debug;
    OC.game.ctl.yaw = 0;
    D.advance(0.2);
    D.use('chain');
    D.advance(0.6);
    return 'phase ' + T.act().flags.phase + ', door open ' + OC.game.props.frontDoor.isOpen;
  });
  await ev('car', async () => {
    const D = OC.debug;
    D.teleport(11.5, -9.6, 0, 0);
    D.advance(0.2);
    D.use('car');
    D.advance(0.8);
    D.use('ignition');
    await T.until(() => T.act().flags.phase === 'exposed', 12);
    D.advance(1);
    D.use('down');
    return 'phase ' + T.act().flags.phase;
  });
  await ev('face', async () => {
    const r = await T.until(() => T.act().flags.atWindow, 40, 0.25);
    await T.until(() => OC.game.act.weather.flash > 0.5, 6, 0.05);
    return r + ' s to the window, flash ' + OC.game.act.weather.flash.toFixed(2);
  });
  await shot('face');
  await ev('end', async () => {
    const r = await T.until(() => T.act().flags.phase === 'won', 60);
    OC.debug.advance(5);
    return r + ' s, won; ray ' + !!T.act().flags.ray;
  });
  await shot('ray');
  await ev('epilogue', async () => {
    await new Promise((r) => setTimeout(r, 12500));
    return 'now ' + OC.game.current.id;
  });
  return { errors: errs, log };
}
