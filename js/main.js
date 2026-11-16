// Boot, the act manager, and the main loop.
(function () {
  var OC = (window.OC = window.OC || {});
  var ACT_ORDER = ['act1', 'act2', 'act3', 'act4'];
  var FLOOR_SURFACE = { floorboards: 'wood', tile: 'tile', carpet: 'carpet', concrete: 'concrete' };

  function boot() {
    if (!window.THREE) {
      throw new Error('Three.js did not load. Connect to the internet, or put three.min.js (r128) in the vendor/ folder.');
    }

    // every act's text must exist before anything starts
    var required = [];
    ACT_ORDER.concat(['epilogue']).forEach(function (id) {
      var def = id === 'epilogue' ? OC.epilogue : OC.acts && OC.acts[id];
      if (def && def.requiredText) required = required.concat(def.requiredText);
    });
    var content = OC.content.createContent(OC.textData || {}, required);
    var missing = content.missing();
    if (missing.length) throw new Error('The game is missing story text for:\n' + missing.join('\n'));

    var r = OC.render.init();
    var world = OC.world.build(r.scene, OC.house);
    var props = OC.props.build(world, OC.house);
    world.commit();
    var ctl = OC.controller.create(r.camera, world.boxes);
    ctl.nav = OC.path.createNavGrid({ boxes: world.boxes, x0: -6, z0: -14, x1: 34, z1: 34, step: 0.25, radius: 0.25 });
    var cooper = OC.cooper.create(world, ctl, { x: 15.5, z: 5.5 });
    var interact = OC.interact.create(ctl, r.camera);
    var phone = OC.phone.create(ctl);

    var rooms = {};
    OC.house.rooms.forEach(function (rm) { rooms[rm.id] = rm; });
    function surfaceAt(x, z) {
      var id = OC.layout.roomAt(OC.house, x, z);
      if (id) return FLOOR_SURFACE[rooms[id].floor] || 'wood';
      if (x > 0.7 && x < 4.3 && z > -2.4 && z < 0) return 'wood';
      if ((x > 16 && x < 23 && z > 8 && z < 12.5) || (x > 7.5 && x < 12.5 && z > -27 && z < -1)) return 'concrete';
      return 'grass';
    }
    ctl.onStep = function () {
      if (OC.audio) OC.audio.play('step', { surface: surfaceAt(ctl.pos.x, ctl.pos.z), gain: 0.55 });
    };
    if (OC.audio) {
      OC.audio.setOcclusion(function (pos) {
        return !OC.sightline.lineOfSight(ctl.boxes, { x: ctl.pos.x, z: ctl.pos.z }, pos, Math.max(0.3, pos.y || 1));
      });
    }

    // the shared game handle every act receives
    var g = {
      ctl: ctl,
      camera: r.camera,
      world: world,
      props: props,
      cooper: cooper,
      interact: interact,
      phone: phone,
      hud: OC.hud,
      t: content.t,
      audio: OC.audio || null,
      drone: null,
      clock: null,
      state: { cutscene: false },
      onEnd: null,
    };

    var current = { id: null, def: null, act: null };

    function startAct(id) {
      var def = OC.acts[id];
      if (current.act && current.act.dispose) current.act.dispose(); // stop the last act's loops and listeners
      interact.clear();
      g.state.cutscene = false;
      g.clock = OC.clock.gameClock(def.clockDef);
      var spawnName = new URLSearchParams(location.search).get('spawn');
      var spawn = OC.house.spawns[spawnName] || OC.house.spawns[def.spawn];
      ctl.stand();
      ctl.teleport(spawn.x, spawn.z, spawn.yaw, 0);
      r.camera.fov = 72; // a set piece may have narrowed it
      r.camera.updateProjectionMatrix();
      OC.hud.setCrosshair(true);
      current.id = id;
      current.def = def;
      current.act = def.create(g);
      OC.hud.fadeIn();
      saveCheckpoint(id);
    }

    // a checkpoint at the start of each act, so closing the tab does not mean starting over
    function saveCheckpoint(id) {
      try {
        if (id) localStorage.setItem('oakridge.checkpoint', id);
        else localStorage.removeItem('oakridge.checkpoint');
      } catch (e) {
        /* private window or blocked storage: no checkpoints, nothing else changes */
      }
    }
    function loadCheckpoint() {
      try {
        return localStorage.getItem('oakridge.checkpoint');
      } catch (e) {
        return null;
      }
    }

    g.onEnd = function (id, outcome) {
      if (outcome === 'retry') return startAct(id);
      var next = ACT_ORDER[ACT_ORDER.indexOf(id) + 1];
      if (next && OC.acts[next]) return startAct(next);
      if (!next && OC.epilogue) {
        if (current.act && current.act.dispose) current.act.dispose();
        interact.clear();
        saveCheckpoint(null); // finished: the next visit starts fresh
        current.id = 'epilogue';
        current.act = OC.epilogue.create(g);
        return;
      }
      OC.hud.setFadeText('TO BE CONTINUED');
    };
    g.startAct = startAct;

    ctl.onLockChange = function (locked) {
      OC.hud.showClickPanel(!locked);
    };
    OC.hud.showClickPanel(true);
    document.getElementById('click-panel').addEventListener('click', function () {
      if (OC.audio) {
        OC.audio.init();
        if (!g.drone && OC.audio.ready()) g.drone = OC.audio.play('drone');
      }
      ctl.requestLock();
    });

    var params = new URLSearchParams(location.search);
    var saved = loadCheckpoint();
    var startAt = params.get('act') ? 'act' + Number(params.get('act')) : saved || 'act1';
    if (!OC.acts[startAt]) startAt = 'act1';
    if (!params.get('act') && saved && saved !== 'act1' && OC.acts[saved]) {
      var NAMES = { act2: 'Night 2, 8:30 PM', act3: 'Night 2, 12:30 AM', act4: 'Night 2, 12:35 AM' };
      document.querySelector('#click-panel .big').textContent = 'Click to continue (' + NAMES[saved] + ')';
      document.querySelector('#click-panel .small').textContent = 'Press N to start over from the beginning.';
      document.addEventListener('keydown', function (e) {
        if (e.code === 'KeyN' && !ctl.locked) {
          saveCheckpoint(null);
          location.reload();
        }
      });
    }
    startAct(startAt);

    var samples = [];
    var last = performance.now();
    var phoneClock = 0;

    // one step of the simulation (everything except drawing)
    function tick(dt) {
      if (ctl.locked && g.clock) g.clock.tick(dt);
      ctl.update(dt);
      if (OC.audio) OC.audio.listen(r.camera);
      interact.suspend(phone.isOpen || phone.choosing() || g.state.cutscene);
      interact.update(dt);
      if (ctl.locked) phone.update(dt); // a timed choice must not run out while the game is paused
      props.update(dt);
      cooper.update(dt);
      if (current.act) current.act.update(dt);
      if (current.def) OC.hud.setStamp(current.def.night, g.clock.label());
      OC.hud.setBattery(ctl.light.battery);
      phoneClock -= dt;
      if (phoneClock <= 0) {
        phoneClock = 0.5;
        phone.setTime(g.clock ? g.clock.label() : '');
        phone.setBattery(ctl.light.battery);
      }
    }

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1); // a hidden tab coming back must not jump
      last = now;
      var t0 = performance.now();
      tick(dt);
      r.render();
      samples.push(performance.now() - t0);
      if (samples.length > 120) samples.shift();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.body.setAttribute('data-booted', '1'); // for automated checks: the game started

    OC.game = { g: g, render: r, world: world, props: props, ctl: ctl, cooper: cooper, interact: interact, phone: phone, content: content, current: current };
    Object.defineProperty(OC.game, 'act', { get: function () { return current.act; } });
    Object.defineProperty(OC.game, 'clock', { get: function () { return g.clock; } });

    // hooks for automated checks
    OC.debug = {
      lock: function () { ctl.setLocked(true); },
      unlock: function () { ctl.setLocked(false); },
      teleport: function (x, z, yaw, pitch) { ctl.teleport(x, z, yaw, pitch); },
      startAct: startAct,
      // run the simulation forward by `seconds` in fixed steps, independent of the browser's frame rate
      advance: function (seconds, step) {
        step = step || 0.05;
        for (var t = 0; t < seconds - 1e-9; t += step) tick(step);
        r.render();
      },
      goto: function (name, yaw) {
        var s = OC.house.stand[name];
        ctl.teleport(s.x, s.z, typeof yaw === 'number' ? yaw : ctl.yaw, 0);
      },
      use: function (id) {
        var it = interact.items.filter(function (i) { return i.id === id; })[0];
        if (!it) throw new Error('no such item: ' + id);
        var en = typeof it.enabled === 'function' ? it.enabled() : it.enabled !== false;
        if (!en) return false;
        it.onUse();
        return true;
      },
      stats: function () {
        var avg = samples.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, samples.length);
        var a = current.act;
        return {
          act: current.id,
          calls: r.renderer.info.render.calls,
          triangles: r.renderer.info.render.triangles,
          frameMsAvg: Math.round(avg * 100) / 100,
          frames: samples.length,
          room: OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z),
          pos: { x: ctl.pos.x, z: ctl.pos.z },
          yaw: ctl.yaw,
          locked: ctl.locked,
          battery: ctl.light.battery,
          clock: g.clock ? g.clock.label() : null,
          tasks: a && a.director ? a.director.list() : [],
          actDone: a && a.director ? a.director.actDone() : false,
        };
      },
    };
  }

  try {
    boot();
  } catch (e) {
    console.error(e);
    OC.showError(e.message);
  }
})();
