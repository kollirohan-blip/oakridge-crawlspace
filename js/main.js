// Boot and main loop.
(function () {
  var OC = (window.OC = window.OC || {});

  function boot() {
    if (!window.THREE) {
      throw new Error('Three.js did not load. Connect to the internet, or put three.min.js (r128) in the vendor/ folder.');
    }
    var r = OC.render.init();
    var world = OC.world.build(r.scene, OC.house);
    var props = OC.props.build(world, OC.house);
    world.commit();
    var ctl = OC.controller.create(r.camera, world.boxes);
    ctl.nav = OC.path.createNavGrid({ boxes: world.boxes, x0: -6, z0: -14, x1: 34, z1: 34, step: 0.25, radius: 0.25 });

    var actDef = OC.acts.act1;
    var content = OC.content.createContent(OC.textData || {}, actDef.requiredText);
    var missing = content.missing();
    if (missing.length) throw new Error('The game is missing story text for:\n' + missing.join('\n'));

    var params = new URLSearchParams(location.search);
    var spawn = OC.house.spawns[params.get('spawn')] || OC.house.spawns[actDef.spawn];
    ctl.teleport(spawn.x, spawn.z, spawn.yaw, 0);

    var cooper = OC.cooper.create(world, ctl, { x: 15.5, z: 5.5 });
    var interact = OC.interact.create(ctl, r.camera);
    var clock = OC.clock.gameClock(actDef.clockDef);

    var act = actDef.create({
      ctl: ctl,
      camera: r.camera,
      world: world,
      props: props,
      cooper: cooper,
      interact: interact,
      hud: OC.hud,
      t: content.t,
      audio: OC.audio || null,
      onEnd: function (id) {
        console.log('act ended: ' + id);
      },
    });

    ctl.onLockChange = function (locked) {
      OC.hud.showClickPanel(!locked);
    };
    OC.hud.showClickPanel(true);
    document.getElementById('click-panel').addEventListener('click', function () {
      ctl.requestLock();
    });

    var samples = [];
    var last = performance.now();

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1); // a hidden tab coming back must not jump
      last = now;
      var t0 = performance.now();
      if (ctl.locked) clock.tick(dt);
      ctl.update(dt);
      interact.update(dt);
      props.update(dt);
      cooper.update(dt);
      act.update(dt);
      OC.hud.setStamp(actDef.night, clock.label());
      OC.hud.setBattery(ctl.light.battery);
      r.render();
      samples.push(performance.now() - t0);
      if (samples.length > 120) samples.shift();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    OC.game = { render: r, world: world, props: props, ctl: ctl, cooper: cooper, interact: interact, act: act, clock: clock, content: content };

    // hooks for automated checks
    OC.debug = {
      lock: function () { ctl.setLocked(true); },
      unlock: function () { ctl.setLocked(false); },
      teleport: function (x, z, yaw, pitch) { ctl.teleport(x, z, yaw, pitch); },
      // walk to a named spot where something is used
      goto: function (name, yaw) {
        var s = OC.house.stand[name];
        ctl.teleport(s.x, s.z, typeof yaw === 'number' ? yaw : ctl.yaw, 0);
      },
      // run an interaction as if the player had finished using it
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
        return {
          calls: r.renderer.info.render.calls,
          triangles: r.renderer.info.render.triangles,
          frameMsAvg: Math.round(avg * 100) / 100,
          frames: samples.length,
          room: OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z),
          pos: { x: ctl.pos.x, z: ctl.pos.z },
          yaw: ctl.yaw,
          locked: ctl.locked,
          battery: ctl.light.battery,
          clock: clock.label(),
          tasks: act.director.list(),
          actDone: act.director.actDone(),
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
