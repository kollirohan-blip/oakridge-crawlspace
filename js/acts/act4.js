// Act 4, 12:35 AM: "The Search".
// The bathroom: lock the door, run the shower as a decoy. The storm has swollen the window shut. His
// footsteps cross the house; the handle turns; two bare feet stop in the light under the door while he
// listens; the scrape. Then he walks away, and Mason has to get out through his own house while Wes
// searches it (js/engine/search.js): room by room, trying handles, tilting his head to listen, never
// chasing, never running. Cooper growls toward him through the walls; the house goes quiet when he is
// close; the pet cam shows the living room; lightning shows him. Hide under Dave's bed, under the desk
// or behind the couch, but not in the same place twice. At the front door the chain is on; while
// Mason fumbles with it, a footstep comes up behind him and stops. Outside: the car is dead. Get
// down, and stay still and silent for a minute while he walks round the car, tries the handles, and
// presses his smiling face to the glass in the lightning. Then sirens, and he walks into the trees.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act4.vo.open', 'act4.vo.end', 'act4.vo.endRay', 'act4.ray',
    'act4.thought.lockDoor', 'act4.thought.shower', 'act4.thought.scrape', 'act4.thought.window2', 'act4.thought.steps',
    'act4.thought.handle', 'act4.thought.feet', 'act4.thought.leaves', 'act4.thought.go', 'act4.thought.unlock',
    'act4.thought.hideIn.masterBed', 'act4.thought.hideIn.officeDesk', 'act4.thought.hideIn.couch', 'act4.thought.hideHint',
    'act4.thought.cooperGrowl', 'act4.thought.silence', 'act4.thought.heard', 'act4.thought.chain', 'act4.thought.behind',
    'act4.thought.open', 'act4.thought.outside', 'act4.thought.inCar', 'act4.thought.dead', 'act4.thought.hood',
    'act4.thought.frontDoor', 'act4.thought.down', 'act4.thought.handles', 'act4.thought.face', 'act4.whisper',
    'act4.thought.sirens', 'act4.thought.lookBack', 'act4.sms.mason1', 'act4.sms.ethan1',
    'act4.fail.door', 'act4.fail.noise', 'act4.fail.seen', 'act4.fail.outside', 'act4.fail.caught', 'act4.fail.checked',
    'act4.task.wait', 'act4.task.frontDoor', 'act4.task.chain', 'act4.task.window',
  ];
  var DOOR = { x: 5, y: 1.2, z: 21.5 };
  var SHOWER = { x: 0.85, y: 1.4, z: 23.2 };
  var DRIVER_WINDOW = { x: 10.85, y: 1.12, z: -9.95 };
  var FLOOR = { floorboards: 'wood', tile: 'tile', carpet: 'carpet', concrete: 'concrete' };
  var LOUD = { carpet: 0.22, wood: 0.42, tile: 0.55, concrete: 0.35, grass: 0.3 };
  var LIT = { laundry: true, guest: true, bath: true };
  // where he searches (door points on the hall side; the bathroom only when the act sends him)
  var ROOMS = [
    { id: 'office', door: { x: 6.4, z: 11.5 }, point: { x: 10.2, z: 11.8 } },
    { id: 'master', door: { x: 6.4, z: 19.5 }, point: { x: 9.8, z: 19.2 } },
    { id: 'guest', door: { x: 5.6, z: 16 }, point: { x: 2.8, z: 16.4 } },
    { id: 'laundry', door: { x: 5.6, z: 10.5 }, point: { x: 3.4, z: 11.6 } },
    { id: 'kitchen', door: { x: 6, z: 8.6 }, point: { x: 9.4, z: 6.3 } },
    { id: 'living', door: { x: 12.4, z: 4 }, point: { x: 19, z: 6.2 } },
    { id: 'foyer', door: { x: 5.6, z: 4 }, point: { x: 2.6, z: 4.8 } },
    { id: 'bath', door: { x: 5.6, z: 21.5 }, point: { x: 5.6, z: 21.5 }, scripted: true },
  ];
  // where Mason can hide; `at` is where Wes stands to look
  var HIDES = [
    { id: 'masterBed', label: 'Hide under the bed', item: { x: 9.6, y: 0.35, z: 21.95 }, view: { x: 9.6, z: 22.45, yaw: 0, pitch: 0.06, eye: 0.2 }, out: { x: 9.6, z: 21.35 }, at: { x: 9.6, z: 21.4 }, room: 'master' },
    { id: 'officeDesk', label: 'Hide under the desk', item: { x: 8.45, y: 0.4, z: 9.05 }, view: { x: 8.45, z: 8.6, yaw: Math.PI, pitch: 0, eye: 0.42 }, out: { x: 8.3, z: 9.6 }, at: { x: 8.35, z: 9.7 }, room: 'office' },
    { id: 'couch', label: 'Hide behind the couch', item: { x: 19.3, y: 0.55, z: 4.62 }, view: { x: 19.3, z: 4.86, yaw: Math.PI, pitch: 0.08, eye: 0.3 }, out: { x: 19.3, z: 5.4 }, at: { x: 19.3, z: 5.7 }, room: 'living' },
  ];

  OC.acts.act4 = {
    id: 'act4',
    night: 2,
    spawn: 'bathInside',
    clockDef: { startMin: 24 * 60 + 35, endMin: 24 * 60 + 55, durationSec: 720 },
    requiredText: TEXT,
    ROOMS: ROOMS,
    HIDES: HIDES,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var ctl = g.ctl;
      var phone = g.phone;
      var cooper = g.cooper;
      var him = props.intruder;
      var none = { stop: function () {} };
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }
      function say(id, ms) {
        hud.say(t(id), ms);
      }
      function surfaceAt(x, z) {
        var id = OC.layout.roomAt(OC.house, x, z);
        if (!id) return 'grass';
        var r = OC.house.rooms.filter(function (rm) { return rm.id === id; })[0];
        return FLOOR[r.floor] || 'wood';
      }

      // the house at 12:35 AM: he turned the hall light on
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0.3, porch: 1.0, laundry: 0.9, guest: 0.55, tv: 0, phoneglow: 0, yard: 0.75, bath: 0.9 });
      props.frontDoor.close();
      props.bathDoor.open();
      props.car.fixWindow();
      props.car.headlights(false);
      props.shards.clear();
      props.closet.reset();
      props.floorPhone.set(false);
      props.hatch.setAjar(true);
      props.hatch.setPadlock(false);
      props.changes.bed.set(true);
      props.changes.chair.set('hall');
      props.changes.prints.show('both');
      props.changes.doorNote.show(true);
      if (props.broom.where !== 'track') props.broom.set('track');
      him.show(false);
      him.crouch = 0;
      him.raise = 0;
      him.crowbar = false;
      him.redEye(false);
      cooper.setPos(6.2, 13.5); // shut out in the hall
      cooper.follow();
      cooper.stay();
      cooper.ears(true);
      cooper.stare({ x: 2.5, y: 1, z: 16 });
      if (ctl.nav) ctl.nav.rebuild();
      ctl.sprintAllowed = true;
      ctl.light.available = true;
      ctl.light.on = true;
      ctl.light.battery = g.habits.has('tookCharger') ? 1 : 0.4;
      phone.enabled = true;
      tension(0.7);
      var weather = OC.weather.create(g, { level: 1 });
      weather.setLevel(1);
      var calledRay = g.habits.has('calledDeputy');

      var flags = {
        elapsed: 0,
        phase: 'bath', // bath -> sneak -> door -> run -> car -> cranking -> exposed -> hide -> won | fail
        doorLocked: false,
        lockedAt: -1,
        showerOn: false,
        heLeftAt: -1,
        bathSent: false,
        unlockReady: false,
        chainTries: 0,
        outsideT: 0,
        exposedT: 0,
        hideT: 0,
        hidden: null,
        hiddenT: 0,
        room: 'bath',
        quiet: false,
        heardSaidAt: -99,
        cooperT: 2,
      };
      var queue = [];
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      var loops = [];
      function loop(name, opts) {
        var h = sfx(name, opts);
        loops.push(h);
        return h;
      }
      function stopLoops() {
        loops.forEach(function (h) { h.stop(); });
        loops = [];
      }
      var house = {};
      function startHouse() {
        stopHouse();
        house.hum = sfx('fridgeHum', { pos: { x: 12.55, y: 1.0, z: 0.5 }, gain: 0.9 });
        house.clock = sfx('clockTick', { pos: { x: 25.7, y: 1.9, z: 1.5 }, gain: 0.8 });
      }
      function stopHouse() {
        if (house.hum) house.hum.stop();
        if (house.clock) house.clock.stop();
        house.hum = house.clock = null;
      }
      startHouse();
      var noise = OC.noise.createNoiseMeter(); // the car
      var loudness = 0; // how loud Mason is being in the house, for the meter
      var heardNow = null; // the sound he might hear this frame
      var route = []; // his scripted walk outside: [{ x, z, then }]
      var walkSpeed = 1.2;
      function walk(points, speed) {
        route = points.slice();
        walkSpeed = speed || 1.2;
      }

      // ---- him, searching -----------------------------------------------------------------------------
      var search = OC.search.createSearch({
        rooms: ROOMS,
        hides: HIDES.map(function (h) { return { id: h.id, at: h.at, room: h.room }; }),
        start: { x: 5.45, z: 21.5 },
        path: function (from, to) { return ctl.nav ? ctl.nav.findPath(from, to) : null; },
      });

      // ---- the light under the bathroom door, and his feet in it -------------------------------------------
      var gap = (function () {
        g.cache = g.cache || {};
        if (!g.cache.bathGap) {
          var c = document.createElement('canvas');
          c.width = 128;
          c.height = 4;
          var tex = new THREE.CanvasTexture(c);
          var m = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.024), new THREE.MeshBasicMaterial({ map: tex }));
          m.rotation.y = -Math.PI / 2;
          m.position.set(4.932, 0.013, 21.5);
          g.render.scene.add(m);
          g.cache.bathGap = { mesh: m, ctx: c.getContext('2d'), tex: tex };
        }
        var G = g.cache.bathGap;
        var api = {
          feet: false,
          draw: function (time) {
            var x = G.ctx;
            x.fillStyle = '#e2c48c';
            x.fillRect(0, 0, 128, 4);
            if (api.feet) {
              var shift = Math.sin((time || 0) * 0.7) > 0.6 ? 2 : 0; // he shifts his weight
              x.fillStyle = '#0a0806';
              x.fillRect(40 + shift, 0, 18, 4);
              x.fillRect(70 - shift, 0, 18, 4);
            }
            G.tex.needsUpdate = true;
          },
          show: function (v) {
            G.mesh.visible = !!v;
          },
        };
        api.show(true);
        api.draw(0);
        return api;
      })();

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'lockDoor', label: 'Lock the bathroom door' },
            { id: 'shower', label: 'Turn on the shower' },
            { id: 'window', label: t('act4.task.window') },
            { id: 'wait', label: t('act4.task.wait') },
            { id: 'frontDoor', label: t('act4.task.frontDoor') },
            { id: 'chain', label: t('act4.task.chain') },
            { id: 'car', label: 'Get to the car' },
            { id: 'quiet', label: 'Stay quiet' },
          ],
          advanceWhen: function () { return false; },
        },
        { onTask: function () { phone.setTasks(visible()); } }
      );
      var revealed = { lockDoor: true, shower: true, window: true };
      function visible() {
        return director.list().filter(function (x) { return revealed[x.id]; });
      }
      function reveal(id) {
        revealed[id] = true;
        phone.setTasks(visible());
      }
      phone.setTasks(visible());
      later(1.2, function () { say('act4.vo.open', 9000); });

      // ---- failing and winning ---------------------------------------------------------------------------
      function fail(reason) {
        if (flags.phase === 'fail' || flags.phase === 'won') return;
        flags.phase = 'fail';
        g.state.cutscene = true;
        g.state.modal = null;
        stopLoops();
        stopHouse();
        hud.setNoise(null);
        sfx('sting', { gain: 0.9 });
        if (reason === 'door') {
          props.bathDoor.open(true);
          sfx('thud', { pos: DOOR, gain: 1.6 });
        } else if (reason === 'noise' || reason === 'seen') {
          sfx('glassSmash', { pos: { x: 11, y: 1.2, z: -9.9 }, gain: 1.2 });
          props.car.breakWindow();
        }
        tension(1);
        g.after(function () {
          hud.failScreen("YOU DIDN'T MAKE IT", t('act4.fail.' + reason), function () {
            hud.fadeIn();
            if (g.onEnd) g.onEnd('act4', 'retry');
          });
        }, 700);
      }

      function win() {
        flags.phase = 'won';
        director.complete('quiet');
        hud.setNoise(null);
        tension(0.2);
        g.habits.log('survived', { ray: calledRay }, { clock: g.clock.label(), t: flags.elapsed });
        var flash = 0;
        var porch = g.world.lightById.porch;
        var timer = setInterval(function () {
          flash++;
          if (porch) {
            porch.color.setHex(flash % 2 ? 0xff2a2a : 0x2a4dff);
            porch.intensity = 1.6;
          }
        }, 380);
        function end(line) {
          clearInterval(timer);
          if (porch) {
            porch.color.setHex(0xffd9a0);
            porch.intensity = 1.0;
          }
          g.state.cutscene = true;
          stopLoops();
          hud.fadeOut('');
          g.after(function () { hud.setFadeText(t(line)); }, 1500);
          g.after(function () { if (g.onEnd) g.onEnd('act4'); }, 10500);
        }
        if (calledRay) {
          // it is Ray at the window
          g.cache = g.cache || {};
          var ray = g.cache.ray || null;
          if (!ray && OC.person && OC.day2 && OC.day2.deputy) {
            ray = OC.person.create(g.render.scene, OC.day2.deputy.RAY_LOOK);
            g.cache.ray = ray;
          }
          later(3, function () {
            if (ray) {
              ray.setPos(11.45, -9.85);
              ray.faceTo(10.3, -9.85);
              ray.lift = -0.62; // bent down to the window
              ray.show(true);
              flags.ray = ray;
              // his flashlight, on Mason's face and back on his own: the yard light, borrowed
              var torch = g.world.lightById.yard;
              if (torch) {
                torch.position.set(11.02, 1.15, -10.05);
                torch.intensity = 0.9;
                torch.distance = 3.5;
              }
            }
            sfx('knock', { pos: DRIVER_WINDOW, count: 4, gain: 1.1 });
          });
          later(4.4, function () {
            hud.speak('Ray', t('act4.ray'), 5000);
            if (ray) ray.talk(4);
          });
          later(9.5, function () { end('act4.vo.endRay'); });
        } else later(4, function () { end('act4.vo.end'); });
      }

      // ---- the bathroom ---------------------------------------------------------------------------------
      function bathSequence() {
        if (flags.seq) return;
        flags.seq = true;
        // footsteps crossing the house, toward the bathroom
        var path = [[19, 4], [15, 4], [11, 5], [8, 6.5], [6, 8.5], [6, 11], [6, 13.5], [6, 16], [6, 18.5], [5.8, 20.6]];
        path.forEach(function (p, i) {
          later(2 + i * 0.72, function () { sfx('step', { surface: surfaceAt(p[0], p[1]), pos: { x: p[0], y: 0, z: p[1] }, gain: 1.0 }); });
        });
        later(4, function () { say('act4.thought.steps', 4500); });
        later(10, function () {
          sfx('click', { pos: { x: 5.2, y: 1, z: 21.5 }, gain: 1.3 });
          sfx('click', { pos: { x: 5.2, y: 1, z: 21.5 }, gain: 1.1, delay: 0.25 });
          sfx('creak', { pos: DOOR, gain: 0.6, delay: 0.4 });
          tension(0.9);
        });
        later(10.8, function () { say('act4.thought.handle', 3500); });
        later(12.5, function () {
          gap.feet = true;
          him.setPos(5.45, 21.5);
          him.faceTo(4, 21.5);
          him.pose('tilt');
          him.show(true);
          sfx('breath', { pos: { x: 5.3, y: 1.6, z: 21.5 }, count: 3, gain: 1.2, ref: 1.5 });
        });
        later(13.5, function () { say('act4.thought.feet', 7000); });
        later(20, function () {
          flags.scrape = loop('scrape', { pos: DOOR, gain: 0.9 });
          later(1.5, function () { say('act4.thought.scrape'); });
        });
        later(flags.showerOn ? 26 : 30, function () {
          if (flags.phase !== 'bath') return;
          if (flags.scrape) flags.scrape.stop();
          gap.feet = false;
          // he walks away, to the office, and starts on the house
          search.place({ x: 5.45, z: 21.5 });
          search.start();
          search.send('office');
          flags.heLeftAt = flags.elapsed;
          director.complete('wait');
          tension(0.75);
          later(2, function () { say('act4.thought.leaves', 4500); });
          later(6, function () {
            flags.unlockReady = true;
            reveal('frontDoor');
            say('act4.thought.go', 8000);
          });
        });
      }

      // ---- hiding ---------------------------------------------------------------------------------------
      function hide(h) {
        flags.hidden = h.id;
        flags.hiddenT = 0;
        g.state.modal = 'hide';
        ctl.frozen = true;
        ctl.teleport(h.view.x, h.view.z, h.view.yaw, h.view.pitch);
        ctl.eyeTarget = ctl.eyeOffset = h.view.eye - OC.controller.EYE;
        if (ctl.light.on) {
          ctl.light.on = false;
          sfx('click', { gain: 0.4 });
        }
        sfx('rustle', { gain: 0.4 });
        g.habits.log('hid', { kind: h.id }, { clock: g.clock.label(), t: flags.elapsed });
        say('act4.thought.hideIn.' + h.id, 4000);
        hud.toast(t('act4.thought.hideHint'), 3000);
      }
      function unhide() {
        var h = HIDES.filter(function (x) { return x.id === flags.hidden; })[0];
        flags.hidden = null;
        g.state.modal = null;
        ctl.stand();
        if (h) ctl.teleport(h.out.x, h.out.z);
        sfx('rustle', { gain: 0.4 });
        heardNow = { x: ctl.pos.x, z: ctl.pos.z, loud: 0.3 };
      }
      function onKey(e) {
        if (!ctl.locked || e.repeat) return;
        if (flags.hidden && e.code === 'KeyE' && flags.hiddenT > 0.6) unhide();
        if (flags.phase === 'hide') noise.poke(0.16);
      }
      function onMouse(e) {
        if (flags.phase !== 'hide' || !ctl.locked) return;
        noise.poke((Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0)) * 0.0014);
      }
      document.addEventListener('mousemove', onMouse);
      window.addEventListener('keydown', onKey);

      // his footsteps can hear yours
      var lastPos = { x: ctl.pos.x, z: ctl.pos.z };
      var speedNow = 0;
      var prevStep = ctl.onStep;
      ctl.onStep = function () {
        if (prevStep) prevStep();
        if (flags.phase !== 'sneak' && flags.phase !== 'door' && flags.phase !== 'bath') return;
        var loud = (LOUD[surfaceAt(ctl.pos.x, ctl.pos.z)] || 0.3) * (speedNow > 3 ? 2.3 : 1);
        loudness = Math.max(loudness, Math.min(1, loud));
        heardNow = { x: ctl.pos.x, z: ctl.pos.z, loud: loud };
      };

      // can he see Mason right now?
      function seen() {
        if (flags.hidden) return false;
        var wp = search.pos();
        var dx = ctl.pos.x - wp.x;
        var dz = ctl.pos.z - wp.z;
        var d = Math.hypot(dx, dz);
        if (d > 9) return false;
        var diff = Math.atan2(dx, dz) - search.heading();
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) > 1.0) return false;
        if (!OC.sightline.lineOfSight(ctl.boxes, wp, ctl.pos, 1.2)) return false;
        var room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
        return ctl.light.on || !!LIT[room] || weather.flash > 0.25 || d < 3.2 || (ctl.moving && d < 5.5);
      }
      function onSearch(e) {
        var wp = search.pos();
        if (e.type === 'step') sfx('step', { surface: surfaceAt(wp.x, wp.z), pos: { x: wp.x, y: 0, z: wp.z }, gain: 0.85 });
        else if (e.type === 'handle') {
          var r = ROOMS.filter(function (x) { return x.id === e.room; })[0];
          var at = { x: r.door.x, y: 1, z: r.door.z };
          sfx('click', { pos: at, gain: 1.1 });
          sfx('click', { pos: at, gain: 0.9, delay: 0.2 });
          if (e.room === 'bath' && flags.room === 'bath' && flags.phase === 'sneak') {
            // the coin lock, from outside
            later(1.4, function () { fail('door'); });
          }
        } else if (e.type === 'listen') {
          if (Math.hypot(ctl.pos.x - wp.x, ctl.pos.z - wp.z) < 7) sfx('breath', { pos: { x: wp.x, y: 1.7, z: wp.z }, count: 1, gain: 0.7 });
        } else if (e.type === 'heard') {
          tension(1);
          if (flags.elapsed - flags.heardSaidAt > 25) {
            flags.heardSaidAt = flags.elapsed;
            later(0.6, function () { say('act4.thought.heard', 3500); });
          }
        } else if (e.type === 'caught') {
          him.faceTo(ctl.pos.x, ctl.pos.z);
          him.pose('tilt');
          fail(e.hide ? 'checked' : 'caught');
        }
      }

      // ---- the front door, the chain ------------------------------------------------------------------------
      function atTheDoor() {
        flags.phase = 'door';
        search.hold();
        director.complete('frontDoor');
        reveal('chain');
        hud.setNoise(null);
      }
      function chain() {
        if (flags.chainTries === 0) {
          flags.chainTries = 1;
          sfx('click', { pos: { x: 2.5, y: 1.4, z: 0.1 }, gain: 0.7 });
          say('act4.thought.chain', 4000);
          // and behind him: one footstep, and then nothing
          later(1.6, function () {
            var bx = ctl.pos.x + Math.sin(ctl.yaw) * 1.1;
            var bz = ctl.pos.z + Math.cos(ctl.yaw) * 1.1;
            him.setPos(bx, bz);
            him.faceTo(ctl.pos.x, ctl.pos.z);
            him.pose('tilt', true);
            him.show(true);
            sfx('step', { surface: 'wood', pos: { x: bx, y: 0, z: bz }, gain: 1.4 });
            tension(1);
            g.habits.log('footstepBehind', {}, { clock: g.clock.label(), t: flags.elapsed });
          });
          later(2.8, function () { say('act4.thought.behind', 6000); });
          return;
        }
        flags.chainTries = 2;
        director.complete('chain');
        sfx('click', { pos: { x: 2.5, y: 1.4, z: 0.1 }, gain: 0.9 });
        sfx('doorLock', { pos: { x: 2.5, y: 1, z: 0 } });
        props.frontDoor.open();
        if (ctl.nav) ctl.nav.rebuild();
        flags.phase = 'run';
        reveal('car');
        say('act4.thought.open', 2500);
        hud.toast('Hold Shift to run', 4000);
        tension(0.95);
      }

      // ---- the car ------------------------------------------------------------------------------------------
      function getDown() {
        flags.phase = 'hide';
        flags.hideT = 0;
        if (ctl.light.on) {
          ctl.light.on = false; // Mason kills the light as he drops; turning it back on is a mistake
          sfx('click', { gain: 0.5 });
        }
        say('act4.thought.down');
        hud.setNoise(0);
        noise.reset();
        // slumped down below the dash, looking up at the driver's window
        ctl.eyeTarget = -0.73;
        ctl.teleport(10.3, -9.95, -Math.PI / 2, 0.22);
        later(1.5, function () { phone.send('ethan', t('act4.sms.mason1')); });
        later(6, function () { phone.deliver('ethan', 'Ethan', t('act4.sms.ethan1')); });
        // he walks round the car trying the handles, then to the driver's window
        him.crouch = 0;
        him.pose('stand');
        walk(
          [
            { x: 7.6, z: -6.6 },
            { x: 8.6, z: -8.9, then: 'handle' },
            { x: 8.6, z: -11.4, then: 'handle' },
            { x: 11.7, z: -11.6, then: 'handle' },
            { x: 11.1, z: -9.75, then: 'window' },
          ],
          1.15
        );
        later(46, function () { loop('siren', { pos: { x: -25, y: 2, z: -30 }, gain: 0.5 }); });
        later(49, function () { say('act4.thought.sirens'); });
        later(51, function () { loop('siren', { pos: { x: 0, y: 2, z: -24 }, gain: 1.0 }); });
        later(52.5, function () {
          if (flags.phase !== 'hide') return;
          him.crouch = 0;
          him.lift = 0;
          him.pose('stand');
          flags.atWindow = false;
          walk([{ x: 13.5, z: -12 }, { x: 18, z: -16.5, then: 'lookBack' }], 1.25);
        });
        later(61.5, function () { if (flags.phase === 'hide') win(); });
      }
      function arrive(p) {
        if (p.then === 'handle') {
          sfx('click', { pos: { x: p.x + (p.x < 10 ? 0.35 : -0.35), y: 1, z: p.z }, gain: 1.2 });
          sfx('click', { pos: { x: p.x, y: 1, z: p.z }, gain: 1.0, delay: 0.3 });
          route.unshift({ x: p.x, z: p.z, wait: 1.1 });
          if (!flags.handlesSaid) {
            flags.handlesSaid = true;
            later(0.8, function () { say('act4.thought.handles', 4000); });
          }
        } else if (p.then === 'window') {
          flags.atWindow = true;
          him.faceTo(9.6, -9.75);
          him.crouch = 0;
          him.lift = -0.9; // bent to the glass; the car door hides the rest of him
          him.pose('stand', true);
          later(2.5, function () {
            if (flags.phase !== 'hide') return;
            weather.strike(1, 0.3);
            sfx('sting', { gain: 1.0 });
            tension(1);
            g.habits.log('faceAtGlass', {}, { clock: g.clock.label(), t: flags.elapsed });
            later(0.6, function () { say('act4.thought.face', 4000); });
          });
          later(5, function () {
            if (flags.phase === 'hide') sfx('knock', { pos: DRIVER_WINDOW, count: 3, gain: 0.5 });
          });
          later(7.5, function () {
            if (flags.phase !== 'hide') return;
            sfx('whisper', { pos: DRIVER_WINDOW, gain: 1.3, ref: 1 });
            say('act4.whisper', 4000);
          });
        } else if (p.then === 'lookBack') {
          him.faceTo(10.3, -9.95);
          later(0.5, function () { say('act4.thought.lookBack', 5000); });
          later(2.2, function () { him.show(false); });
        } else if (p.then === 'out') {
          // nothing: walking out of the house
        }
      }

      var items = [
        {
          id: 'bathDoor', x: 4.95, y: 1.0, z: 21.5, radius: 0.55,
          label: function () { return flags.doorLocked ? 'Unlock the door' : 'Close and lock the door'; },
          hold: 0.8,
          enabled: function () { return (flags.phase === 'bath' && !flags.doorLocked) || (flags.doorLocked && flags.unlockReady && !flags.unlocked && flags.room === 'bath'); },
          onUse: function () {
            if (!flags.doorLocked) {
              if (!props.bathDoor.close(ctl.pos)) {
                hud.toast('Step back from the door first');
                return;
              }
              flags.doorLocked = true;
              flags.lockedAt = flags.elapsed;
              if (ctl.nav) ctl.nav.rebuild();
              sfx('doorLock', { pos: DOOR });
              director.complete('lockDoor');
              reveal('wait');
              say('act4.thought.lockDoor');
              return;
            }
            // out, while he is in the office
            flags.unlocked = true;
            props.bathDoor.open();
            if (ctl.nav) ctl.nav.rebuild();
            sfx('doorLock', { pos: DOOR, gain: 0.6 });
            heardNow = { x: DOOR.x, z: DOOR.z, loud: 0.35 };
            gap.show(false);
            flags.phase = 'sneak';
            say('act4.thought.unlock', 2500);
          },
        },
        {
          id: 'shower', x: 0.85, y: 1.3, z: 22.45, radius: 0.5,
          label: 'Turn on the shower',
          hold: 0.8,
          enabled: function () { return flags.phase === 'bath' && !flags.showerOn; },
          onUse: function () {
            flags.showerOn = true;
            loop('shower', { pos: SHOWER, gain: 1 });
            director.complete('shower');
            say('act4.thought.shower');
          },
        },
        {
          id: 'window', x: 0.15, y: 1.5, z: 21.5, radius: 0.45,
          label: 'Try the window',
          hold: 1.0,
          enabled: function () { return flags.phase === 'bath'; },
          onUse: function () {
            sfx('thud', { pos: { x: 0.1, y: 1.5, z: 21.5 }, gain: 0.5 });
            director.complete('window');
            g.habits.log('triedWindow', {}, { clock: g.clock.label(), t: flags.elapsed });
            say('act4.thought.window2', 5000);
          },
        },
        {
          id: 'chain', x: 2.5, y: 1.25, z: 0.14, radius: 0.5,
          label: function () { return flags.chainTries ? 'Undo the chain. Again.' : 'Undo the chain'; },
          hold: 1.3,
          enabled: function () { return flags.phase === 'door' && !flags.chainBusy; },
          onUse: function () {
            flags.chainBusy = true;
            chain();
            later(flags.chainTries === 1 ? 3.2 : 0.5, function () { flags.chainBusy = false; });
          },
        },
        {
          id: 'car', x: 11.1, y: 1.0, z: -9.8, radius: 0.6,
          label: 'Get in the car',
          enabled: function () { return flags.phase === 'run'; },
          onUse: function () {
            flags.phase = 'car';
            director.complete('car');
            reveal('quiet');
            ctl.sprintAllowed = false;
            him.show(false);
            ctl.seat(10.4, -9.95, Math.PI, -0.6); // facing the house, through the windshield
            sfx('doorLock', { pos: { x: 10.9, y: 1, z: -9.9 } });
            say('act4.thought.inCar');
          },
        },
        {
          id: 'ignition', x: 10.4, y: 0.95, z: -8.85, radius: 0.35,
          label: 'Start the car',
          enabled: function () { return flags.phase === 'car'; },
          onUse: function () {
            flags.phase = 'cranking';
            sfx('click', { pos: { x: 10.4, y: 0.9, z: -8.9 }, gain: 0.9 });
            sfx('click', { pos: { x: 10.4, y: 0.9, z: -8.9 }, gain: 0.9, delay: 0.6 });
            later(1.4, function () { say('act4.thought.dead'); });
            later(4.2, function () { say('act4.thought.hood', 4500); });
            later(7.5, function () {
              sfx('creak', { pos: { x: 2.5, y: 1, z: 0 }, gain: 1.2 });
              him.setPos(2.5, -0.3); // on the threshold, under the porch light
              him.crouch = 0;
              him.pose('stand', true);
              him.faceTo(10.4, -9.95); // at the car, through the windshield
              him.pose('shush'); // in the open door in the storm, a finger to his lips. Not chasing.
              him.show(true);
              say('act4.thought.frontDoor');
              flags.phase = 'exposed';
              flags.exposedT = 0;
              walk([{ x: 2.5, z: -0.3, wait: 1.8 }, { x: 2.5, z: -2.6 }, { x: 7.6, z: -6.6, then: 'out' }], 1.0);
              later(1.8, function () { if (him.poseName() === 'shush') him.pose('stand'); });
            });
          },
        },
        {
          id: 'down', x: 10.4, y: 0.75, z: -8.9, radius: 0.9,
          label: 'Get down!',
          enabled: function () { return flags.phase === 'exposed'; },
          onUse: getDown,
        },
      ];
      HIDES.forEach(function (h) {
        items.push({
          id: 'hide.' + h.id, x: h.item.x, y: h.item.y, z: h.item.z, radius: 0.5,
          label: h.label,
          enabled: function () { return flags.phase === 'sneak' && !flags.hidden; },
          onUse: function () { hide(h); },
        });
      });
      items.forEach(function (it) { g.interact.add(it); });

      return {
        director: director,
        flags: flags,
        noise: noise,
        items: items,
        search: search,
        weather: weather,
        hide: hide,
        unhide: unhide,
        seen: seen,
        dispose: function () {
          stopLoops();
          stopHouse();
          weather.dispose();
          g.world.setDaylight(0, g.render.renderer);
          hud.setNoise(null);
          him.show(false);
          him.crouch = 0;
          him.lift = 0;
          gap.feet = false;
          gap.draw(0);
          gap.show(false);
          if (flags.ray) {
            flags.ray.show(false);
            flags.ray.lift = 0;
          }
          ctl.sprintAllowed = false;
          ctl.onStep = prevStep;
          g.state.modal = null;
          document.removeEventListener('mousemove', onMouse);
          window.removeEventListener('keydown', onKey);
        },
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          speedNow = Math.hypot(ctl.pos.x - lastPos.x, ctl.pos.z - lastPos.z) / Math.max(dt, 1e-3);
          lastPos.x = ctl.pos.x;
          lastPos.z = ctl.pos.z;
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          weather.update(dt);
          if (gap.feet) gap.draw(flags.elapsed);

          // the bathroom: once the door is locked (and the shower on, or after a while), he comes
          if (flags.phase === 'bath' && flags.doorLocked && !flags.seq && (flags.showerOn || flags.elapsed - flags.lockedAt > 12)) bathSequence();
          // staying in the bathroom after he has gone: he comes back for the lock
          if (flags.heLeftAt >= 0 && !flags.bathSent && flags.phase === 'bath' && flags.elapsed - flags.heLeftAt > 75) {
            flags.bathSent = true;
            flags.phase = 'sneak'; // he is searching; the bathroom is just where Mason is
            search.send('bath');
          }

          // the search
          if (flags.phase === 'sneak' || (flags.phase === 'bath' && flags.heLeftAt >= 0)) {
            if (flags.hidden) flags.hiddenT += dt;
            var sense = { seen: flags.phase === 'sneak' && seen(), noise: heardNow, hidden: flags.hidden };
            if (sense.noise && !OC.sightline.lineOfSight(ctl.boxes, search.pos(), sense.noise, 1.0)) sense.noise = { x: sense.noise.x, z: sense.noise.z, loud: sense.noise.loud * 0.6 };
            search.update(dt, sense).forEach(onSearch);
            // his body follows where the search has him
            var sp = search.pos();
            if (!him.visible()) him.show(true);
            if (Math.hypot(him.pos.x - sp.x, him.pos.z - sp.z) > 1) him.setPos(sp.x, sp.z); // placed, not walked
            if (him.stepTo(sp.x, sp.z, 3, dt)) him.heading = search.heading();
            him.pose(search.pose());
            // the meter: how loud Mason is being
            loudness = Math.max(0, loudness - dt * 0.6);
            hud.setNoise(loudness);
            // Cooper knows where he is
            flags.cooperT -= dt;
            if (flags.cooperT <= 0 && flags.phase === 'sneak') {
              flags.cooperT = 2.5;
              var dc = Math.hypot(cooper.pos.x - sp.x, cooper.pos.z - sp.z);
              if (dc < 8) {
                cooper.stare({ x: sp.x, y: 1.0, z: sp.z });
                sfx('growl', { pos: { x: cooper.pos.x, y: 0.5, z: cooper.pos.z }, duration: 1.4, gain: 0.45 });
                later(1.3, function () { cooper.stare(null); });
                if (!flags.cooperSaid && !OC.sightline.lineOfSight(ctl.boxes, ctl.pos, sp, 1.2)) {
                  flags.cooperSaid = true;
                  say('act4.thought.cooperGrowl', 4500);
                }
              } else if (cooper.mode === 'idle') cooper.follow();
            }
            // the house holds its breath when he is close
            var dp = Math.hypot(ctl.pos.x - sp.x, ctl.pos.z - sp.z);
            if (!flags.quiet && dp < 5.5) {
              flags.quiet = true;
              stopHouse();
              weather.hush(2.5);
              if (!flags.silenceSaid) {
                flags.silenceSaid = true;
                say('act4.thought.silence', 4000);
              }
            } else if (flags.quiet && dp > 8) {
              flags.quiet = false;
              startHouse();
            }
            if (flags.phase === 'sneak' && flags.room === 'foyer' && !flags.hidden) atTheDoor();
          }
          heardNow = null;
          // walked back out of the foyer before touching the chain: he carries on searching
          if (flags.phase === 'door' && flags.chainTries === 0 && flags.room !== 'foyer') {
            flags.phase = 'sneak';
            search.go();
          }

          // his walk outside
          if (route.length && him.visible() && (flags.phase === 'exposed' || flags.phase === 'hide')) {
            var p = route[0];
            if (p.wait) {
              p.wait -= dt;
              if (p.wait <= 0) route.shift();
            } else if (him.stepTo(p.x, p.z, walkSpeed, dt)) {
              route.shift();
              arrive(p);
            }
            if (!p.wait && Math.random() < dt * 1.8) sfx('step', { surface: 'grass', pos: { x: him.pos.x, y: 0, z: him.pos.z }, gain: 0.9 });
          }
          if (flags.atWindow) him.faceTo(9.6, -9.75);
          if (flags.ray) flags.ray.update(dt);

          if (flags.phase === 'run') {
            flags.outsideT += dt;
            if (flags.outsideT > 60) fail('outside');
            if (him.visible() && ctl.pos.z < -1) him.show(false);
          } else if (flags.phase === 'exposed') {
            flags.exposedT += dt;
            if (flags.exposedT > 8) fail('seen');
          } else if (flags.phase === 'hide') {
            flags.hideT += dt;
            if (ctl.light.on) noise.poke(0.6 * dt + 0.02); // a lit phone screen on the floor of a dark car
            noise.tick(dt);
            hud.setNoise(noise.level());
            if (noise.exceeded()) fail('noise');
          }
          director.tick(dt, flags);
        },
      };
    },
  };
})();
