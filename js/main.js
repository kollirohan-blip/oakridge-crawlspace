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
    if (OC.checkpoint) required = required.concat(OC.checkpoint.TEXT); // the second-fail hints (Phase 8)
    if (OC.stuck) required = required.concat(OC.stuck.TEXT); // "I'm stuck" and the stall nudge (Phase 8)
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
    // ---- checkpoints inside an act, and failing fairly (Phase 8) -----------------------------------------
    // An act saves at its beats with g.checkpoint(beat, data); the habit log (the evidence, whether Ray
    // was called, everything the nights read) is kept with it. A fail goes back to the act's last one and
    // puts the log back as it was there. js/engine/checkpoint.js counts the fails and the scares seen.
    var retry = OC.checkpoint.createRetry();
    g.retry = retry;
    g.checkpoint = function (beat, data) {
      if (!current.id) return;
      retry.save(current.id, beat, Object.assign({}, data, { habits: g.habits.entries(), texts: phone.saveTexts() }));
      phone.saved(); // a small mark on the phone
    };
    function restoreHabits(entries) {
      g.habits.reset();
      entries.forEach(function (e) { logHabit(e.action, e.detail, { clock: e.at, t: e.t }); }); // no achievement toasts again
    }
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
    // "I'm stuck" on the pause menu, and the stall nudge (Phase 8, js/stuck.js)
    var help = OC.stuckHelp.create({ g: g, ctl: ctl, hud: OC.hud, phone: phone, house: OC.house, current: function () { return current; } });

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

    // opts (Phase 8): { retry: true, resume: { beat, data, hint } } when a fail sends the act back to a checkpoint
    // the texts on the phone when this chapter began (each chapter carries on from the one before it)
    var startTexts = null;
    function startAct(id, opts) {
      opts = opts || {};
      var def = OC.acts[id];
      clearActTimers();
      OC.hud.clearFail(); // a fail card left up (quit to title from it, then New game) is not this act's
      help.enter(id);
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
      if (!opts.retry) {
        // a fresh start of the act (the one before it, chapter select, Restart): its checkpoints and fails go
        startTexts = phone.saveTexts(); // what Restart puts back
        retry.enter(id);
        retry.save(id, 'start', { habits: g.habits.entries(), texts: startTexts });
      } else if (opts.resume && opts.resume.data && opts.resume.data.t) {
        for (var k = Math.round(opts.resume.data.t * 10); k > 0; k--) g.clock.tick(0.1); // the clock as it was
      }
      current.act = def.create(g, opts.resume || null);
      if (opts.retry && opts.resume && current.act.resumes) OC.hud.setFadeText(''); // it opens on its own beat in the dark
      else OC.hud.fadeIn();
      saveCheckpoint(id);
    }
    // a fail: back to the act's last checkpoint, the habit log as it was there, and the hint if this was
    // the second fail in the same spot
    function retryAct(id) {
      var cp = retry.checkpoint(id);
      if (cp && cp.data.habits) restoreHabits(cp.data.habits);
      if (cp && cp.data.texts) phone.loadTexts(cp.data.texts); // no text arrives twice
      var lf = retry.lastFail(id);
      startAct(id, { retry: true, resume: cp ? { beat: cp.beat, data: cp.data, hint: lf ? lf.hint : null } : null });
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
      OC.hud.clearFail();
      help.enter('epilogue');
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
      if (outcome === 'retry') return retryAct(id);
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
      if (r.setBrightness) r.setBrightness(s.brightness);
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
    // the first-run brightness check (Phase 8): remembered, so it is shown once
    var BRIGHT_KEY = 'oakridge.brightChecked';
    var brightDoneHere = false; // blocked storage still only shows it once per visit
    function brightChecked() {
      if (brightDoneHere) return true;
      try {
        return localStorage.getItem(BRIGHT_KEY) === '1';
      } catch (e) {
        return false;
      }
    }
    function markBrightChecked() {
      brightDoneHere = true;
      try {
        localStorage.setItem(BRIGHT_KEY, '1');
      } catch (e) {
        /* private window: once per visit */
      }
    }
    // night one's house held still behind the check: every light off, the phone light off, Mason at the
    // south end of the hall and Cooper sitting down it, looking back at him (far enough to be dark, near
    // enough to be a dog and not a few pixels)
    function showBrightCheck() {
      startAct('act1');
      var off = {};
      Object.keys(world.lightById).forEach(function (id) { off[id] = 0; });
      props.setLights(off);
      ctl.light.on = false;
      ctl.teleport(6, 8.6, Math.PI, 0);
      cooper.stay();
      cooper.setPos(6, 15.2);
      cooper.heading = Math.PI / 2;
      cooper.pose('sit');
      menu.showBright();
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
          phone.loadTexts(null); // a new run: none of the last one's texts
          if (!brightChecked()) return showBrightCheck(); // the first time: Cooper at the end of the dark hall
          startAct('act1');
        } else if (action === 'brightDone' || action === 'brightSkip') {
          markBrightChecked();
          startAct('act1'); // night one from its real start, not from the hall
        } else if (action === 'stuck') {
          var why = help.refusal();
          if (why) return menu.pauseNote(content.t('stuck.no.' + why));
          if (!help.move()) return menu.pauseNote(content.t('stuck.no.away'));
          OC.hud.cut(); // a blink, not a fade: he is just somewhere else
          g.after(function () { OC.hud.fadeIn(); }, 350);
        } else if (action === 'chapter') {
          phone.loadTexts(null); // starting here, not from the chapters before it
          startAct(arg);
        } else if (action === 'restart') {
          if (current.id === 'epilogue') startEpilogue(current.variant);
          else {
            phone.loadTexts(startTexts); // the texts this chapter began with, not the last try's
            startAct(current.id);
          }
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
    // the browser would not capture the mouse (too soon after Esc, or one that never does): night one has
    // started behind the brightness check, so put up the pause menu, whose Resume asks again
    document.addEventListener('pointerlockerror', function () {
      if (!ctl.locked && menu.current() === 'bright') menu.showPause();
    });


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
      if (ctl.locked) help.update(dt); // the stall nudge counts only time spent playing
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
      retry: function () { return retry; }, // checkpoints and fail counts (Phase 8)
      stuck: function () { return help; }, // "I'm stuck" and the stall nudge (Phase 8)
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
      // opts.only: run just these named flows (the item and door checks always run)
      sweep: async function (opts) {
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
          if (opts && opts.only && opts.only.indexOf(name) < 0) return;
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
        await flow('couchBeforeTv', async function () {
          // the playtest: standing between the TV and the couch with the TV off, there was no prompt at all
          var a = freshNight();
          var tv = a.mods.tv.tv;
          if (tv.on) return 'the TV starts on';
          ctl.teleport(19.25, 2.9, 0, 0);
          D.aim(19.25, 0.55, 4.0);
          D.advance(0.2);
          if (!interact.target || interact.target.id !== 'couch') return 'no couch prompt with the TV off (target: ' + (interact.target ? interact.target.id : 'none') + ')';
          D.use('couch');
          D.advance(0.3);
          if (!tv.on) return 'sitting down did not turn the TV on';
          if (!ctl.frozen) return 'not sitting';
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
        await flow('photoEnlarge', async function () {
          // the playtest: Photos would not enlarge the hallway picture, so there was no staring at the figure
          freshNight();
          ctl.teleport(6.1, 6.6, Math.PI, 0);
          D.advance(0.2);
          D.phoneApp('camera');
          D.shoot();
          D.phoneApp(null);
          D.advance(0.1);
          function glide(dx, dy) {
            var n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 12));
            var sx = 0;
            var sy = 0;
            for (var i = 1; i <= n; i++) {
              var tx = Math.round((dx * i) / n);
              var ty = Math.round((dy * i) / n);
              document.dispatchEvent(new MouseEvent('mousemove', { movementX: tx - sx, movementY: ty - sy }));
              sx = tx;
              sy = ty;
            }
            D.advance(0.05);
          }
          function clickOn(node) {
            var b = node.getBoundingClientRect();
            var c = phone.cursor();
            glide(b.left + b.width / 2 - c.x, b.top + b.height / 2 - c.y);
            document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
            document.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
            D.advance(0.05);
          }
          key('Tab');
          key('Tab', true);
          phone.app('photos');
          D.advance(0.05);
          try {
            var fig = document.querySelector('#photoGrid [data-hit="photo"]');
            if (!fig) return 'no photo to click in Photos';
            var small = fig.getBoundingClientRect().width;
            clickOn(fig);
            var big = document.querySelector('#photoGrid .photo-view img');
            if (!big) return 'clicking the photo did not enlarge it';
            if (big.getBoundingClientRect().width < small * 1.6) return 'the photo is barely bigger (' + Math.round(big.getBoundingClientRect().width) + ' px vs ' + Math.round(small) + ')';
            key('Backspace');
            key('Backspace', true);
            D.advance(0.05);
            if (!document.querySelector('#photoGrid [data-hit="photo"]')) return 'Backspace did not go back to the photos';
            clickOn(document.querySelector('#photoGrid [data-hit="photo"]'));
            clickOn(document.querySelector('#photoGrid .photo-view [data-hit="back"]'));
            if (!document.querySelector('#photoGrid [data-hit="photo"]')) return 'the back arrow did not go back to the photos';
            return true;
          } finally {
            if (phone.isOpen) {
              key('Tab');
              key('Tab', true);
            }
          }
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
        // brushing your teeth: somebody crosses the hall behind you in the mirror only, and it is not Cooper
        async function brushWatch(lookAway) {
          var a = freshNight();
          var ch = a.mods.chores;
          var lines = [];
          var say = OC.hud.say;
          OC.hud.say = function (s) { lines.push(s); return say.apply(OC.hud, arguments); };
          try {
            ctl.teleport(3.95, 21.6, Math.PI, 0);
            D.aim(3.95, 0.95, 23.45);
            if (!D.use('vanity')) return { err: 'could not brush' };
            if (lookAway) D.aim(3.95, 1.6, 15);
            var inRoom = 0;
            for (var i = 0; i < 200 && !ch.state.brushed; i++) {
              D.advance(0.05);
              if (lookAway) D.aim(3.95, 1.6, 15);
              if (props.intruder.visible()) inRoom++;
            }
            D.advance(0.5);
            return { ch: ch, lines: lines, inRoom: inRoom };
          } finally {
            OC.hud.say = say;
          }
        }
        await flow('mirrorPass', async function () {
          var r = await brushWatch(false);
          if (r.err) return r.err;
          if (!r.ch.state.brushed) return 'brushing never finished';
          if (!(r.ch.state.passFrames > 5)) return 'nobody went past in the mirror (' + r.ch.state.passFrames + ' frames)';
          if (r.inRoom) return 'he was visible in the room itself';
          if (r.lines.indexOf(g.t('n1.chore.brush1')) < 0) return 'no line about it';
          if (r.lines.some(function (l) { return /It was Cooper/.test(l); })) return 'still blamed on Cooper';
          return true;
        });
        await flow('mirrorPassMissed', async function () {
          var r = await brushWatch(true);
          if (r.err) return r.err;
          if (!r.ch.state.brushed) return 'brushing never finished';
          if (r.ch.state.passFrames) return 'he went past while nobody was looking at the mirror';
          if (r.lines.indexOf(g.t('n1.chore.brush1')) >= 0) return 'a line about something nobody saw';
          return true;
        });
        await flow('padlockRocks', async function () {
          // the playtest: "the padlock is swinging", but on screen it was a tiny dark square that never moved
          var a = freshNight();
          a.dread.state.hatchCheck = true;
          var lock = props.hatch.lock;
          if (!lock) return 'no padlock to check';
          var size = new THREE.Box3().setFromObject(lock).getSize(new THREE.Vector3());
          if (Math.max(size.x, size.z) < 0.085) return 'the padlock is too small to see (' + Math.max(size.x, size.z).toFixed(3) + ' m)';
          var ticks = 0;
          var play = OC.audio.play;
          OC.audio.play = function (name) { if (name === 'click') ticks++; return play.apply(OC.audio, arguments); };
          var peak = 0;
          try {
            if (!D.use('hatch')) return 'could not check the hatch';
            for (var i = 0; i < 60; i++) {
              D.advance(0.05);
              peak = Math.max(peak, Math.abs(lock.rotation.z));
            }
          } finally {
            OC.audio.play = play;
          }
          if (peak < 0.3) return 'it hardly moves (' + peak.toFixed(2) + ' rad)';
          if (ticks < 3) return 'it rocks without a sound (' + ticks + ' ticks)';
          D.advance(4);
          if (Math.abs(lock.rotation.z) > 0.01) return 'it never settles';
          return true;
        });
        await flow('dishesGlance', async function () {
          // the playtest: the dishes were a long look at a dark wall. Now the creak behind turns him to the hatch.
          var a = freshNight();
          var ch = a.mods.chores;
          a.mods.dinner.dinner = function () { return { state: 'eaten' }; };
          ctl.teleport(1.55, 9.4, 0, 0);
          D.aim(1.55, 0.95, 8.4);
          if (!D.use('laundrySink')) return 'could not start the dishes';
          var sawHatch = false;
          for (var i = 0; i < 200 && !ch.state.washed; i++) {
            D.advance(0.05);
            if (OC.sightline.inView({ x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw }, { x: 2.5, z: 10.5 }, 0.35) && ctl.pitch < -0.4) sawHatch = true;
          }
          if (!ch.state.washed) return 'the dishes never finished';
          if (!sawHatch) return 'nothing to watch: the view never turned to the hatch';
          if (!OC.sightline.inView({ x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw }, { x: 1.55, z: 8.4 }, 0.5)) return 'left looking over his shoulder';
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

        // ---- P5 and P6: what gets noticed (js/talkback.js, js/engine/noticed.js) ----------------------
        var subEl = document.getElementById('subtitle');
        // run the game for a while and keep every subtitle that showed, in order
        async function listen(secs, until) {
          var heard = [];
          for (var s = 0; s < secs; s += 0.25) {
            D.advance(0.25);
            await tick();
            var now = subEl.classList.contains('on') ? subEl.textContent : '';
            if (now && heard[heard.length - 1] !== now) heard.push(now);
            if (until && heard.indexOf(g.t(until)) >= 0) break;
          }
          return heard;
        }
        function wait(ms) {
          return new Promise(function (res) { setTimeout(res, ms); });
        }
        // night one's log, as if it had been played, then night two reads it (no forced gates)
        function night2From(list) {
          g.habits.reset();
          list.forEach(function (e) { g.habits.log(e[0], e[1] || {}, { clock: e[2] || '', t: e[3] || 0 }); });
          g.habits.startChapter('dayTwo');
          return night2(null);
        }
        await flow('learnBreaker', async function () {
          var a = night2From([['dinner', { kind: 'mac' }, '8:02 PM', 60], ['bed', { lights: 4 }, '1:55 AM', 900]]);
          if (!a.plan.why || a.plan.why.breaker !== 'lightsOn') return 'the plan did not learn the lights (' + JSON.stringify(a.plan.why) + ')';
          if (!getIn(a)) return 'did not get in';
          a.ctx.lights.set('kitchen', true);
          if (!lockUp(a)) return 'could not lock up';
          ctl.teleport(9, 6, 0, 0);
          var dread = a.mods.dread.state;
          if (!(await waitFor(function () { return dread.breaker === 'tripped'; }, 120))) return 'the breaker never tripped';
          // 1. the gate fires, 2. Mason says he knew, before the breaker panel line
          var heard = await listen(14);
          var iKnew = heard.indexOf(g.t('p8.knew.breaker'));
          if (iKnew < 0) return 'Mason never said it (heard: ' + heard.join(' / ') + ')';
          if (heard.indexOf(g.t('n2.gate.breaker')) > iKnew) return 'he said it before the power went';
          if (heard.indexOf(g.t('n2.gate.breaker2')) < iKnew) return 'the panel line talked over it';
          var log = g.habits.entries();
          var trip = log.filter(function (e) { return e.action === 'breakerTripped'; })[0];
          var knew = log.filter(function (e) { return e.action === 'knew' && e.detail.kind === 'breaker'; })[0];
          if (!trip || !knew || knew.t < trip.t) return 'the gate and the line are not in the log in order';
          if (!D.use('breaker')) return 'the breaker could not be reset';
          // 3. the notebook under the house lists the same habit
          D.advance(4);
          D.goto('hatch', 0);
          D.use('hatch');
          await tick();
          D.choose(2); // go down
          await tick();
          if (!(await waitFor(function () { return a.flags.inCrawl; }, 5))) return 'never got under the house';
          D.advance(1);
          D.use('crawl.notebook');
          await wait(300);
          var found = false;
          for (var pg = 0; pg < 8 && !found; pg++) {
            var head = document.getElementById('readerTitle').textContent;
            var body = document.getElementById('readerBody').textContent;
            if (head.indexOf('WHAT HE DOES') === 0 && body.indexOf(OC.noticed.GATES.breaker.note) >= 0) found = true;
            else {
              document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
              await wait(250);
            }
          }
          if (!found) return 'the notebook does not list it';
          document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
          await tick();
          // 4. and having read it: he wrote it down first
          var after = await listen(14, 'p8.knew.book');
          if (after.indexOf(g.t('p8.knew.book')) < 0) return 'no line after reading it (heard: ' + after.join(' / ') + ')';
          D.choose(3); // leave the notebook
          await tick();
          report.learnBreaker = heard.concat(after);
          return true;
        });
        await flow('learnTvLight', async function () {
          var a = night2From([['bed', { lights: 1 }, '1:50 AM', 900], ['phoneLight', { sec: 260 }], ['windowLook'], ['windowLook'], ['windowLook']]);
          if (a.plan.gates.breaker || !a.plan.gates.lightFalters || !a.plan.gates.tvReflection) return 'wrong gates ' + JSON.stringify(a.plan.gates);
          if (!getIn(a) || !lockUp(a)) return 'could not get in and lock up';
          ctl.teleport(19.3, 4.9, 0, -0.1); // behind the couch, facing the dark TV
          var dread = a.mods.dread.state;
          if (!(await waitFor(function () { return dread.tv === 'showing'; }, 90))) return 'the TV never showed it (' + dread.tv + ')';
          var tvHeard = await listen(20, 'p8.knew.tv');
          var iTv = tvHeard.indexOf(g.t('p8.knew.tv'));
          if (iTv < 0) return 'no TV line (heard: ' + tvHeard.join(' / ') + ')';
          if (tvHeard.indexOf(g.t('n2.gate.tv2')) > iTv) return 'the TV line came before the reflection was gone';
          ctl.teleport(6, 18, Math.PI, 0); // the dark end of the hall, light on
          if (!(await waitFor(function () { ctl.light.on = true; return dread.faltered; }, 120))) return 'the light never faltered';
          var lightHeard = await listen(12, 'p8.knew.light');
          if (lightHeard.indexOf(g.t('p8.knew.light')) < 0) return 'no light line (heard: ' + lightHeard.join(' / ') + ')';
          var said = g.habits.entries().filter(function (e) { return e.action === 'knew'; }).map(function (e) { return e.detail.kind; });
          if (said.join() !== 'tvReflection,lightFalters') return 'said ' + said.join();
          var notes = a.mods.under.notebookPages().filter(function (p) { return p.title === 'WHAT HE DOES'; })[0];
          if (!notes || notes.body !== [OC.noticed.GATES.lightFalters.note, OC.noticed.GATES.tvReflection.note].join('\n')) return 'the notebook page reads ' + (notes && notes.body);
          return true;
        });
        await flow('quirks', async function () {
          var a = freshNight();
          var tb = a.mods.talkback;
          var heard = await listen(13); // the opening voice-over first
          async function react(id, secs) {
            var h = await listen(secs || 10, id);
            heard = heard.concat(h);
            return h.indexOf(g.t(id)) >= 0;
          }
          var i;
          // flushing five times
          for (i = 0; i < 4; i++) {
            if (!D.use('toilet')) return 'could not flush (' + i + ')';
            D.advance(2.7);
          }
          if (tb.state.queued.flush || tb.state.said.flush) return 'four flushes were already a joke';
          D.use('toilet');
          if (!(await react('p8.quirk.flush'))) return 'nothing after five flushes';
          for (i = 0; i < 3; i++) {
            D.advance(2.7); // the line can come before the last flush is done, and the toilet waits for it
            if (!D.use('toilet')) return 'could not flush again (' + (6 + i) + ')';
          }
          // the fridge, over and over (before dinner it asks what to make: close it)
          for (i = 0; i < 6; i++) {
            D.use('fridge');
            await tick();
            D.choose(6);
            await tick();
            D.advance(1);
          }
          if (!(await react('p8.quirk.fridge'))) return 'nothing after six fridges';
          // the padlocked hatch, again and again
          for (i = 0; i < 4; i++) {
            D.use('hatch');
            D.advance(1.5);
          }
          if (!(await react('p8.quirk.hatch', 14))) return 'nothing after four tries at the hatch';
          // petting Cooper for a full minute
          for (i = 0; i < 15; i++) {
            if (!D.use('cooper')) {
              D.advance(1);
              continue;
            }
            await tick();
            D.choose(1);
            await tick();
            D.advance(4.5);
          }
          if (!(await react('p8.quirk.pet', 40))) return 'nothing after a minute of petting (' + OC.noticed.progress(g.habits.entries(), OC.noticed.quirk('pet')) + ' s)';
          // walking into the treeline
          ctl.teleport(-12, -18, 0, 0);
          if (!(await react('p8.quirk.treeline'))) return 'nothing in the trees';
          ctl.teleport(2.5, -3, Math.PI, 0);
          D.advance(3);
          // each one once, however many more times he does it
          var once = {};
          g.habits.entries().forEach(function (e) {
            if (e.action === 'quirk') once[e.detail.kind] = (once[e.detail.kind] || 0) + 1;
          });
          if (Object.keys(once).sort().join() !== 'flush,fridge,hatch,pet,treeline') return 'said ' + JSON.stringify(once);
          if (Object.keys(once).some(function (k) { return once[k] !== 1; })) return 'a joke repeated: ' + JSON.stringify(once);
          // and Wes counted them
          g.habits.startChapter('dayTwo');
          var notes = OC.noticed.noteLines(g.habits.entries());
          var want = ['flushed 8 times. the pipes go right past my head', 'opened the fridge 6 times. hungry boy', 'tried my door 4 times. i heard every one'];
          for (var w = 0; w < want.length; w++) if (notes.indexOf(want[w]) < 0) return 'notebook is missing "' + want[w] + '" (has ' + notes.join(' | ') + ')';
          report.quirks = heard.filter(function (h) { return /./.test(h); });
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

        // ---- Phase 8: checkpoints and fair fails, played through ------------------------------------
        function dark() {
          return document.getElementById('fade').classList.contains('on');
        }
        function hinted(id) {
          var s = document.getElementById('subtitle');
          return s.classList.contains('on') && s.textContent === content.t(id);
        }
        // the fail screen comes up (in real time), then a click on it, the way a player retries
        async function failCardArmed() {
          var t0 = Date.now();
          while (!document.querySelector('#fadeText .fail-retry') && Date.now() - t0 < 5000) await new Promise(function (res) { setTimeout(res, 50); });
          if (!document.querySelector('#fadeText .fail-retry')) return false;
          await new Promise(function (res) { setTimeout(res, 1300); }); // it takes clicks after 1.2 s
          return true;
        }
        async function retryByClick() {
          if (!(await failCardArmed())) return false;
          document.dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
          return true;
        }
        await flow('act4CarRetry', async function () {
          // a fail at the car comes back to the car, not to the bathroom; the face at the glass and the
          // smashed window are not shown twice; the second fail there earns Mason's hint
          g.habits.reset(); // the flows before this one leave a face at the glass in the log
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          a.flags.phase = 'run'; // straight to outside: the house part is checked above
          ctl.teleport(11.5, -9.6, 0, 0);
          if (!D.use('car')) return 'could not get in the car';
          D.advance(0.1);
          var cp = retry.checkpoint('act4');
          if (!cp || cp.beat !== 'car') return 'no checkpoint in the car (' + (cp && cp.beat) + ')';
          if (!document.body.classList.contains('just-saved')) return 'no saved mark on the phone';
          var logAtCar = g.habits.entries().length;
          async function toTheGlass(b) {
            if (!D.use('ignition')) return 'no ignition';
            if (!(await waitFor(function () { return b.flags.phase === 'exposed'; }, 12))) return 'he never came out of the house';
            if (!D.use('down')) return 'could not get down';
            if (!(await waitFor(function () { return b.flags.atWindow; }, 40))) return 'he never came to the window';
            D.advance(3.2); // the lightning on his face
            if (!g.habits.has('faceAtGlass')) return 'no face at the glass';
            b.noise.poke(1); // and Mason makes a sound
            D.advance(0.1);
            return b.flags.phase === 'fail' ? true : 'a sound in the car did not fail (' + b.flags.phase + ')';
          }
          var r1 = await toTheGlass(a);
          if (r1 !== true) return 'first try: ' + r1;
          if (!a.flags.faceScare) return 'the face at the glass was not a scare the first time';
          if (!a.flags.scared || dark()) return 'the first fail had no smashed window';
          if (!(await retryByClick())) return 'no fail screen to click';
          var b = current.act;
          if (b === a) return 'the retry did not start';
          if (b.flags.phase !== 'car') return 'came back at ' + b.flags.phase + ', not the car';
          if (Math.hypot(ctl.pos.x - 10.4, ctl.pos.z + 9.95) > 0.3) return 'not in the driver seat';
          if (!props.frontDoor.isOpen || b.flags.chainTries !== 2) return 'the chain and the front door came back';
          if (g.habits.entries().length !== logAtCar || g.habits.has('faceAtGlass')) return 'the habit log was not put back to the car';
          if (!dark()) return 'no beat in the dark: the retry opened at once';
          D.advance(1);
          if (!g.state.cutscene || !dark()) return 'the beat in the dark was cut short';
          D.advance(1.2);
          if (dark() || g.state.cutscene) return 'still dark after the beat';
          if (hinted('retry.hint.act4.noise')) return 'a hint after only one fail';
          var r2 = await toTheGlass(b);
          if (r2 !== true) return 'second try: ' + r2;
          if (b.flags.faceScare) return 'the face at the glass jumped out a second time';
          if (b.flags.scared) return 'the smashed window played a second time';
          if (!dark()) return 'the second fail did not cut to black';
          if (!(await retryByClick())) return 'no second fail screen';
          var c = current.act;
          D.advance(2.2);
          if (c.flags.phase !== 'car') return 'the second retry came back at ' + c.flags.phase;
          if (!hinted('retry.hint.act4.noise')) return 'no hint after the second fail (' + document.getElementById('subtitle').textContent + ')';
          return true;
        });
        await flow('act3BluffRetry', async function () {
          // a failed bluff comes back after the photo, not to Dave's call; the second failed bluff cuts to
          // black on his hum with no closet burst; then Mason thinks back, and the calm bluff still works
          startAct('act3');
          ctl.setLocked(true);
          var a = current.act;
          if (!(await answerUntil(1, function () { return a.flags.phase === 'taps'; }, 140))) return 'never reached the taps';
          if (!(await waitFor(function () { return phone.choosing(); }, 6))) return 'no choice at the taps';
          D.choose(2); // call Cooper over
          await tick();
          if (!(await waitFor(function () { return a.flags.phase === 'photo'; }, 20))) return 'never asked for the photo';
          aimAt(props.closet.eyeAt);
          D.phoneApp('camera');
          var p = D.shoot();
          D.phoneApp(null);
          if (!p || p.subject !== 'eye') return 'the photo did not show him';
          D.advance(0.1);
          var cp = retry.checkpoint('act3');
          if (!cp || cp.beat !== 'photo') return 'no checkpoint after the photo (' + (cp && cp.beat) + ')';
          var logAtPhoto = g.habits.entries().length;
          async function bluff(b, pick) {
            if (!(await waitFor(function () { return b.flags.phase === 'choice' && phone.choosing(); }, 40))) return 'Ethan never got the bluff choice (' + b.flags.phase + ')';
            D.choose(pick);
            await tick();
            D.advance(0.1);
            return b.flags.phase === 'fail' ? true : 'the bluff did not fail (' + b.flags.phase + ')';
          }
          var r1 = await bluff(a, 2); // "Who's there? Get out of here!"
          if (r1 !== true) return 'first bluff: ' + r1;
          if (!a.flags.scared || dark()) return 'no closet burst the first time';
          if (!(await retryByClick())) return 'no fail screen to click';
          var b = current.act;
          if (b === a || b.flags.phase !== 'photoSeen') return 'came back at ' + b.flags.phase + ', not after the photo';
          if (g.habits.entries().length !== logAtPhoto || !g.habits.has('photoEye')) return 'the habit log was not put back to the photo';
          if (Math.hypot(cooper.pos.x - 3.0, cooper.pos.z - 15.9) > 0.3) return 'Cooper is not where calling him over left him';
          if (!dark()) return 'no beat in the dark';
          D.advance(2.2);
          if (dark()) return 'still dark after the beat';
          var r2 = await bluff(b, 2);
          if (r2 !== true) return 'second bluff: ' + r2;
          if (b.flags.scared) return 'the closet burst played a second time';
          if (!dark()) return 'the second fail did not cut to black';
          if (!(await retryByClick())) return 'no second fail screen';
          var c = current.act;
          D.advance(2.2);
          if (!hinted('retry.hint.act3.confront')) return 'no hint after the second failed bluff (' + document.getElementById('subtitle').textContent + ')';
          if (!(await waitFor(function () { return c.flags.phase === 'choice' && phone.choosing(); }, 40))) return 'no third bluff choice';
          D.choose(3);
          await tick();
          if (!(await waitFor(function () { return c.flags.phase === 'walk'; }, 40))) return 'the calm bluff did not get him up';
          return true;
        });
        await flow('act4DoorRetry', async function () {
          // out of the bathroom, a hide behind the couch, the front door: a fail outside comes back to the
          // door with the chain on again, and he still remembers the couch
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          act4Out(a);
          if (!(await waitFor(function () { return a.flags.unlockReady; }, 60))) return 'he never left';
          D.advance(0.1);
          if ((retry.checkpoint('act4') || {}).beat !== 'search') return 'no checkpoint out of the bathroom';
          ctl.teleport(4.2, 21.5, -Math.PI / 2, 0);
          D.use('bathDoor');
          var couch = OC.acts.act4.HIDES.filter(function (h) { return h.id === 'couch'; })[0];
          a.search.send('master');
          a.hide(couch);
          D.advance(2);
          a.unhide();
          ctl.teleport(2.5, 1.2, 0, 0); // the foyer, at the chain
          D.advance(0.2);
          if (a.flags.phase !== 'door') return 'not at the front door (' + a.flags.phase + ')';
          var cp = retry.checkpoint('act4');
          if (!cp || cp.beat !== 'door') return 'no checkpoint at the front door';
          if ((cp.data.uses || {}).couch !== 1) return 'the couch was not kept with the checkpoint';
          D.use('chain');
          D.advance(3.4);
          D.use('chain');
          if (a.flags.phase !== 'run') return 'the chain did not come off (' + a.flags.phase + ')';
          D.advance(61); // standing in the open
          if (a.flags.phase !== 'fail') return 'dawdling outside did not fail (' + a.flags.phase + ')';
          if (!(await retryByClick())) return 'no fail screen to click';
          var b = current.act;
          if (b.flags.phase !== 'door') return 'came back at ' + b.flags.phase + ', not the front door';
          if (b.flags.chainTries !== 0 || props.frontDoor.isOpen) return 'the chain was not back on';
          if (b.search.uses('couch') !== 1) return 'he forgot the couch';
          if (!g.habits.entries().some(function (e) { return e.action === 'hid' && e.detail.kind === 'couch'; })) return 'the hide is missing from the habit log';
          if (OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z) !== 'foyer') return 'not in the foyer';
          D.advance(2.2);
          if (dark()) return 'still dark after the beat';
          return true;
        });
        // caught at the bathroom door (he tries the handle while it's unlocked): the quickest fail in The Search
        async function failAtBathDoor() {
          startAct('act4');
          ctl.setLocked(true);
          var a = current.act;
          act4Out(a);
          if (!(await waitFor(function () { return a.flags.unlockReady; }, 60))) return null;
          ctl.teleport(4.2, 21.5, -Math.PI / 2, 0);
          D.use('bathDoor');
          a.search.send('bath');
          for (var i = 0; i < 120 && a.flags.phase !== 'fail'; i++) D.advance(0.25);
          if (a.flags.phase !== 'fail' || !(await failCardArmed())) return null;
          return a;
        }
        await flow('failCardPause', async function () {
          try {
            return await failCardPause();
          } finally {
            ctl.setLocked(true); // the flows after this one play with the game running
          }
        });
        async function failCardPause() {
          // Esc on the fail card, then Quit to title: pressing the menu's buttons is not "try again", a click
          // on the title does not start the retry behind it, Continue brings the card back, and New game
          // leaves it behind for good
          var press = function (el) { el.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })); };
          var a = await failAtBathDoor();
          if (!a) return 'no fail at the bathroom door';
          ctl.setLocked(false); // Esc: the pause menu
          var quit = document.querySelector('button[data-act="quit"]');
          if (!quit || !quit.offsetParent) return 'no Quit to title on the pause menu';
          press(quit);
          if (current.act !== a) return 'pressing Quit to title also tried again';
          quit.click();
          press(document.body); // a click on the title screen
          if (current.act !== a) return 'a click on the title started the retry behind it';
          ctl.setLocked(true); // Continue
          if (!document.querySelector('#fadeText .fail-retry')) return 'Continue did not come back to the fail card';
          press(document.body);
          if (current.act === a) return 'the fail card did nothing after Continue';
          var b = await failAtBathDoor();
          if (!b) return 'no second fail';
          ctl.setLocked(false);
          document.querySelector('button[data-act="quit"]').click();
          startAct('act1'); // New game
          ctl.setLocked(true);
          press(document.body);
          if (current.id !== 'act1') return 'a click in the new game went back to ' + current.id;
          return true;
        }


        // ---- Phase 8: brightness and the safety net ---------------------------------------------------------
        var clickEl = function (sel) {
          var b = document.querySelector(sel);
          if (!b) throw new Error('no ' + sel);
          b.click();
        };
        await flow('brightnessCheck', async function () {
          // the first New game shows Cooper at the end of the dark hall with a brightness slider; Done or Skip
          // is remembered, and the next New game goes straight in
          var had = null;
          var before = settings.brightness;
          try {
            had = localStorage.getItem(BRIGHT_KEY);
            localStorage.removeItem(BRIGHT_KEY);
          } catch (e) { /* no storage: the in-visit flag still works */ }
          brightDoneHere = false;
          try {
            ctl.setLocked(false); // at the title the mouse is free
            clickEl('#title button[data-act="new"]');
            if (menu.current() !== 'bright') return 'the first New game did not show the check';
            if (OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z) !== 'hall') return 'not standing in the hall';
            if (OC.layout.roomAt(OC.house, cooper.pos.x, cooper.pos.z) !== 'hall' || cooper.pos.z - ctl.pos.z < 5) return 'Cooper is not down the hall';
            if (ctl.light.on) return 'the phone light is on';
            if (Object.keys(world.lightById).some(function (id) { return world.lightById[id].intensity > 0; })) return 'a light is on';
            if (!document.body.classList.contains('in-check') || document.body.classList.contains('at-title')) return 'the hall is not showing behind the check';
            var slider = document.getElementById('bBrightness');
            slider.value = '1.6';
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            if (Math.abs(r.brightness() - 1.6) > 1e-6) return 'the slider did not change the picture (' + r.brightness() + ')';
            if (settings.brightness !== 1.6) return 'the slider did not change the setting';
            clickEl('#bright button[data-act="brightDone"]');
            ctl.setLocked(true); // what the browser does when the click captures the mouse
            if (menu.current() === 'bright' || document.body.classList.contains('in-check')) return 'still on the check after Done';
            if (current.id !== 'act1' || OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z) === 'hall') return 'Done did not start night one from its start';
            if (Math.abs(r.brightness() - 1.6) > 1e-6) return 'night one lost the brightness';
            ctl.setLocked(false);
            clickEl('#title button[data-act="new"]');
            if (menu.current() === 'bright') return 'the check came back on the second New game';
            // Skip counts as done too
            brightDoneHere = false;
            localStorage.removeItem(BRIGHT_KEY);
            ctl.setLocked(false);
            clickEl('#title button[data-act="new"]');
            if (menu.current() !== 'bright') return 'no check after forgetting it';
            clickEl('#bright button[data-act="brightSkip"]');
            ctl.setLocked(true);
            if (current.id !== 'act1' || menu.current() === 'bright') return 'Skip did not start the night';
            ctl.setLocked(false);
            clickEl('#title button[data-act="new"]');
            if (menu.current() === 'bright') return 'Skip was not remembered';
            return true;
          } finally {
            try {
              if (had === null) localStorage.removeItem(BRIGHT_KEY);
              else localStorage.setItem(BRIGHT_KEY, had);
            } catch (e) { /* nothing to put back */ }
            settings = OC.settings.normalize(Object.assign({}, settings, { brightness: before }));
            applySettings(settings);
            OC.settings.save(store, settings);
            // the real buttons asked the browser for the mouse: let its answer arrive now, not in the middle
            // of a later flow (it would pause that one)
            try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* not captured */ }
            await wait(600);
            ctl.setLocked(true);
            menu.hide();
          }
        });
        await flow('stuckMoves', async function () {
          // wedged in the middle of the biggest thing in the living room (the couch): "I'm stuck" puts him on
          // the nearest stand point he could have walked to, in the clear, and he says so
          try {
            startAct('act1');
            ctl.setLocked(true);
            D.advance(0.2);
            var big = OC.house.furniture.filter(function (f) {
              return f.solid && OC.layout.roomAt(OC.house, (f.b[0] + f.b[3]) / 2, (f.b[2] + f.b[5]) / 2) === 'living';
            }).sort(function (a, b) { return (b.b[3] - b.b[0]) * (b.b[5] - b.b[2]) - (a.b[3] - a.b[0]) * (a.b[5] - a.b[2]); })[0];
            if (!big) return 'no furniture in the living room';
            var wedged = { x: (big.b[0] + big.b[3]) / 2, z: (big.b[2] + big.b[5]) / 2 };
            if (ctl.nav.isFree(wedged.x, wedged.z)) return 'the middle of the ' + (big.id || 'furniture') + ' is free';
            ctl.teleport(wedged.x, wedged.z, ctl.yaw, 0);
            ctl.setLocked(false);
            clickEl('#pause button[data-act="stuck"]');
            if (!document.getElementById('stuckNote').hidden) return 'refused: ' + document.getElementById('stuckNote').textContent;
            if (ctl.pos.x === wedged.x && ctl.pos.z === wedged.z) return 'he did not move';
            if (!ctl.nav.isFree(ctl.pos.x, ctl.pos.z)) return 'he is still wedged';
            var on = Object.keys(OC.house.stand).filter(function (n) {
              var s = OC.house.stand[n];
              return Math.abs(s.x - ctl.pos.x) < 1e-6 && Math.abs(s.z - ctl.pos.z) < 1e-6;
            });
            if (!on.length) return 'not on a stand point';
            if (OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z) !== 'living') return 'moved out of the living room, to ' + on[0];
            if (subEl.textContent !== content.t('stuck.moved')) return 'he said "' + subEl.textContent + '"';
            report.stuckMovedTo = on[0];
            return true;
          } finally {
            ctl.setLocked(true);
          }
        });
        await flow('stuckRefused', async function () {
          // a set piece, a cutscene and under the house: no move, Mason's reason on the menu, still paused
          var note = document.getElementById('stuckNote');
          async function refuses(want, setup, undo) {
            ctl.setLocked(true);
            D.advance(0.3);
            if (setup) setup();
            var at = { x: ctl.pos.x, z: ctl.pos.z };
            ctl.setLocked(false);
            clickEl('#pause button[data-act="stuck"]');
            var got = note.hidden ? '(no note)' : note.textContent;
            if (undo) undo();
            if (got !== content.t('stuck.no.' + want)) return 'wanted ' + want + ', got "' + got + '"';
            if (ctl.pos.x !== at.x || ctl.pos.z !== at.z) return 'it moved him anyway';
            if (menu.current() !== 'pause') return 'it left the pause menu';
            return null;
          }
          try {
            var bad;
            startAct('act4');
            if ((bad = await refuses('scene'))) return 'The Search: ' + bad;
            startAct('act1');
            if ((bad = await refuses('busy', function () { g.state.cutscene = true; }, function () { g.state.cutscene = false; }))) return 'a cutscene: ' + bad;
            startAct('act2');
            if ((bad = await refuses('crawl', function () { current.act.flags.inCrawl = true; }, function () { current.act.flags.inCrawl = false; }))) return 'under the house: ' + bad;
            ctl.setLocked(true);
            ctl.setLocked(false);
            if (!note.hidden) return 'the reason stayed up the next time he paused';
            return true;
          } finally {
            ctl.setLocked(true);
          }
        });
        await flow('stallNudge', async function () {
          // three minutes of night one with nothing done: one line from Mason that says where, then nothing
          // more for a few minutes
          startAct('act1');
          ctl.setLocked(true);
          var lines = Object.keys(OC.stuck.HINTS.act1).map(function (id) { return content.t(OC.stuck.hintText('act1', id)); });
          D.advance(170);
          var early = await listen(1);
          if (early.some(function (h) { return lines.indexOf(h) >= 0; })) return 'nudged before three minutes';
          var heard = (await listen(40)).filter(function (h) { return lines.indexOf(h) >= 0; });
          if (heard.length !== 1) {
            var hs = help.state();
            return 'heard ' + JSON.stringify(heard) + ' around three minutes in ' + JSON.stringify({
              t: hs.t, act: hs.act, last: hs.lastNudge, given: hs.given, sub: hs.sub, since: current.act.director.sinceTask(),
              tasks: phone.tasks().length, on: subEl.classList.contains('on'), cut: !!g.state.cutscene, modal: !!g.state.modal,
              reading: OC.hud.isReading(), choosing: phone.choosing(), locked: ctl.locked,
            });
          }
          // (the first line can still be up on its real-time timer: a second nudge would be another task)
          var more = (await listen(60)).filter(function (h) { return lines.indexOf(h) >= 0 && h !== heard[0]; });
          if (more.length || Object.keys(help.state().given).length !== 1) return 'nudged again a minute later: ' + JSON.stringify(more);
          report.nudge = heard[0];
          return true;
        });

        // ---- the first stranger playtest (2026-11-18): what a new player ran into -------------------------
        await flow('batteryPaused', async function () {
          // the phone light drains only while the game is running: paused with it on, the battery holds
          freshNight();
          try {
            ctl.light.available = true;
            ctl.light.on = true;
            D.advance(0.5);
            var was = ctl.light.battery;
            ctl.setLocked(false);
            D.advance(6);
            if (ctl.light.battery < was - 1e-9) return 'drained ' + ((was - ctl.light.battery) * 100).toFixed(2) + '% while paused';
            ctl.setLocked(true);
            D.advance(6);
            if (!(ctl.light.battery < was)) return 'it no longer drains while playing';
            return true;
          } finally {
            ctl.light.on = false;
            ctl.setLocked(true);
          }
        });
        await flow('stuckAskedNewest', async function () {
          // "I'm stuck" just after a new task shows up talks about that task: asking is not waiting
          var a = freshNight();
          try {
            D.advance(100); // the evening's chores are old news
            a.ctx.reveal('hatch');
            D.advance(2);
            ctl.setLocked(false);
            clickEl('#pause button[data-act="stuck"]');
            var note = document.getElementById('stuckNote');
            if (!note.hidden) return 'refused: ' + note.textContent;
            var want = content.t(OC.stuck.hintText('act1', 'hatch'));
            if (subEl.textContent !== want) return 'he said "' + subEl.textContent + '"';
            return true;
          } finally {
            ctl.setLocked(true);
          }
        });
        await flow('unreadReopen', async function () {
          // the phone opens back on the chat it was left on: a text that came in while it was away is read
          freshNight();
          try {
            phone.deliver('ethan', 'Ethan', 'one');
            phone.open();
            phone.app('messages');
            phone.openChat('ethan');
            if (phone.unread('ethan')) return 'opening the chat did not read it';
            phone.close();
            phone.deliver('ethan', 'Ethan', 'two');
            if (phone.unread('ethan') !== 1) return 'a text to a put-away phone is not new';
            phone.open();
            if (phone.openThread() !== 'ethan' || phone.currentApp() !== 'messages') return 'the phone did not open on the chat it was left on';
            if (phone.unread('ethan')) return 'still ' + phone.unread('ethan') + ' new with the text on screen';
            phone.app('home');
            phone.close();
            phone.deliver('ethan', 'Ethan', 'three');
            phone.open();
            if (phone.unread('ethan') !== 1) return 'a text counted as read with the phone on Home';
            return true;
          } finally {
            phone.close();
          }
        });
        await flow('fridgeLineOrder', async function () {
          // the small fridge note says pipes: Mason compares it only with what he has read tonight
          async function putDown() {
            await wait(300);
            document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE' }));
            await tick();
          }
          async function bigNote() {
            D.use('note');
            await putDown();
          }
          async function daveText() {
            phone.deliver('dave', 'Uncle Dave', content.t('act1.sms.dave2'));
          }
          var cases = [
            ['n1.joke.pipesThoughtFirst', []],
            ['n1.joke.pipesThoughtNote', [bigNote]],
            ['n1.joke.pipesThoughtText', [daveText]],
            ['n1.joke.pipesThought', [daveText, bigNote]],
          ];
          for (var i = 0; i < cases.length; i++) {
            freshNight();
            for (var j = 0; j < cases[i][1].length; j++) await cases[i][1][j]();
            D.use('sticky.pipes');
            await putDown();
            if (subEl.textContent !== content.t(cases[i][0])) return 'wanted ' + cases[i][0] + ', got "' + subEl.textContent + '"';
          }
          return true;
        });
        await flow('beamAim', async function () {
          // the phone light lands on what you look at: its beam passes the crosshair a few metres out
          freshNight();
          try {
            ctl.light.on = true;
            D.advance(0.1);
            var a = new THREE.Vector3();
            var b = new THREE.Vector3();
            var c = new THREE.Vector3();
            var f = new THREE.Vector3();
            ctl.light.spot.getWorldPosition(a);
            ctl.light.spot.target.getWorldPosition(b);
            r.camera.getWorldPosition(c);
            r.camera.getWorldDirection(f);
            var dir = b.clone().sub(a).normalize();
            var worst = 0;
            [2, 3, 4].forEach(function (d) {
              var p = c.clone().addScaledVector(f, d);
              var along = p.clone().sub(a).dot(dir);
              worst = Math.max(worst, p.distanceTo(a.clone().addScaledVector(dir, along)));
            });
            if (worst > 0.1) return 'the beam misses the crosshair by up to ' + worst.toFixed(2) + ' m between 2 and 4 m out';
            return true;
          } finally {
            ctl.light.on = false;
          }
        });
        await flow('toastCamera', async function () {
          // with the camera up, a toast ("Done: ...") sits clear of the viewfinder's label
          freshNight();
          try {
            D.phoneApp('camera');
            OC.hud.toast('Done: Send Ethan a hallway pic', 3000);
            var t = document.getElementById('toast').getBoundingClientRect();
            var l = document.querySelector('#viewfinder .vf-label').getBoundingClientRect();
            if (!l.width || !t.width) return 'no viewfinder label or no toast';
            if (t.left < l.right && l.left < t.right && t.top < l.bottom && l.top < t.bottom) return 'the toast covers the viewfinder label';
            return true;
          } finally {
            D.phoneApp(null);
          }
        });
        await flow('brightRefused', async function () {
          // the browser won't capture the mouse after "That's him" (too soon after Esc, say): the check does
          // not stay up over night one; the pause menu's Resume asks again
          var had = null;
          try {
            had = localStorage.getItem(BRIGHT_KEY);
            localStorage.removeItem(BRIGHT_KEY);
          } catch (e) { /* the in-visit flag still works */ }
          brightDoneHere = false;
          try {
            ctl.setLocked(false);
            clickEl('#title button[data-act="new"]');
            if (menu.current() !== 'bright') return 'no brightness check';
            clickEl('#bright button[data-act="brightDone"]');
            document.dispatchEvent(new Event('pointerlockerror'));
            if (menu.current() !== 'pause') return 'with the mouse refused, the menu is ' + menu.current();
            if (document.body.classList.contains('in-check')) return 'still showing the check';
            if (current.id !== 'act1') return 'night one did not start';
            return true;
          } finally {
            try {
              if (had === null) localStorage.removeItem(BRIGHT_KEY);
              else localStorage.setItem(BRIGHT_KEY, had);
            } catch (e) { /* nothing to put back */ }
            if (document.exitPointerLock) document.exitPointerLock();
            await wait(600);
            ctl.setLocked(true);
            menu.hide();
          }
        });

        await flow('textsFresh', async function () {
          // the phone's texts belong to one run: New game and a chapter picked from the menu start with none
          // from before, Restart puts back the ones the chapter began with, and the next chapter keeps them
          function has(text) {
            return phone.messages().some(function (m) { return m.text === text; });
          }
          var hadBright = brightDoneHere;
          brightDoneHere = true; // straight into the night, no brightness check
          try {
            startAct('act1');
            phone.deliver('dave', 'Uncle Dave', 'from the last run');
            ctl.setLocked(false);
            clickEl('#title button[data-act="new"]');
            if (has('from the last run')) return 'New game kept a text from the last run';
            ctl.setLocked(true);
            phone.deliver('dave', 'Uncle Dave', 'before the restart');
            ctl.setLocked(false);
            clickEl('#pause button[data-act="restart"]');
            if (has('before the restart')) return 'Restart kept a text from the try before';
            ctl.setLocked(true);
            phone.deliver('ethan', 'Ethan', 'from night one');
            startAct('day2'); // what the end of night one does
            if (!has('from night one')) return 'the next chapter lost the texts from night one';
            phone.deliver('ethan', 'Ethan', 'from day two');
            ctl.setLocked(false);
            clickEl('#pause button[data-act="restart"]');
            if (!has('from night one')) return 'Restart on day two lost the texts the chapter began with';
            if (has('from day two')) return 'Restart on day two kept a text from the try before';
            clickEl('#chapters button[data-chapter="act2"]');
            if (has('from night one')) return 'a chapter picked from the menu kept texts from another run';
            return true;
          } finally {
            brightDoneHere = hadBright;
            // the menu clicks asked the browser for the mouse: let its answer land here, not in the next flow
            if (document.exitPointerLock) document.exitPointerLock();
            await wait(600);
            ctl.setLocked(true);
            menu.hide();
          }
        });
        await flow('textsRetry', async function () {
          // a fail after the car's texts, then a retry from the car: Ethan's reply is on the phone once
          try {
            g.habits.reset();
            startAct('act4');
            ctl.setLocked(true);
            var a = current.act;
            a.flags.phase = 'run'; // straight to outside, as in act4CarRetry
            ctl.teleport(11.5, -9.6, 0, 0);
            if (!D.use('car')) return 'could not get in the car';
            D.advance(0.1);
            var reply = content.t('act4.sms.ethan1');
            var replies = function () {
              return phone.messages().filter(function (m) { return m.text === reply; }).length;
            };
            var before = replies();
            var hideAndFail = async function (b) {
              if (!D.use('ignition')) return 'no ignition';
              if (!(await waitFor(function () { return b.flags.phase === 'exposed'; }, 12))) return 'he never came out of the house';
              if (!D.use('down')) return 'could not get down';
              if (!(await waitFor(function () { return b.flags.atWindow; }, 40))) return 'he never came to the window';
              D.advance(3.2);
              b.noise.poke(1);
              D.advance(0.1);
              return b.flags.phase === 'fail' ? true : 'a sound in the car did not fail (' + b.flags.phase + ')';
            };
            var r1 = await hideAndFail(a);
            if (r1 !== true) return 'first try: ' + r1;
            if (replies() !== before + 1) return 'Ethan replied ' + (replies() - before) + ' times on the first try';
            if (!(await retryByClick())) return 'no fail screen to click';
            var b = current.act;
            if (b === a) return 'the retry did not start';
            D.advance(2.4); // the beat in the dark
            var r2 = await hideAndFail(b);
            if (r2 !== true) return 'second try: ' + r2;
            if (replies() !== before + 1) return 'after a retry from the car, Ethan replied ' + (replies() - before) + ' times';
            return true;
          } finally {
            OC.hud.clearFail();
            ctl.setLocked(true);
          }
        });

        // ---- Day 2: the Gas-N-Go, and driving there and back yourself -------------------------------------
        function letGo() {
          ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach(function (k) { key(k, true); });
        }
        // the errand: into the car at the house, on the road
        async function toTheRoad() {
          startAct('day2');
          ctl.setLocked(true);
          var a = current.act;
          a.flags.phase = 'errand';
          if (!D.use('car')) throw new Error('the car would not take him');
          if (!(await waitFor(function () { return a.mods.trip.state.stage === 'driveOut'; }, 4))) throw new Error('the drive did not start');
          return a.mods.trip;
        }
        // W held to the Gas-N-Go
        async function toTheShop(trip) {
          key('KeyW');
          var got = await waitFor(function () { return trip.state.stage === 'shop'; }, 90);
          key('KeyW', true);
          if (!got) throw new Error('never reached the shop (' + trip.state.stage + ', z ' + Math.round(trip.state.z) + ')');
          D.advance(1.5);
        }
        function hold(code, secs) {
          key(code);
          D.advance(secs);
          key(code, true);
        }
        await flow('storeUsable', async function () {
          // at the Gas-N-Go after the drive, the shop's things can be looked at and used: the drive's
          // cutscene ends when he gets out of the car
          try {
            var trip = await toTheRoad();
            await toTheShop(trip);
            var spots = [[396.6, 4.6], [395.6, 5.75], [397.6, 5.75], [396.6, 6.9], [395.8, 4.8], [397.4, 4.8]];
            var seen = null;
            for (var i = 0; i < spots.length && !seen; i++) {
              ctl.teleport(spots[i][0], spots[i][1], 0, 0);
              D.aim(396.62, 0.35, 5.75);
              D.advance(0.2);
              if (interact.target && interact.target.id === 'grabDogFood') seen = spots[i];
            }
            if (!seen) return 'nothing to pick up looking at the dog food (prompt: ' + (interact.target ? interact.target.id : 'none') + ', cutscene ' + g.state.cutscene + ')';
            key('KeyE');
            key('KeyE', true);
            D.advance(0.2);
            if (!trip.state.picked.dogFood) return 'E did not pick up the dog food';
            return true;
          } finally {
            letGo();
          }
        });
        await flow('driveYourself', async function () {
          // the car goes where Mason drives it: nowhere by itself, W to go, A and D to steer (the view turns
          // with it), S to stop, the trees as the edge, and the keys on screen the whole way
          try {
            var trip = await toTheRoad();
            var s = trip.state;
            if (!document.body.classList.contains('driving') || getComputedStyle(document.getElementById('driveHint')).display === 'none') return 'no driving keys on screen';
            var z0 = s.z;
            D.advance(4);
            if (Math.abs(s.z - z0) > 0.5) return 'the car drove itself ' + (s.z - z0).toFixed(1) + ' m';
            var heard = await listen(22);
            if (heard.indexOf(content.t('day2.thought.driveNudgeOut')) < 0) return 'sitting still on the road, Mason said nothing';
            hold('KeyW', 4);
            if (!(s.speed > 8) || !(s.z > z0 + 15)) return 'W did not drive it (speed ' + s.speed.toFixed(1) + ')';
            var x0 = s.x;
            var yaw0 = ctl.yaw;
            var cy0 = s.cy;
            key('KeyW');
            hold('KeyA', 0.6);
            key('KeyW', true);
            if (!(s.x > x0 + 0.2)) return 'A did not steer left (x moved ' + (s.x - x0).toFixed(2) + ')';
            if (Math.abs(ctl.yaw - yaw0 - (s.cy - cy0)) > 1e-6) return 'the view did not turn with the car';
            key('KeyW');
            hold('KeyA', 6);
            key('KeyW', true);
            if (Math.abs(s.x - OC.places.ROAD_X) > 6.6) return 'drove off into the trees (x ' + s.x.toFixed(1) + ')';
            hold('KeyS', 4);
            if (s.speed > 0.5) return 'S did not stop it (speed ' + s.speed.toFixed(1) + ')';
            await toTheShop(trip);
            if (document.body.classList.contains('driving')) return 'the driving keys stayed up at the shop';
            if (g.state.cutscene) return 'still in the cutscene at the shop';
            return true;
          } finally {
            letGo();
          }
        });
        // to the shop, pay, and back in the car for the drive home
        async function toTheDriveHome() {
          var trip = await toTheRoad();
          await toTheShop(trip);
          trip.state.paid = true;
          if (!D.use('shopCar')) throw new Error('could not get back in the car');
          if (!(await waitFor(function () { return trip.state.stage === 'driveHome'; }, 4))) throw new Error('the drive home did not start');
          return trip;
        }
        // floored toward the deer: Mason brakes for it whatever the keys say, and stops short of it
        async function throughTheDeer(trip) {
          var s = trip.state;
          var minAhead = Infinity;
          key('KeyW');
          if (!(await waitFor(function () { return s.deer === 'standing'; }, 60))) return 'no deer';
          var passed = await waitFor(function () {
            minAhead = Math.min(minAhead, s.z - trip.DEER_Z);
            return s.deer === 'passing';
          }, 20);
          if (!passed) return 'the deer never moved on (' + s.deer + ')';
          if (!(minAhead >= 10)) return 'came within ' + minAhead.toFixed(1) + ' m of the deer';
          return true;
        }
        await flow('driveHomeDeer', async function () {
          // the drive home is his too: nowhere by itself, the deer, the man at the roadside, and the house
          try {
            var trip = await toTheDriveHome();
            var s = trip.state;
            var z0 = s.z;
            D.advance(3);
            if (Math.abs(s.z - z0) > 0.5) return 'the car drove itself home';
            var deer = await throughTheDeer(trip);
            if (deer !== true) return deer;
            if (!(await waitFor(function () { return s.deer === 'past'; }, 30))) return 'never got past the man at the roadside (' + s.deer + ')';
            if (!(await waitFor(function () { return current.act.flags.ending; }, 40))) return 'never got home';
            return true;
          } finally {
            letGo();
          }
        });
        await flow('roadsideStare', async function () {
          // stop and stare at the man at the roadside, and he backs into the trees
          try {
            var trip = await toTheDriveHome();
            var s = trip.state;
            var deer = await throughTheDeer(trip);
            if (deer !== true) return deer;
            key('KeyW', true);
            hold('KeyS', 1.5);
            if (!props.intruder.visible()) return 'he was gone before the car stopped';
            var heard = await listen(20, 'day2.thought.roadsideStare');
            if (props.intruder.visible()) return 'he is still standing there';
            if (s.deer !== 'past') return 'staring did not move things on (' + s.deer + ')';
            if (heard.indexOf(content.t('day2.thought.roadsideStare')) < 0) return 'Mason said nothing about him';
            if (!(props.intruder.pos.x > OC.places.ROAD_X + 9)) return 'he vanished on the spot instead of backing into the trees';
            return true;
          } finally {
            letGo();
          }
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
