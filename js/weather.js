// The storm, seen and heard. js/engine/storm.js decides when; this draws the rain (streaks around
// the camera, none under a roof), flashes the sky for lightning (the whole yard lights for a quarter
// second, twice), and runs the rain, wind and thunder. Indoors the rain is on the roof; under the
// house it is a long way off.
//   var w = OC.weather.create(g); w.setLevel(0..1); w.strike(); w.update(dt); w.flash (0..1 now)
(function () {
  var OC = (window.OC = window.OC || {});
  var DROPS = 900;
  var R = 11; // metres around the camera
  var TOPY = 8;
  var SPEED = 15;
  var LEN = 0.55;
  var WIND = 0.16; // slant

  function create(g) {
    var scene = g.render.scene;
    var renderer = g.render.renderer;
    var world = g.world;
    var ctl = g.ctl;
    var storm = OC.storm.createStorm();
    var roofs = OC.house.roofs || [];
    function roofed(x, z) {
      for (var i = 0; i < roofs.length; i++) {
        var r = roofs[i];
        if (x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1) return true;
      }
      // the shed, and the Gas-N-Go's canopy
      return x > 25.3 && x < 29.7 && z > -7.7 && z < -3.3;
    }

    var pos = new Float32Array(DROPS * 6);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.LineBasicMaterial({ color: 0x4d5868, transparent: true, opacity: 0.4, depthWrite: false });
    var rain = new THREE.LineSegments(geo, mat);
    rain.frustumCulled = false;
    rain.visible = false;
    scene.add(rain);
    var drops = [];
    for (var i = 0; i < DROPS; i++) drops.push({ x: 0, y: -1, z: 0 });
    function respawn(d, anywhere) {
      var a = Math.random() * Math.PI * 2;
      var dist = Math.sqrt(Math.random()) * R;
      d.x = ctl.pos.x + Math.cos(a) * dist;
      d.z = ctl.pos.z + Math.sin(a) * dist;
      d.y = anywhere ? Math.random() * TOPY : TOPY;
      d.hidden = roofed(d.x, d.z);
    }

    var sounds = { rain: null, wind: null };
    var flashT = -1;
    var flashStrength = 0;
    var where = 'out';
    var hushT = 0;

    // two quick pulses and a tail
    function curve(t) {
      if (t < 0.07) return 1;
      if (t < 0.13) return 0.15;
      if (t < 0.22) return 0.8;
      return Math.max(0, 0.8 * (1 - (t - 0.22) / 0.3));
    }

    var api = {
      storm: storm,
      flash: 0, // how bright the sky is right now, 0..1
      base: 0, // the daylight to go back to between flashes
      muted: false, // under the house: no sky to light
      onFlash: null, // (strength) as a flash starts
      onThunder: null,
      setLevel: function (v) {
        storm.setLevel(v);
      },
      strike: function (strength, thunderIn) {
        storm.strike(strength === undefined ? 1 : strength, thunderIn === undefined ? 0.5 : thunderIn);
      },
      // the rain and the wind stop dead for a few seconds (the house holding its breath)
      hush: function (seconds) {
        hushT = seconds;
      },
      // start the weather's sounds (after the first click, when there is audio)
      start: function () {
        if (!g.audio || sounds.rain) return;
        sounds.rain = g.audio.play('rain');
        sounds.wind = g.audio.play('wind');
      },
      update: function (dt) {
        var level = storm.level();
        var events = storm.update(dt);
        var room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
        var under = OC.crawl && OC.crawl.contains(ctl.pos.x, ctl.pos.z);
        where = under ? 'crawl' : room || roofed(ctl.pos.x, ctl.pos.z) ? 'in' : 'out';

        events.forEach(function (e) {
          if (e.type === 'flash') {
            flashT = 0;
            flashStrength = e.strength;
            if (api.onFlash) api.onFlash(e.strength);
          } else if (e.type === 'thunder') {
            if (g.audio) g.audio.play('thunder', { gain: (0.5 + 0.7 * e.strength) * (where === 'out' ? 1 : where === 'in' ? 0.75 : 0.4), muffled: where !== 'out' });
            if (api.onThunder) api.onThunder(e.strength);
          }
        });

        if (flashT >= 0) {
          flashT += dt;
          var c = curve(flashT);
          api.flash = c * flashStrength;
          if (flashT > 0.55) {
            flashT = -1;
            api.flash = 0;
          }
          if (!api.muted) world.setDaylight(api.base + api.flash * 0.8, renderer);
        }

        if (!sounds.rain && level > 0.01) api.start();
        hushT = Math.max(0, hushT - dt);
        var heard = hushT > 0 ? 0 : level;
        if (sounds.rain && sounds.rain.set) sounds.rain.set(heard, where, hushT > 0);
        if (sounds.wind && sounds.wind.set) sounds.wind.set(heard, where, hushT > 0);

        var show = level > 0.02 && where !== 'crawl';
        rain.visible = show;
        if (!show) return;
        var n = Math.floor(DROPS * Math.min(1, level));
        geo.setDrawRange(0, n * 2);
        mat.color.setRGB(0.3 + 0.6 * api.flash, 0.345 + 0.6 * api.flash, 0.41 + 0.55 * api.flash);
        var fall = SPEED * dt;
        for (var i = 0; i < n; i++) {
          var d = drops[i];
          d.y -= fall;
          d.x += fall * WIND;
          var dx = d.x - ctl.pos.x;
          var dz = d.z - ctl.pos.z;
          if (d.y < 0 || dx * dx + dz * dz > R * R * 1.2) respawn(d, d.y >= 0);
          var o = i * 6;
          if (d.hidden) {
            pos[o + 1] = pos[o + 4] = -50;
            continue;
          }
          pos[o] = d.x;
          pos[o + 1] = d.y;
          pos[o + 2] = d.z;
          pos[o + 3] = d.x + LEN * WIND;
          pos[o + 4] = d.y + LEN;
          pos[o + 5] = d.z;
        }
        geo.attributes.position.needsUpdate = true;
      },
      where: function () {
        return where;
      },
      // stop everything and put the sky back
      dispose: function () {
        if (sounds.rain) sounds.rain.stop();
        if (sounds.wind) sounds.wind.stop();
        sounds.rain = sounds.wind = null;
        rain.visible = false;
        scene.remove(rain);
        geo.dispose();
        mat.dispose();
        api.flash = 0;
      },
    };
    return api;
  }

  OC.weather = { create: create };
})();
