// Boot, the act manager, and the main loop.
(function () {
  var OC = (window.OC = window.OC || {});
  var ACT_ORDER = ['act1', 'day2', 'act2', 'act3', 'act4'];
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
    OC.decor.build(world, props, OC.house);
    if (OC.places) OC.places.build(world); // the road to town and the Gas-N-Go, far off
    world.commit();
    if (OC.models) OC.models.commit(world.group); // the fitted furniture and the yard, merged by material
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
      state: { cutscene: false, modal: null },
      onEnd: null,
      habits: null,
      render: r, // the renderer and scene, for acts that build or relight things (Day 2)
    };
    // the habit log: what Mason did, kept with the checkpoint for the nights that read it
    g.habits = (function () {
      try {
        return OC.habits.restore(JSON.parse(localStorage.getItem('oakridge.habits')));
      } catch (e) {
        return OC.habits.createHabits();
      }
    })();
    function saveHabits() {
      try {
        localStorage.setItem('oakridge.habits', JSON.stringify(g.habits.serialize()));
      } catch (e) {
        /* no storage: the next night uses a fresh log */
      }
    }

    // read a note full screen; Mason stands still while he reads, then carries on
    g.read = function (title, body, onClose, opts) {
      var wasFrozen = ctl.frozen;
      ctl.frozen = true;
      OC.hud.read(title, body, function () {
        ctl.frozen = wasFrozen;
        interact.block(250); // the E that put it down must not pick it straight back up
        if (onClose) onClose();
      }, opts);
    };
    // while a modal (the microwave keypad) owns the keyboard, E belongs to it
    interact.isBlocked = function () {
      return !!g.state.modal;
    };

    // the bathroom mirror, the phone's camera and the pet cam
    g.mirror = OC.mirror.create(r, ctl);
    g.photo = OC.camera.create(g, r); // the phone camera (g.camera is the Three.js camera)
    g.petcam = OC.petcam.create(r);
    phone.setPetcamCanvas(g.petcam.canvas);
    phone.onShoot = function () {
      return g.photo.shoot();
    };
    // a link someone texted: read it full screen (the act may want to know)
    phone.onLink = function (link) {
      phone.close();
      g.read(link.title, link.body);
      if (current.act && current.act.onLink) current.act.onLink(link);
    };
    phone.onCall = function (id) {
      if (current.act && current.act.onCall) return current.act.onCall(id);
      OC.hud.toast('No answer.');
    };
    phone.onMusic = function (track) {
      if (g.state.music) g.state.music.stop();
      g.state.music = track >= 0 && g.audio ? g.audio.play('mixtape', { track: track }) : null;
    };

    var current = { id: null, def: null, act: null };

    function startAct(id) {
      var def = OC.acts[id];
      if (current.act && current.act.dispose) current.act.dispose(); // stop the last act's loops and listeners
      interact.clear();
      props.reset();
      world.setDaylight(def.daylight || 0, r.renderer); // night, unless the act is a day
      if (OC.places) OC.places.lightsAt(world, 'home');
      g.petcam.setTurned(false);
      g.petcam.gain = 2.2;
      g.petcam.clipGain = 0;
      g.petcam.beforeRender = g.petcam.afterRender = null;
      phone.setContacts(def.contacts || []);
      if (props.decor && props.decor.petcamDevice) props.decor.petcamDevice.turn(false);
      document.getElementById('epilogue').classList.remove('on'); // an ending screen must not cover a new night
      g.state.cutscene = false;
      g.clock = OC.clock.gameClock(def.clockDef);
      var spawnName = new URLSearchParams(location.search).get('spawn');
      var spawn = OC.house.spawns[spawnName] || OC.house.spawns[def.spawn];
      ctl.stand();
      ctl.teleport(spawn.x, spawn.z, spawn.yaw, 0);
      r.camera.fov = g.baseFov; // a set piece may have narrowed it
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
      if (id === 'act1') saveHabits();
      if (outcome === 'gag' && OC.epilogue) {
        // the Tupperware: its own short ending, and it counts as finishing
        if (current.act && current.act.dispose) current.act.dispose();
        interact.clear();
        saveCheckpoint(null);
        try {
          localStorage.setItem('oakridge.finished', '1');
        } catch (e) {
          /* no storage: chapters just stay locked */
        }
        current.id = 'epilogue';
        current.act = OC.epilogue.create(g, { variant: 'gag' });
        return;
      }
      var next = ACT_ORDER[ACT_ORDER.indexOf(id) + 1];
      if (next && OC.acts[next]) return startAct(next);
      if (!next && OC.epilogue) {
        if (current.act && current.act.dispose) current.act.dispose();
        interact.clear();
        saveCheckpoint(null); // finished: the next visit starts fresh
        try {
          localStorage.setItem('oakridge.finished', '1'); // unlocks chapter select
        } catch (e) {
          /* no storage: chapters just stay locked */
        }
        current.id = 'epilogue';
        current.act = OC.epilogue.create(g);
        return;
      }
      OC.hud.setFadeText('TO BE CONTINUED');
    };
    g.startAct = startAct;

    // ---- settings ------------------------------------------------------------------------------------
    var store = (function () {
      try {
        return window.localStorage;
      } catch (e) {
        return { getItem: function () { return null; }, setItem: function () {} };
      }
    })();
    var settings = OC.settings.load(store);
    function applySettings(s) {
      ctl.sensitivity = s.sensitivity;
      ctl.bobEnabled = s.bob;
      if (OC.audio) OC.audio.setVolume(s.volume);
      document.getElementById('vhs').style.opacity = s.vhs;
      document.getElementById('grain').style.opacity = 0.05 * s.vhs;
      document.body.classList.toggle('sub-small', s.subtitle === 'small');
      document.body.classList.toggle('sub-large', s.subtitle === 'large');
      var narrowed = Math.abs(r.camera.fov - g.baseFov) > 0.5; // a set piece is zoomed in: leave it
      g.baseFov = s.fov;
      if (!narrowed) {
        r.camera.fov = s.fov;
        r.camera.updateProjectionMatrix();
      }
    }
    g.baseFov = r.camera.fov;
    applySettings(settings);

    // ---- menus: title, pause, chapters, settings -------------------------------------------------------
    var NAMES = { day2: 'Day 2, 10:00 AM', act2: 'Night 2, 8:30 PM', act3: 'Night 2, 12:30 AM', act4: 'Night 2, 12:35 AM' };
    var playing = false; // the player has entered the game at least once this visit
    function chaptersUnlocked() {
      try {
        return localStorage.getItem('oakridge.finished') === '1';
      } catch (e) {
        return false;
      }
    }
    function showTitle() {
      var saved = loadCheckpoint();
      menu.showTitle({
        continueLabel: saved && saved !== 'act1' && NAMES[saved] ? NAMES[saved] : null,
        chaptersUnlocked: chaptersUnlocked(),
      });
    }
    // enter the game: start the sound (needs this click) and capture the mouse
    function begin() {
      if (OC.audio) {
        OC.audio.init();
        OC.audio.setVolume(settings.volume);
        if (!g.drone && OC.audio.ready()) g.drone = OC.audio.play('drone');
      }
      ctl.requestLock();
    }
    var menu = OC.menu.create({
      settings: settings,
      onSettings: function (s) {
        settings = s;
        applySettings(s);
        OC.settings.save(store, s);
      },
      onChoice: function (action, arg) {
        if (action === 'new') {
          saveCheckpoint(null);
          startAct('act1');
        } else if (action === 'chapter') {
          startAct(arg);
        } else if (action === 'restart') {
          startAct(current.id === 'epilogue' ? 'act1' : current.id);
        } else if (action === 'quit') {
          return showTitle();
        }
        begin(); // new, continue, chapter, resume, restart
      },
    });
    g.menu = menu;

    ctl.onLockChange = function (locked) {
      if (locked) {
        playing = true;
        menu.hide();
      } else if (playing) {
        menu.showPause();
      } else {
        showTitle();
      }
    };

    var params = new URLSearchParams(location.search);
    var saved = loadCheckpoint();
    var startAt = params.get('act') ? 'act' + Number(params.get('act')) : saved || 'act1';
    if (!OC.acts[startAt]) startAt = 'act1';
    showTitle();
    startAct(startAt);

    var samples = [];
    var last = performance.now();
    var phoneClock = 0;

    // one step of the simulation (everything except drawing)
    function tick(dt) {
      if (ctl.locked && g.clock) g.clock.tick(dt);
      ctl.update(dt);
      if (OC.audio) OC.audio.listen(r.camera);
      interact.suspend(phone.isOpen || phone.choosing() || g.state.cutscene || !!g.state.modal || OC.hud.isReading());
      interact.update(dt);
      if (ctl.locked) phone.update(dt); // a timed choice must not run out while the game is paused
      g.photo.update(dt);
      g.petcam.on = g.state.petcamForce || (phone.isOpen && phone.currentApp() === 'petcam');
      g.petcam.update(dt, g.clock ? g.clock.label() : '');
      props.update(dt);
      cooper.update(dt);
      if (current.act) current.act.update(dt);
      if (current.def) OC.hud.setStamp(current.def.stamp || current.def.night, g.clock.label());
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
      g.mirror.update();
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
        g.mirror.update();
        r.render();
      },
      // open the phone on an app ('home', 'camera', 'petcam', 'photos', 'flappy', 'music'), or close it
      phoneApp: function (name) {
        if (!name) return phone.close();
        if (!phone.isOpen) phone.open();
        phone.app(name);
      },
      shoot: function () {
        return g.photo.shoot();
      },
      // answer the open choice, 1-based
      choose: function (n) {
        phone.answer(n);
      },
      // type a time on the microwave keypad and press Enter
      keypad: function (str) {
        return current.act.mods.dinner.keypadInput(str);
      },
      habits: function () {
        return g.habits.entries();
      },
      act1: function () {
        return current.id === 'act1' ? current.act : null;
      },
      dread: function () {
        return current.act && current.act.dread ? current.act.dread.stage() : null;
      },
      // turn to look at a point
      aim: function (x, y, z) {
        var dx = x - ctl.pos.x;
        var dz = z - ctl.pos.z;
        ctl.yaw = Math.atan2(-dx, -dz);
        ctl.pitch = Math.atan2(y - r.camera.position.y, Math.hypot(dx, dz));
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
      // A standing check, run after every change: (1) every interaction in every act can be found by
      // a player looking at it (through the real picker, not a shortcut); (2) walking through the doors
      // that close behind you, with real key presses, never traps you; (3) Night 1's flows, played
      // through the real items. Returns a promise of the report. Leaves the game in Act 1.
      sweep: async function () {
        var R = OC.controller.RADIUS;
        var report = { failures: [], items: {}, doors: {} };
        function aim(from, eyeY, it) {
          var dx = it.x - from.x;
          var dz = it.z - from.z;
          var h = Math.hypot(dx, dz);
          return { x: from.x, y: eyeY, z: from.z, yaw: Math.atan2(-dx, -dz), pitch: Math.atan2(it.y - eyeY, h) };
        }
        function pickable(cam, it) {
          var probe = Object.assign({}, it, { enabled: true });
          return !!OC.pick.pickTarget(cam, [probe], ctl.boxes);
        }
        function standing(it) {
          for (var d = 0.8; d <= 1.81; d += 0.33) {
            for (var a = 0; a < Math.PI * 2; a += Math.PI / 16) {
              var p = { x: it.x + Math.cos(a) * d, z: it.z + Math.sin(a) * d };
              if (OC.collision.blocked(p.x, p.z, R, ctl.boxes)) continue;
              if (pickable(aim(p, 1.65, it), it)) return true;
            }
          }
          return false;
        }
        // items used from a seat: checked from where the player actually sits
        var SEATED = {
          act3: { ids: ['charger', 'phone'], at: function () {} },
          act4: { ids: ['ignition', 'down'], at: function () { ctl.seat(10.4, -9.95, Math.PI, -0.6); } },
        };
        ACT_ORDER.forEach(function (id) {
          if (!OC.acts[id]) return;
          startAct(id);
          ctl.setLocked(true);
          OC.debug.advance(0.3);
          var seated = SEATED[id];
          if (seated) {
            seated.at();
            OC.debug.advance(0.5);
          }
          interact.items.forEach(function (it) {
            var ok;
            if (seated && seated.ids.indexOf(it.id) >= 0) {
              ok = pickable(aim(ctl.pos, r.camera.position.y, it), it);
            } else ok = standing(it);
            report.items[id + '.' + it.id] = ok;
            if (!ok) report.failures.push(id + '.' + it.id + ': no prompt');
          });
        });
        // the Act 2 front door: unlock it, then walk in holding W, the way a player does
        startAct('act2');
        ctl.setLocked(true);
        OC.debug.use('bush');
        ctl.teleport(2.5, -1.2, Math.PI, 0);
        OC.debug.use('frontDoor');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        OC.debug.advance(3);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
        var walkedIn = ctl.pos.z > 2 && !props.frontDoor.isOpen;
        report.doors.act2FrontDoor = walkedIn;
        if (!walkedIn) report.failures.push('act2 front door: walking in got stuck (z=' + ctl.pos.z.toFixed(2) + ')');
        // the Act 4 bathroom door must refuse to close on someone standing in it
        startAct('act4');
        ctl.setLocked(true);
        ctl.teleport(4.88, 21.5, -Math.PI / 2, 0);
        OC.debug.use('bathDoor');
        var refused = !props.bathDoor.closed;
        report.doors.act4BathDoorInDoorway = refused;
        if (!refused) report.failures.push('act4 bath door closed on the player');

        // ---- Night 1, played through the real items ------------------------------------------------
        report.flows = {};
        var D = OC.debug;
        function tick() {
          return new Promise(function (res) { setTimeout(res, 0); });
        }
        function key(code, up) {
          window.dispatchEvent(new KeyboardEvent(up ? 'keyup' : 'keydown', { code: code }));
        }
        function freshNight() {
          startAct('act1');
          ctl.setLocked(true);
          D.advance(0.3);
          return current.act;
        }
        async function flow(name, fn) {
          var res;
          try {
            res = await fn();
          } catch (e) {
            res = 'threw ' + e.message;
          }
          report.flows[name] = res === true ? true : String(res);
          if (res !== true) report.failures.push('flow ' + name + ': ' + res);
        }
        var DINNERS = {
          lasagna: [1, ['microwave', 'kp:230', 15.5, 'microwave']],
          pizza: [2, ['oven', 12.5, 'oven', 18.5, 'oven']],
          mac: [3, ['kettle', 10.5, 'kettle']],
          cereal: [4, []],
          tupperware: [5, ['microwave', 'kp:200', 12.5, 'microwave']],
        };
        for (const dish of Object.keys(DINNERS)) {
          await flow('dinner.' + dish, async function () {
            var a = freshNight();
            var plan = DINNERS[dish];
            D.use('fridge');
            await tick();
            D.choose(plan[0]);
            await tick();
            for (const s of plan[1]) {
              if (typeof s === 'number') D.advance(s);
              else if (s.indexOf('kp:') === 0) {
                if (!D.keypad(s.slice(3))) return 'the keypad refused ' + s.slice(3);
              } else if (!D.use(s)) return s + ' was not usable';
              await tick();
            }
            if (!D.use('table')) return 'could not sit at the table';
            D.advance(1);
            if (!D.use('eat')) return 'could not eat';
            D.advance(7);
            await tick();
            if (dish !== 'tupperware') {
              D.choose(2);
              await tick();
            }
            D.advance(6);
            await tick();
            var din = a.mods.dinner.dinner();
            if (din.state !== 'eaten') return 'ended ' + din.state;
            if (!g.habits.has('dinner')) return 'not in the habit log';
            if (dish === 'tupperware' && !g.state.gag) return 'no gag ending flag';
            if (ctl.frozen) return 'still sitting at the table';
            return true;
          });
        }
        await flow('tv', async function () {
          var a = freshNight();
          var tv = a.mods.tv.tv;
          ctl.teleport(19.4, 3.0, 0, -0.05);
          D.use('tv');
          D.advance(0.3);
          var seen = [];
          for (var i = 0; i < 4; i++) {
            D.use('remote');
            D.advance(0.5);
            seen.push(tv.channel().n);
            if (!tv.caption()) return 'no caption on ' + tv.channel().n;
          }
          if (seen.join() !== '22,31,48,7') return 'channels went ' + seen.join();
          if (!document.getElementById('cc').classList.contains('on')) return 'no captions on screen while watching';
          a.mods.tv.armAlert();
          D.advance(4.3);
          if (!tv.alerting() || OC.tvData.alert.lines.indexOf(tv.caption()) < 0) return 'the alert did not interrupt';
          D.advance(17);
          if (tv.alerting() || OC.tvData.alert.lines.indexOf(tv.caption()) >= 0) return 'the alert did not end';
          return true;
        });
        await flow('photo', async function () {
          freshNight();
          ctl.teleport(6.1, 6.6, Math.PI, 0);
          D.advance(0.2);
          var n = g.photo.album.length;
          D.phoneApp('camera');
          var p = D.shoot();
          D.phoneApp(null);
          if (!p || g.photo.album.length !== n + 1) return 'no photo in the album';
          var b = OC.camera.brightness(p.canvas);
          if (b < 10) return 'a black photo (' + b.toFixed(1) + ')';
          return true;
        });
        await flow('petcam', async function () {
          freshNight();
          D.phoneApp('petcam');
          var f = g.petcam.frames;
          D.advance(0.6);
          D.phoneApp(null);
          if (g.petcam.frames <= f) return 'no frames';
          if (g.petcam.lastBrightness < 5) return 'a black feed';
          return true;
        });
        await flow('mirror', async function () {
          freshNight();
          props.setLights({ bath: 0.9 });
          ctl.teleport(3.95, 22.8, Math.PI, 0);
          var f = g.mirror.frames;
          D.advance(0.2);
          if (!g.mirror.active || g.mirror.frames <= f) return 'the mirror is not rendering';
          var b = g.mirror.sample();
          if (b < 5) return 'a black mirror (' + b.toFixed(1) + ')';
          return true;
        });
        await flow('laundryDoor', async function () {
          freshNight();
          ctl.teleport(6.4, 10.5, Math.PI / 2, 0); // in the hall, facing the laundry room
          props.laundryDoor.close(ctl.pos, true);
          if (ctl.nav) ctl.nav.rebuild();
          key('KeyW');
          D.advance(2);
          key('KeyW', true);
          if (ctl.pos.x < 5.3) return 'walked through the closed door (x=' + ctl.pos.x.toFixed(2) + ')';
          D.use('laundryDoor');
          if (props.laundryDoor.closed) return 'it would not open';
          key('KeyW');
          D.advance(3);
          key('KeyW', true);
          if (ctl.pos.x > 4.5) return 'could not walk in (x=' + ctl.pos.x.toFixed(2) + ')';
          ctl.teleport(5.0, 10.5, Math.PI / 2, 0);
          if (props.laundryDoor.close(ctl.pos)) return 'it closed on the player';
          return true;
        });
        await flow('readerClose', async function () {
          freshNight();
          D.goto('fridge', 0);
          D.aim(12.55, 1.4, 0.9);
          D.advance(0.2);
          if (!interact.target || interact.target.id !== 'note') return 'not looking at the note';
          key('KeyE');
          key('KeyE', true);
          D.advance(0.1);
          if (!OC.hud.isReading()) return 'E did not open the note';
          await new Promise(function (res) { setTimeout(res, 300); });
          document.body.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
          document.body.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
          D.advance(0.2);
          if (OC.hud.isReading()) return 'E put the note down and picked it straight back up';
          return true;
        });
        await flow('modalUnlock', async function () {
          freshNight();
          ctl.teleport(6.3, 1.5, 0, -0.5);
          D.use('fridge');
          await tick();
          D.choose(1);
          await tick();
          D.use('microwave');
          if (g.state.modal !== 'keypad') return 'the keypad did not open';
          ctl.setLocked(false); // Esc
          ctl.setLocked(true); // back in
          if (g.state.modal !== 'keypad') return 'the keypad vanished on pause';
          key('KeyE');
          key('KeyE', true);
          D.advance(0.3);
          if (g.state.modal) return 'the keypad is still open after E (' + g.state.modal + ')';
          if (ctl.frozen) return 'Mason is still frozen';
          return true;
        });
        await flow('restart', async function () {
          var a = freshNight();
          props.laundryDoor.close(null, true);
          D.use('tv');
          cooper.pose('sit');
          D.phoneApp('music');
          phone.act(); // play a track
          D.phoneApp(null);
          startAct('act1');
          ctl.setLocked(true);
          D.advance(0.2);
          if (props.laundryDoor.closed) return 'the laundry door is still closed';
          if (props.tv.on) return 'the TV is still on';
          if (cooper.poseName !== 'stand') return 'Cooper is still ' + cooper.poseName;
          if (a.loops.length) return a.loops.length + ' sounds from the old night still running';
          if (g.state.music) return 'the mixtape is still playing';
          return true;
        });
        await flow('petcamCooperStays', async function () {
          // go to bed as soon as it is allowed: nothing left over from the relief may move Cooper
          var a = freshNight();
          var st = a.dread.state;
          st.stage = 'knocked';
          props.laundryDoor.close(null, true);
          D.use('laundryDoor');
          var t = 0;
          while (a.dread.stage() !== 'bed' && t < 40) {
            D.advance(0.5);
            t += 0.5;
          }
          if (a.dread.stage() !== 'bed') return 'never reached bed (' + a.dread.stage() + ')';
          ctl.teleport(2.9, 15.6, Math.PI / 2, 0);
          D.use('bed');
          D.advance(14);
          var bed = props.decor.dogBed;
          var off = Math.hypot(cooper.pos.x - bed.x, cooper.pos.z - bed.z);
          if (off > 0.3) return 'Cooper left his bed during the 2:13 feed (' + off.toFixed(2) + ' m away, ' + cooper.mode + ')';
          return true;
        });
        await flow('newGameAfterGag', async function () {
          freshNight();
          current.act.dispose();
          interact.clear();
          current.id = 'epilogue';
          current.act = OC.epilogue.create(g, { variant: 'gag' });
          D.advance(2);
          startAct('act1'); // what Quit to title, then New game, does
          ctl.setLocked(true);
          if (document.getElementById('epilogue').classList.contains('on')) return 'the ending screen is still covering the game';
          if (g.state.cutscene) return 'still in a cutscene';
          return true;
        });
        await flow('night1Afk', async function () {
          var a = freshNight();
          ctl.teleport(22.5, 5.5, 0.53, 0);
          var t = 0;
          while (a.dread.stage() !== 'bed' && t < 1100) {
            if (t >= 560 && t < 620) ctl.teleport(2.5, -4, Math.PI, 0); // a minute out on the porch
            else if (t >= 620 && t < 625) ctl.teleport(22.5, 5.5, 0.53, 0);
            D.advance(5, 0.1);
            t += 5;
            await tick(); // lets timed-out choices resolve
          }
          if (a.dread.stage() !== 'bed') return 'stuck at ' + a.dread.stage() + ' after ' + t + ' s';
          report.afkSeconds = t;
          return true;
        });

        startAct('act1');
        report.ok = report.failures.length === 0;
        return report;
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

  function start() {
    try {
      boot();
    } catch (e) {
      console.error(e);
      OC.showError(e.message);
    }
  }
  // the furniture and trees are models: parse them first (they are embedded, so this is quick)
  if (OC.models && OC.modelData && window.THREE && THREE.GLTFLoader) {
    OC.models.load().then(start, function (e) {
      console.error(e);
      OC.showError(e.message);
    });
  } else start();
})();
