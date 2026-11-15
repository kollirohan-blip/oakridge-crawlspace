// Boot and main loop.
(function () {
  var OC = (window.OC = window.OC || {});

  function boot() {
    if (!window.THREE) {
      throw new Error('Three.js did not load. Connect to the internet, or put three.min.js (r128) in the vendor/ folder.');
    }
    var r = OC.render.init();
    var world = OC.world.build(r.scene, OC.house);
    world.commit(); // props added in later tasks go in before this call
    var ctl = OC.controller.create(r.camera, world.boxes);

    var params = new URLSearchParams(location.search);
    var spawn = OC.house.spawns[params.get('spawn')] || OC.house.spawns.living;
    ctl.teleport(spawn.x, spawn.z, spawn.yaw, 0);

    ctl.onLockChange = function (locked) {
      OC.hud.showClickPanel(!locked);
    };
    OC.hud.showClickPanel(true);
    document.getElementById('click-panel').addEventListener('click', function () {
      ctl.requestLock();
    });

    var clock = OC.clock.gameClock({ startMin: 19 * 60 + 30, endMin: 25 * 60 + 30, durationSec: 15 * 60 });
    var samples = [];
    var last = performance.now();

    function frame(now) {
      var dt = Math.min((now - last) / 1000, 0.1); // a hidden tab coming back must not jump
      last = now;
      var t0 = performance.now();
      if (ctl.locked) clock.tick(dt);
      ctl.update(dt);
      OC.hud.setStamp(1, clock.label());
      OC.hud.setBattery(ctl.light.battery);
      r.render();
      samples.push(performance.now() - t0);
      if (samples.length > 120) samples.shift();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    OC.game = { render: r, world: world, ctl: ctl, clock: clock };

    // hooks for automated checks
    OC.debug = {
      lock: function () { ctl.setLocked(true); },
      unlock: function () { ctl.setLocked(false); },
      teleport: function (x, z, yaw, pitch) { ctl.teleport(x, z, yaw, pitch); },
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
