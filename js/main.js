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
    if (OC.decor2) OC.decor2.build(world, props, OC.house); // what night two changes
    if (OC.places) OC.places.build(world); // the road to town and the Gas-N-Go, far off
    if (OC.crawl) OC.crawl.build(world); // under the house (also far off, so it is never seen from above)
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
      if (!OC.audio) return;
      if (ctl.prone) OC.audio.play('crawlStep', { gain: 0.7 });
      else OC.audio.play('step', { surface: surfaceAt(ctl.pos.x, ctl.pos.z), gain: 0.55 });
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

    // achievements: marks from everything Mason does (the habit log) and from each ending, kept across
    // playthroughs; a new one shows in the corner
    var achievements = (function () {
      try {
        return OC.achievements.restore(JSON.parse(localStorage.getItem('oakridge.achievements')));
      } catch (e) {
        return OC.achievements.createAchievements();
      }
    })();
    function saveAchievements() {
      try {
        localStorage.setItem('oakridge.achievements', JSON.stringify(achievements.serialize()));
      } catch (e) {
        /* no storage: they last until the tab closes */
      }
    }
    function announce(list) {
      if (!list.length) return;
      saveAchievements();
      list.forEach(function (a) { OC.hud.achievement(a.title); });
    }
    g.achievements = achievements;
    g.unlock = function (marks) {
      announce(achievements.note(marks));
    };
    g.habits.entries().forEach(function (e) { achievements.noteEntry(e); }); // a save from before achievements: quietly
    saveAchievements();
    var logHabit = g.habits.log;
    g.habits.log = function (action, detail, when) {
      var e = logHabit(action, detail, when);
      announce(achievements.noteEntry(e));
      return e;
    };
    // when the player really started: the last line of his notebook, in the epilogue
    var bootTime = Date.now();
    function saveBegan() {
      try {
        localStorage.setItem('oakridge.began', String(Date.now()));
      } catch (e) {
        /* no storage: the time the page opened stands in */
      }
    }
    g.began = function () {
      var v = 0;
      try {
        v = Number(localStorage.getItem('oakridge.began')) || 0;
      } catch (e) {
        v = 0;
      }
      return new Date(v || bootTime);
    };

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

    // under the house: the nest, the dust, the borrowed lights
    g.crawl = OC.crawl ? OC.crawl.create(world, r.scene) : null;
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

    // an act's own timers (its fades, end cards and the call to onEnd). They belong to the act that set them:
    // starting any act or ending, or quitting to the title, clears them, so a timer from an act that is gone
    // can't move the next one on (Restart during 12:30's fade used to jump to 12:35 2.6 s later, and Quit to
    // title started the next act behind the title)
    var actTimers = [];
    g.after = function (fn, ms) { // like setTimeout
      var id = setTimeout(function () {
        var i = actTimers.indexOf(id);
        if (i >= 0) actTimers.splice(i, 1);
        fn();
      }, ms);
      actTimers.push(id);
      return id;
    };
    function clearActTimers() {
      actTimers.forEach(function (id) { clearTimeout(id); });
      actTimers = [];
    }

    function startAct(id) {
      var def = OC.acts[id];
      clearActTimers();
      if (current.act && current.act.dispose) current.act.dispose(); // stop the last act's loops and listeners
      interact.clear();
      props.reset();
      world.setDaylight(def.daylight || 0, r.renderer); // night, unless the act is a day
      if (OC.places) OC.places.lightsAt(world, 'home');
      if (g.crawl) {
        g.crawl.lights(false);
        g.crawl.showNotebook(true);
      }
      if (r.scene.fog) r.scene.fog.density = 0.04 - 0.028 * (def.daylight || 0);
      ctl.light.drain = 1;
      ctl.light.power = 2.4;
      ctl.light.spot.angle = 0.55;
      ctl.light.spot.distance = 22;
      ctl.light.falterT = 0;
      g.petcam.setTurned(false);
      props.intruder.lift = 0;
      g.petcam.gain = 2.2;
      g.petcam.clipGain = 0;
      g.petcam.beforeRender = g.petcam.afterRender = null;
      phone.setContacts(def.contacts || []);
      if (props.decor && props.decor.petcamDevice) props.decor.petcamDevice.turn(false);
      document.getElementById('epilogue').classList.remove('on'); // an ending screen must not cover a new night
      document.body.classList.remove('in-epilogue');
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

    // an ending: the epilogue ('main'), or the Tupperware ('gag') or the closet ('bad'), which count as finishing
    function startEpilogue(variant) {
      clearActTimers();
      if (current.act && current.act.dispose) current.act.dispose();
      interact.clear();
      saveCheckpoint(null); // finished: the next visit starts fresh
      try {
        localStorage.setItem('oakridge.finished', '1'); // unlocks chapter select, and a light in the title's window
      } catch (e) {
        /* no storage: chapters just stay locked */
      }
      if (variant === 'gag' || variant === 'bad') g.unlock(['ending:' + variant]);
      g.clock = OC.clock.gameClock({ startMin: 6 * 60 + 12, endMin: 6 * 60 + 40, durationSec: 900 });
      current.id = 'epilogue';
      current.variant = variant || 'main'; // Restart plays this same ending again
      current.def = { stamp: content.t('ep.stamp') }; // the epilogue changes it for the later visit
      document.body.classList.add('in-epilogue');
      current.act = OC.epilogue.create(g, { variant: variant || 'main', def: current.def });
    }
    g.startEpilogue = startEpilogue;
    // quitting to the title from an ending: it cannot be continued (there is no checkpoint after it), so
    // put it all away now instead of leaving the cards, the cruiser and the hum behind the title
    function leaveEnding() {
      if (current.id !== 'epilogue' || !current.act) return;
      if (current.act.dispose) current.act.dispose();
      current.act = null;
      document.body.classList.remove('in-epilogue');
      world.setDaylight(0, r.renderer); // the title is at night, even if he quit in the afternoon visit
    }
    g.onEnd = function (id, outcome) {
      if (outcome === 'retry') return startAct(id);
      saveHabits(); // every chapter adds to the log the later ones read
      if ((outcome === 'gag' || outcome === 'bad') && OC.epilogue) return startEpilogue(outcome);
      var next = ACT_ORDER[ACT_ORDER.indexOf(id) + 1];
      if (next && OC.acts[next]) return startAct(next);
      if (!next && OC.epilogue) return startEpilogue('main');
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
        achievements: achievements.unlocked().length + '/' + OC.achievements.LIST.length,
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
      achievements: function () {
        return achievements.list();
      },
      onSettings: function (s) {
        settings = s;
        applySettings(s);
        OC.settings.save(store, s);
      },
      onChoice: function (action, arg) {
        if (action === 'new') {
          saveCheckpoint(null);
          saveBegan();
          startAct('act1');
        } else if (action === 'chapter') {
          startAct(arg);
        } else if (action === 'restart') {
          if (current.id === 'epilogue') startEpilogue(current.variant);
          else startAct(current.id);
        } else if (action === 'quit') {
          clearActTimers();
          leaveEnding();
          return showTitle();
        }
        begin(); // new, continue, chapter, resume, restart
      },
    });
    g.menu = menu;

    ctl.onLockChange = function (locked) {
      if (locked) {
        if (!playing && current.id === 'act1' && !g.habits.entries().length) saveBegan(); // a fresh night one
        playing = true;
        menu.hide();
      } else if (playing) {
        menu.showPause();
      } else {
        showTitle();
      }
    };


    // ---- the title screen's picture: the house from the side yard at night, calm. After any ending, a
    // light is on in the guest room window (his old room).
    var titleView = (function () {
      var cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 160);
      cam.rotation.order = 'YXZ';
      var FROM = { x: -10.5, y: 1.6, z: -4 }; // off the porch's corner: the house fills the right of the screen
      var AT = { x: 5.2, y: 1.45, z: 3.2 };
      var MOON = 0.18;
      var LAMP = 1.5;
      var glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 1.1),
        new THREE.MeshBasicMaterial({ color: 0xffb35c, fog: false, transparent: true, opacity: 0.8 })
      );
      glow.position.set(0.13, 1.5, 16); // just inside the guest room's west window
      glow.rotation.y = -Math.PI / 2; // facing out
      glow.visible = false;
      r.scene.add(glow);
      var lamp = world.lightById.guest;
      var lampWas = null;
      var dayWas = null;
      var on = false;
      var time = 0;
      function enter() {
        on = true;
        var lit = chaptersUnlocked();
        glow.visible = lit;
        if (lamp) {
          lampWas = lamp.intensity;
          if (lit) lamp.intensity = LAMP;
        }
        // a little moon, so the house reads as a house and not a black box
        dayWas = world.daylight;
        if (dayWas < MOON) world.setDaylight(MOON, r.renderer);
      }
      return {
        active: function () {
          return document.body.classList.contains('at-title');
        },
        render: function (dt) {
          if (!on) enter();
          time += dt;
          if (Math.abs(cam.aspect - r.camera.aspect) > 1e-3) {
            cam.aspect = r.camera.aspect;
            cam.updateProjectionMatrix();
          }
          cam.position.set(FROM.x + Math.sin(time * 0.06) * 0.7, FROM.y + Math.sin(time * 0.13) * 0.04, FROM.z);
          cam.lookAt(AT.x, AT.y, AT.z);
          r.renderer.render(r.scene, cam);
        },
        leave: function () {
          if (!on) return;
          on = false;
          glow.visible = false;
          // put back only what is still ours: an act may have changed it since (an ending starting at dawn)
          if (lamp && lampWas !== null && lamp.intensity === LAMP) lamp.intensity = lampWas;
          if (dayWas !== null && dayWas < MOON && world.daylight === MOON) world.setDaylight(dayWas, r.renderer);
          lampWas = null;
          dayWas = null;
        },
        // for tuning the shot from the console: OC.debug.titlePose({x,y,z}, {x,y,z})
        pose: function (from, at) {
          if (from) FROM = from;
          if (at) AT = at;
        },
        lit: function () {
          return glow.visible;
        },
      };
    })();

    var params = new URLSearchParams(location.search);
    var saved = loadCheckpoint();
    var startAt = params.get('act') ? 'act' + Number(params.get('act')) : saved || 'act1';
    if (!OC.acts[startAt]) startAt = 'act1';
    showTitle();
    startAct(startAt);

    var samples = [];
    var last = performance.now();
    var phoneClock = 0;
    var flappyTen = false;

    // one step of the simulation (everything except drawing)
    function tick(dt) {
      if (ctl.locked && g.clock) g.clock.tick(dt);
      ctl.update(dt);
      if (OC.audio) OC.audio.listen(r.camera);
      interact.suspend(phone.choosing() || g.state.cutscene || !!g.state.modal || OC.hud.isReading());
      interact.update(dt);
      if (ctl.locked) phone.update(dt); // a timed choice must not run out while the game is paused
      if (!flappyTen && phone.flappy() && phone.flappy().best() >= 10) {
        flappyTen = true;
        g.habits.log('flappyTen', {}, { clock: g.clock ? g.clock.label() : '', t: 0 });
      }
      g.photo.update(dt);
      g.petcam.on = g.state.petcamForce || (phone.isOpen && phone.currentApp() === 'petcam');
      g.petcam.update(dt, g.clock ? g.clock.label() : '');
      if (g.crawl) g.crawl.update(dt, { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw }, ctl.light.on && ctl.light.falterT <= 0);
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
      if (titleView.active()) titleView.render(dt);
      else {
        titleView.leave();
        r.render();
      }
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
      // open the phone on an app ('home', 'messages', 'camera', 'petcam', 'photos', 'flappy', 'music', 'calls'), or close it
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
      // start night two with these habit gates, whatever the log says (for checks): { breaker, lightFalters, tvReflection }, familiar
      night2: function (gates, familiar) {
        g.state.forcePlan = gates ? { gates: Object.assign({ breaker: false, lightFalters: false, tvReflection: false }, gates), familiar: familiar || 'microwave' } : null;
        startAct('act2');
        g.state.forcePlan = null;
        return current.act;
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
      titlePose: function (from, at) {
        titleView.pose(from, at);
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
        // the flows finish endings and earn achievements: put the player's own progress back afterwards
        var STORE_KEYS = ['oakridge.finished', 'oakridge.checkpoint', 'oakridge.achievements', 'oakridge.habits', 'oakridge.began'];
        var storeWas = {};
        STORE_KEYS.forEach(function (k) {
          try {
            storeWas[k] = localStorage.getItem(k);
          } catch (e) {
            storeWas[k] = null;
          }
        });
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
          for (var d = it.eye ? 0.5 : 0.8; d <= 1.81; d += 0.33) {
            for (var a = 0; a < Math.PI * 2; a += Math.PI / 16) {
              var p = { x: it.x + Math.cos(a) * d, z: it.z + Math.sin(a) * d };
              if (OC.collision.blocked(p.x, p.z, R, ctl.boxes)) continue;
              if (pickable(aim(p, it.eye || 1.65, it), it)) return true;
            }
          }
          return false;
        }
        // items used from a seat: checked from where the player actually sits
        var SEATED = {
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
        OC.debug.use('rock');
        ctl.teleport(2.5, -1.2, Math.PI, 0);
        OC.debug.use('frontDoor');
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
        OC.debug.advance(3);
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
        var walkedIn = ctl.pos.z > 1.5 && !props.frontDoor.isOpen;
        report.doors.act2FrontDoor = walkedIn;
        if (!walkedIn) report.failures.push('act2 front door: walking in got stuck (z=' + ctl.pos.z.toFixed(2) + ')');
        // Day 2: the shed and the car are outside, so Mason must be able to get out of the house. Find the
        // front door from the foyer through the real picker, open it, and walk out holding W
        startAct('day2');
        ctl.setLocked(true);
        OC.debug.advance(0.3);
        var door2 = interact.items.filter(function (i) { return i.id === 'frontDoor'; })[0];
        var out2 = false;
        if (door2) {
          ctl.teleport(2.5, 1.2, 0, 0);
          if (pickable(aim(ctl.pos, 1.65, door2), door2)) {
            OC.debug.use('frontDoor');
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
            OC.debug.advance(3);
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
            out2 = ctl.pos.z < -1.5;
          }
        }
        report.doors.day2WalkOut = out2;
        if (!out2) report.failures.push('day2: no way out of the house (' + (door2 ? 'stuck at z=' + ctl.pos.z.toFixed(2) : 'no front door to use') + ')');
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
        // the phone's cursor, with real mouse events: take the phone out, point at Texts and a chat and
        // click them, keep walking and using things, look by pushing off the phone, put it away, look again
        await flow('phoneMouse', async function () {
          freshNight();
          D.advance(76); // Dave's first text (at 18 s) and Ethan's (at 75 s): two chats
          if (phone.threads().length < 2) return 'expected two chats, got ' + phone.threads().length;
          var SENS = 0.0022 * ctl.sensitivity; // the controller's turn per pixel
          function move(dx, dy) {
            document.dispatchEvent(new MouseEvent('mousemove', { movementX: dx, movementY: dy }));
          }
          // move in steps a real mouse would send, then let a frame go by (the highlight is per frame)
          function glide(dx, dy) {
            var n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 12));
            var sx = 0;
            var sy = 0;
            for (var i = 1; i <= n; i++) {
              var tx = Math.round((dx * i) / n);
              var ty = Math.round((dy * i) / n);
              move(tx - sx, ty - sy);
              sx = tx;
              sy = ty;
            }
            D.advance(0.05);
          }
          function pointAt(node) {
            var b = node.getBoundingClientRect();
            var c = phone.cursor();
            glide(b.left + b.width / 2 - c.x, b.top + b.height / 2 - c.y);
          }
          function clickHere() {
            document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
            document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
          }
          key('Tab');
          key('Tab', true);
          if (!phone.isOpen) return 'Tab did not take the phone out';
          if (!phone.cursor().on || !document.body.classList.contains('phone-cursor')) return 'no cursor on the phone';
          var yaw = ctl.yaw;
          var pitch = ctl.pitch;
          var tab = document.querySelector('#phoneApps [data-arg="messages"]');
          pointAt(tab);
          if (ctl.yaw !== yaw || ctl.pitch !== pitch) return 'moving the cursor on the phone turned the view';
          if (phone.cursor().hover !== 'app:messages' || !document.querySelector('#phoneApps [data-arg="messages"]').classList.contains('hover')) {
            return 'Texts did not light up under the cursor (' + phone.cursor().hover + ')';
          }
          clickHere();
          if (phone.currentApp() !== 'messages') return 'clicking Texts opened ' + phone.currentApp();
          // the second chat (not the one picked already): it lights up and becomes the pick; a click opens it
          var want = phone.threads()[1];
          var row = document.querySelector('#phoneMsgs .chat-row[data-arg="' + want + '"]');
          if (!row) return 'no row for ' + want;
          pointAt(row);
          if (phone.cursor().hover !== 'chat:' + want || !row.classList.contains('on')) return 'the ' + want + ' chat did not light up (' + phone.cursor().hover + ')';
          if (document.querySelectorAll('#phoneMsgs .chat-row.on').length !== 1) return 'more than one chat lit up';
          clickHere();
          if (phone.openThread() !== want) return 'clicking the ' + want + ' chat opened ' + phone.openThread();
          pointAt(document.getElementById('msgHeader'));
          if (phone.cursor().hover !== 'back:') return 'the top line of the chat did not light up (' + phone.cursor().hover + ')';
          clickHere();
          if (phone.openThread() !== null) return 'clicking the top line did not go back to the chats';

          // the game goes on with the phone out: the clock, walking, E
          if (!ctl.locked || document.getElementById('pause').classList.contains('on')) return 'the phone paused the game';
          var m0 = g.clock.minutes();
          ctl.teleport(10, -13.5, Math.PI, 0); // the driveway, facing the house: open ground
          var p0 = { x: ctl.pos.x, z: ctl.pos.z };
          key('KeyW');
          D.advance(0.6);
          key('KeyW', true);
          if (!(g.clock.minutes() > m0)) return 'the clock stopped with the phone out';
          if (Math.hypot(ctl.pos.x - p0.x, ctl.pos.z - p0.z) < 0.3) return 'could not walk with the phone out';
          D.goto('fridge', 0);
          D.aim(12.55, 1.4, 0.9);
          D.advance(0.2);
          if (!interact.target || interact.target.id !== 'note') return 'E had nothing to use with the phone out';

          // pushing off the phone turns the view by what went past the edge; the cursor waits there
          var rect = document.getElementById('phone').getBoundingClientRect();
          yaw = ctl.yaw;
          pitch = ctl.pitch;
          var cx = phone.cursor().x;
          var push = Math.round(rect.left - cx) - 100; // whole pixels, like a real mouse
          var past = rect.left - (cx + push); // the part of it beyond the phone's left edge (100)
          glide(push, 0);
          if (!phone.cursor().out) return 'the cursor did not leave the phone';
          if (Math.abs(ctl.yaw - yaw - past * SENS) > 1e-6) return 'pushing ' + past.toFixed(1) + ' px off the phone turned ' + ((ctl.yaw - yaw) / SENS).toFixed(1) + ' px';
          if (ctl.pitch !== pitch) return 'pushing sideways off the phone tipped the view';
          if (phone.cursor().hover !== null) return 'something stayed lit with the mouse off the phone';
          clickHere(); // a click off the phone opens nothing
          if (phone.openThread() !== null) return 'a click off the phone opened ' + phone.openThread();
          // and coming back is short: the cursor is on the phone again within cursor.OUT
          yaw = ctl.yaw;
          glide(OC.cursor.OUT + 20, 0);
          if (phone.cursor().out) return 'the cursor did not come back onto the phone';
          if (ctl.yaw - yaw < -OC.cursor.OUT * SENS - 1e-6) return 'coming back turned the view too far';

          // Esc pauses with the phone out, and it is still out after Resume
          var m1 = g.clock.minutes();
          ctl.setLocked(false);
          if (!document.getElementById('pause').classList.contains('on')) return 'Esc did not pause with the phone out';
          D.advance(2);
          if (g.clock.minutes() !== m1) return 'the clock ran in the pause menu';
          ctl.setLocked(true);
          if (!phone.isOpen || !phone.cursor().on) return 'the phone or its cursor was gone after Resume';

          // Tab puts it away, and the mouse looks again
          key('Tab');
          key('Tab', true);
          if (phone.isOpen) return 'Tab did not put the phone away';
          if (document.body.classList.contains('phone-cursor')) return 'the cursor stayed on screen';
          yaw = ctl.yaw;
          move(50, 0);
          if (Math.abs(yaw - ctl.yaw - 50 * SENS) > 1e-6) return 'the mouse did not look after the phone was put away';
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

        // ---- Night 2, played through the real items --------------------------------------------------
        function night2(gates) {
          D.night2(gates);
          ctl.setLocked(true);
          D.advance(0.3);
          return current.act;
        }
        // the key from the fake rock, the door, and in on foot
        function getIn(a) {
          D.use('rock');
          ctl.teleport(2.5, -1.2, Math.PI, 0);
          D.use('frontDoor');
          key('KeyW');
          D.advance(3);
          key('KeyW', true);
          return a.director.done('inside');
        }
        // close the slider, find the latch broken, fetch the broom, jam the track
        function lockUp(a) {
          D.use('slider');
          D.use('slider');
          D.use('broom');
          D.use('slider');
          return a.director.done('secure');
        }
        async function waitFor(pred, max) {
          var t = 0;
          while (!pred() && t < max) {
            D.advance(1, 0.1);
            t += 1;
            await tick();
          }
          return pred();
        }
        await flow('night2Breaker', async function () {
          var a = night2({ breaker: true });
          if (!getIn(a)) return 'did not get in';
          a.ctx.lights.set('kitchen', true);
          if (!lockUp(a)) return 'could not lock up';
          ctl.teleport(9, 6, 0, 0);
          var dread = a.mods.dread.state;
          if (!(await waitFor(function () { return dread.breaker === 'tripped'; }, 120))) return 'the breaker never tripped';
          D.advance(1);
          if (a.ctx.lights.hasPower() || world.lightById.kitchen.intensity > 0) return 'the lights stayed on';
          if (!D.use('breaker')) return 'the breaker could not be reset';
          if (!a.ctx.lights.hasPower() || world.lightById.kitchen.intensity <= 0) return 'the lights did not come back';
          if (props.changes.prints.showing() !== 'both') return 'no new footprints';
          return true;
        });
        await flow('night2Tv', async function () {
          var a = night2({ tvReflection: true });
          if (!getIn(a) || !lockUp(a)) return 'could not get in and lock up';
          ctl.teleport(19.3, 4.9, 0, -0.1); // behind the couch, facing the dark TV
          var dread = a.mods.dread.state;
          if (!(await waitFor(function () { return dread.tv === 'showing'; }, 90))) return 'the TV never showed it (' + dread.tv + ')';
          ctl.teleport(19.3, 4.9, Math.PI, 0); // he turns around
          D.advance(1.2);
          if (dread.tv !== 'done') return 'it was still there after he turned (' + dread.tv + ')';
          return true;
        });
        await flow('night2Light', async function () {
          var a = night2({ lightFalters: true });
          if (!getIn(a) || !lockUp(a)) return 'could not get in and lock up';
          ctl.teleport(6, 18, Math.PI, 0); // the dark end of the hall, light on
          ctl.light.on = true;
          var dread = a.mods.dread.state;
          if (!(await waitFor(function () { ctl.light.on = true; return dread.faltered; }, 120))) return 'the light never faltered';
          if (ctl.light.falterT <= 0) return 'faltered, but the light did not cut out';
          D.advance(4);
          if (ctl.light.falterT > 0) return 'the light never came back';
          return true;
        });
        await flow('night2Crawl', async function () {
          var a = night2({ breaker: false, tvReflection: true });
          if (!getIn(a)) return 'did not get in';
          D.goto('hatch', 0);
          D.use('hatch');
          await tick();
          D.choose(2); // go down
          await tick();
          if (!(await waitFor(function () { return a.flags.inCrawl; }, 5))) return 'never got under the house';
          D.advance(1);
          if (!ctl.prone || r.camera.position.y > 0.6) return 'not lying down (eye ' + r.camera.position.y.toFixed(2) + ')';
          var x0 = ctl.pos.x;
          ctl.yaw = -Math.PI / 2; // east
          key('KeyW');
          D.advance(2);
          key('KeyW', true);
          var moved = ctl.pos.x - x0;
          if (moved < 1.2 || moved > 2.2) return 'crawled ' + moved.toFixed(2) + ' m in 2 s';
          ctl.teleport(OC.crawl.HATCH.x, OC.crawl.HATCH.z + 0.8, 0, 0.4);
          D.use('crawl.climb');
          if (!(await waitFor(function () { return !a.flags.inCrawl; }, 5))) return 'could not climb out';
          D.advance(1.5);
          if (ctl.prone || ctl.frozen) return 'still lying down after climbing out';
          if (OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z) !== 'laundry') return 'came up somewhere else';
          if (Math.abs(r.scene.fog.density - 0.04) > 0.005) return 'the fog stayed thick (' + r.scene.fog.density + ')';
          if (world.lightById.laundry.position.x > 100) return 'the laundry light stayed under the house';
          return true;
        });
        await flow('night2Afk', async function () {
          // gets in, then never touches anything again: the night must still reach bed
          var a = night2({ breaker: true });
          if (!getIn(a)) return 'did not get in';
          ctl.teleport(9, 6, 0, 0);
          var dread = a.mods.dread.state;
          var t = 0;
          while (!dread.bedOpen && t < 720) {
            D.advance(5, 0.1);
            t += 5;
            await tick();
          }
          if (!dread.bedOpen) return 'bed never opened (stage ' + a.flags.stage + ') after ' + t + ' s';
          report.afk2Seconds = t;
          return true;
        });

        // ---- 12:30 AM and 12:35 AM, played through ------------------------------------------------
        async function answerUntil(pick, pred, max) {
          var t = 0;
          while (!pred() && t < max) {
            D.advance(0.5);
            t += 0.5;
            await tick();
            if (phone.choosing()) {
              D.choose(pick);
              await tick();
            }
          }
          return pred();
        }
        function aimAt(p) {
          var dx = p.x - ctl.pos.x;
          var dz = p.z - ctl.pos.z;
          ctl.yaw = Math.atan2(-dx, -dz);
          ctl.pitch = Math.atan2(p.y - r.camera.position.y, Math.hypot(dx, dz));
        }
        await flow('act3Bluff', async function () {
          startAct('act3');
          ctl.setLocked(true);
          var a = current.act;
          if (!(await answerUntil(1, function () { return a.flags.phase === 'taps'; }, 140))) return 'never reached the taps (' + a.flags.phase + ')';
          if (!(await waitFor(function () { return phone.choosing(); }, 6))) return 'no choice at the taps';
          D.choose(1); // leave it
          await tick();
          if (!(await waitFor(function () { return a.flags.phase === 'photo'; }, 20))) return 'never asked for the photo';
          aimAt(props.closet.eyeAt);
          D.phoneApp('camera');
          var p = D.shoot();
          D.phoneApp(null);
          if (!p || p.subject !== 'eye') return 'the photo did not show him (' + (p && p.subject) + ')';
          if (props.intruder.visible()) return 'he stayed in the room after the flash';
          if (!(await waitFor(function () { return a.flags.phase === 'choice' && phone.choosing(); }, 40))) return 'Ethan never got the bluff choice';
          D.choose(3);
          await tick();
          if (!(await waitFor(function () { return a.flags.phase === 'walk'; }, 40))) return 'never got up to walk';
          if (ctl.frozen) return 'still sitting';
          ctl.teleport(6, 18.5, Math.PI, 0);
          D.advance(1);
          ctl.teleport(3.5, 21.5, -Math.PI / 2, 0);
          D.advance(0.5);
          if (!a.flags.ending) return 'reaching the bathroom did not end the act';
          return true;
        });
        // an act's end timer dies with the act: end 12:30, restart it during the fade, and it stays 12:30
        await flow('restartInFade', async function () {
          startAct('act3');
          ctl.setLocked(true);
          var a = current.act;
          a.flags.phase = 'walk';
          ctl.teleport(6, 18.5, Math.PI, 0);
          D.advance(1);
          ctl.teleport(3.5, 21.5, -Math.PI / 2, 0);
          D.advance(0.5);
          if (!a.flags.ending) return 'reaching the bathroom did not end the act';
          startAct('act3'); // Restart this chapter, inside the fade
          var fresh = current.act;
          await new Promise(function (res) { setTimeout(res, 3000); });
          if (current.id !== 'act3' || current.act !== fresh) return "the old act's end timer moved the restart on to " + current.id;
          return true;
        });
        await flow('act3Closet', async function () {
          startAct('act3');
          ctl.setLocked(true);
          var a = current.act;
          if (!(await answerUntil(2, function () { return a.flags.phase === 'taps'; }, 140))) return 'never reached the taps';
          if (!(await waitFor(function () { return phone.choosing(); }, 6))) return 'no choice at the taps';
          D.choose(3); // open it
          await tick();
          D.advance(4);
          if (!props.intruder.visible()) return 'nobody in the closet';
          await new Promise(function (res) { setTimeout(res, 5200); });
          if (current.id !== 'epilogue' || current.act.variant !== 'bad') return 'no closet ending (' + current.id + ')';
          return true;
        });
        function act4Out(a) {
          // lock up, shower on, wait for him to go, unlock
          D.use('bathDoor');
          D.use('shower');
        }
        await flow('act4Caught', async function () {
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          act4Out(a);
          if (!(await waitFor(function () { return a.flags.unlockReady; }, 60))) return 'he never left the bathroom door';
          ctl.teleport(4.2, 21.5, -Math.PI / 2, 0);
          D.use('bathDoor');
          if (a.flags.phase !== 'sneak') return 'could not unlock the door (' + a.flags.phase + ')';
          // stand in the office doorway with the light on, facing him
          var sp = a.search.pos();
          ctl.light.on = true;
          ctl.teleport(7.4, 11.5, 0, 0);
          if (!(await waitFor(function () { return a.flags.phase === 'fail'; }, 60))) return 'he never found Mason in plain sight (' + a.search.job() + ' at ' + sp.x.toFixed(1) + ',' + sp.z.toFixed(1) + ')';
          return true;
        });
        await flow('act4HideTwice', async function () {
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          act4Out(a);
          if (!(await waitFor(function () { return a.flags.unlockReady; }, 60))) return 'he never left';
          ctl.teleport(4.2, 21.5, -Math.PI / 2, 0);
          D.use('bathDoor');
          var couch = OC.acts.act4.HIDES.filter(function (h) { return h.id === 'couch'; })[0];
          a.search.send('master');
          a.hide(couch);
          D.advance(4);
          a.unhide();
          D.advance(1);
          a.hide(couch);
          D.advance(0.2); // the search notices on its next frame
          if (a.search.job() !== 'checkHide') return 'he did not come to check the second time (' + a.search.job() + ')';
          if (!(await waitFor(function () { return a.flags.phase === 'fail'; }, 120))) return 'he came but never found him';
          return true;
        });
        await flow('act4Car', async function () {
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          a.flags.phase = 'run'; // straight to outside: the house part is checked above
          ctl.teleport(11.5, -9.6, 0, 0);
          if (!D.use('car')) return 'could not get in the car';
          if (!D.use('ignition')) return 'no ignition';
          if (!(await waitFor(function () { return a.flags.phase === 'exposed'; }, 12))) return 'he never came out of the house';
          if (!D.use('down')) return 'could not get down';
          if (!(await waitFor(function () { return a.flags.atWindow; }, 40))) return 'he never came to the window';
          if (!(await waitFor(function () { return a.flags.phase === 'won'; }, 50))) return 'never saved (' + a.flags.phase + ')';
          return true;
        });


        // ---- the epilogue: the evidence tiers, played through on dt ----------------------------------------
        function playEpilogue(list) {
          g.habits.reset();
          list.forEach(function (l) { g.habits.log(l[0], l[1] || {}, { clock: l[2] || '', t: 0 }); });
          g.startEpilogue('main');
          var ep = current.act;
          var seen = {};
          for (var s = 0; s < 400 && ep.stage() !== 'done'; s += 0.5) {
            D.advance(0.5);
            seen[ep.stage()] = true;
            if (ep.noteVisible()) seen.note = true;
          }
          return { ep: ep, seen: seen, shown: ep.shown().join('\n') };
        }
        await flow('epilogueStrong', async function () {
          var p = playEpilogue([
            ['photoWes', {}, '11:40 PM'], ['dinner', { kind: 'lasagna' }, '7:42 PM'], ['dayTwo'], ['coffee', {}, '10:15 AM'],
            ['calledDeputy'], ['nightTwo'], ['crawl', { kind: 'tally' }], ['photoNest'], ['readNotebook'], ['photoEye'],
            ['survived', { ray: true }],
          ]);
          if (p.ep.stage() !== 'done') return 'never finished (' + p.ep.stage() + ')';
          if (p.ep.tier !== 'strong') return 'tier ' + p.ep.tier;
          var missing = ['porch', 'found', 'notebook', 'news', 'verdict', 'house', 'fridge', 'note', 'hum'].filter(function (k) { return !p.seen[k]; });
          if (missing.length) return 'skipped ' + missing.join(', ');
          var want = ['ep.porch.ray', 'ep.card.photoNest', 'ep.found.counted', 'ep.book.last', 'ep.strong.2', 'ep.plan', 'ep.deputy', 'ep.fridge'];
          var notShown = want.filter(function (id) { return p.shown.indexOf(content.t(id)) < 0; });
          if (notShown.length) return 'never showed ' + notShown.join(', ');
          if (p.shown.indexOf('7:42 ate the lasagna. good.') < 0) return 'the notebook did not read his real habits';
          if (!achievements.has('endStrong') || !achievements.has('endRay')) return 'no ending achievements';
          return true;
        });
        await flow('epilogueLittle', async function () {
          var p = playEpilogue([]);
          if (p.ep.stage() !== 'done') return 'never finished (' + p.ep.stage() + ')';
          if (p.ep.tier !== 'little') return 'tier ' + p.ep.tier;
          if (p.seen.notebook) return 'read out a notebook nobody found';
          if (p.shown.indexOf(content.t('ep.found.little.1')) < 0 || p.shown.indexOf(content.t('ep.little.1')) < 0) return 'not the little ending';
          if (p.shown.indexOf(content.t('ep.card.none')) < 0) return 'no empty-phone card';
          if (!achievements.has('endLittle')) return 'no achievement';
          return true;
        });
        await flow('epilogueLeaves', async function () {
          playEpilogue([['photoWes'], ['photoEye']]);
          startAct('act1');
          ctl.setLocked(true);
          if (document.body.classList.contains('in-epilogue')) return 'still marked as the epilogue';
          if (document.getElementById('evidence').classList.contains('on')) return 'the evidence cards stayed up';
          if (g.cache.policeCar && g.cache.policeCar.visible) return 'the cruiser stayed in the drive';
          if (g.cache.fridgeNote && g.cache.fridgeNote.visible) return 'the note stayed on the fridge';
          if (Math.abs(r.camera.fov - g.baseFov) > 0.5) return 'the camera stayed zoomed in';
          return true;
        });
        // Esc during an ending pauses it like any night; Restart plays the same ending again; Quit leaves nothing behind
        await flow('epiloguePause', async function () {
          g.habits.reset();
          [['photoWes'], ['photoEye']].forEach(function (l) { g.habits.log(l[0], {}, { clock: '', t: 0 }); });
          g.startEpilogue('main');
          ctl.setLocked(true);
          var ep = current.act;
          for (var s = 0; s < 300 && ep.stage() !== 'news'; s += 0.5) D.advance(0.5);
          if (ep.stage() !== 'news') return 'never reached the news (' + ep.stage() + ')';
          var before = ep.shown().length;
          ctl.setLocked(false); // Esc: the pause menu
          D.advance(30);
          if (ep.stage() !== 'news' || ep.shown().length !== before) return 'the ending kept playing while paused (' + ep.stage() + ')';
          ctl.setLocked(true);
          D.advance(30);
          if (ep.stage() === 'news') return 'the ending did not carry on after resume';
          ctl.setLocked(false);
          document.querySelector('#pause button[data-act="restart"]').click();
          if (current.id !== 'epilogue' || current.act === ep) return 'Restart did not play the ending again (' + current.id + ')';
          ep = current.act;
          ctl.setLocked(true);
          for (var u = 0; u < 300 && ep.stage() !== 'hum'; u += 0.5) D.advance(0.5);
          if (ep.stage() !== 'hum') return 'the replay never reached the hum (' + ep.stage() + ')';
          ctl.setLocked(false);
          document.querySelector('#pause button[data-act="quit"]').click();
          D.advance(20); // time at the title: nothing of the ending may carry on behind it
          if (current.act === ep && ep.stage() === 'done') return 'the ending kept going behind the title';
          if (document.body.classList.contains('in-epilogue')) return 'still marked as the epilogue at the title';
          if (document.getElementById('epilogue').classList.contains('on')) return 'the ending screen covers the title';
          if (document.getElementById('evidence').classList.contains('on')) return 'the evidence cards stayed up';
          if (Math.abs(r.camera.fov - g.baseFov) > 0.5) return 'the camera stayed zoomed in';
          return true;
        });

        await flow('titleLight', async function () {
          try {
            localStorage.setItem('oakridge.finished', '1');
          } catch (e) {
            return true; // no storage: no light to check
          }
          showTitle();
          titleView.render(0.016);
          if (!titleView.lit()) return 'no light in the guest room window';
          document.getElementById('mAchievements').click();
          var rows = document.querySelectorAll('#achList .ach').length;
          if (rows !== OC.achievements.LIST.length) return 'achievements screen shows ' + rows + ' rows';
          menu.hide();
          titleView.leave();
          if (titleView.lit()) return 'the light stayed on after the title';
          return true;
        });

        startAct('act1');
        STORE_KEYS.forEach(function (k) {
          try {
            if (storeWas[k] === null) localStorage.removeItem(k);
            else localStorage.setItem(k, storeWas[k]);
          } catch (e) {
            /* no storage */
          }
        });
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
