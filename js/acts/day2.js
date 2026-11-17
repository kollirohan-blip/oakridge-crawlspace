// Day 2, "Daylight" (10 AM to 8:30 PM; fear 1 to 5 to 2).
// The morning (sun, coffee, calls, the pet cam clip), an optional visit from Deputy Ray, the afternoon's
// lore (the closet marks, the shed, Dave's email), then the store trip at dusk and the drive home, into
// Night 2. This file owns the to-do list, the phases and their clock and light, and the shared helpers
// the day's modules use (js/day2/*.js).
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};
  var D2 = OC.day2 || {};

  var MODULES = ['morning', 'deputy', 'lore', 'trip'];
  var BASE_TEXT = ['day2.vo.afternoon', 'day2.thought.errand', 'day2.vo.end', 'day2.sms.daveEmail', 'n1.chore.doorStuck'];
  var TEXT = MODULES.reduce(function (all, m) {
    return D2[m] ? all.concat(D2[m].TEXT) : all;
  }, BASE_TEXT.slice());

  var MORNING = [
    { id: 'coffee', label: 'Make coffee' },
    { id: 'feedCooper', label: 'Feed Cooper' },
    { id: 'petcam', label: 'Check the pet cam clip' },
    { id: 'turnCam', label: 'Turn the pet cam back' },
    { id: 'callMom', label: 'Call Mom back' },
    { id: 'callDave', label: 'Call Dave' },
  ];
  var AFTERNOON = [
    { id: 'unpack', label: 'Hang your clothes in the guest closet' },
    { id: 'email', label: "Check Dave's email for the bug guy" },
    { id: 'dogFood', label: 'Get more dog food from the shed' },
  ];
  var LATER = [
    { id: 'store', label: 'Drive to the Gas-N-Go' },
    { id: 'buy_dogFood', label: 'Dog food' },
    { id: 'buy_batteries', label: 'Batteries' },
    { id: 'buy_snack', label: 'Something for dinner' },
    { id: 'buy_milk', label: 'Milk' },
    { id: 'pay', label: 'Pay' },
    { id: 'driveHome', label: 'Drive home' },
  ];
  // each phase: its stretch of the clock, and how much daylight (a number, or a function of the clock)
  var PHASES = {
    morning: { clock: { startMin: 600, endMin: 810, durationSec: 300 }, light: 1 },
    afternoon: { clock: { startMin: 840, endMin: 1110, durationSec: 420 }, light: function (f) { return 1 - 0.3 * f; } },
    errand: { light: function (f) { return 1 - 0.3 * f; } },
    driveOut: { clock: { startMin: 1125, endMin: 1145, durationSec: 50 }, light: 0.5 },
    shop: { clock: { startMin: 1150, endMin: 1195, durationSec: 300 }, light: 0.3 },
    driveHome: { clock: { startMin: 1205, endMin: 1230, durationSec: 80 }, light: 0.06 },
  };

  OC.acts.day2 = {
    id: 'day2',
    night: 2,
    stamp: 'DAY 2',
    spawn: 'guestBed',
    daylight: 1,
    clockDef: PHASES.morning.clock,
    contacts: D2.morning ? D2.morning.CONTACTS : [],
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var none = { stop: function () {} };
      var R = g.render;

      // the house by day: no lamps on, everything as Mason left it
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0, porch: 0, laundry: 0, guest: 0, phoneglow: 0, yard: 0, tv: 0, bath: 0 });
      if (g.state.tvSound) g.state.tvSound.stop();
      props.tv.setOn(false);
      props.bowl.setFilled(false);
      props.microwave.setGlow(false);
      props.frontDoor.close();
      props.slider.setOpen(0);
      props.slider.setLocked(true);
      props.hatch.setAjar(false);
      props.hatch.setPadlock(true);
      props.broom.set('corner');
      props.master.setStage('off');
      props.car.fixWindow();
      props.car.headlights(false);
      props.intruder.show(false);
      props.intruder.redEye(false);
      props.decor.growth.setFresh(true);
      if (ctl.nav) ctl.nav.rebuild();
      g.state.gag = false;
      g.state.modal = null;
      g.photo.reset();
      g.habits.startChapter('dayTwo');
      phone.setShopping([]);

      var flags = { elapsed: 0, phase: 'morning', lightPhase: 'morning', ending: false };
      var queue = [];
      var loops = [];
      var talk = null;
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      var revealed = {};
      MORNING.forEach(function (x) { if (x.id !== 'petcam' && x.id !== 'turnCam' && x.id !== 'callMom' && x.id !== 'callDave') revealed[x.id] = true; });
      function visible() {
        return director.list().filter(function (x) { return revealed[x.id]; });
      }
      var director = OC.director.createDirector(
        {
          tasks: MORNING.concat(AFTERNOON, LATER),
          advanceWhen: function () { return false; },
          triggers: [
            { id: 'intro', when: function (s) { return s.elapsed > 1.5; }, do: function () { hud.say(t('day2.vo.open'), 9000); } },
          ],
        },
        {
          onTask: function (id) {
            var task = director.list().filter(function (x) { return x.id === id; })[0];
            if (revealed[id] && id.indexOf('buy_') !== 0) hud.toast('Done: ' + task.label);
            phone.setTasks(visible());
          },
        }
      );
      phone.setTasks(visible());

      // g.cache keeps scenery made once (the police car, Ray, the deer) across restarts of the day
      g.cache = g.cache || {};
      function daylightNow() {
        var L = PHASES[flags.lightPhase].light;
        if (typeof L !== 'function') return L;
        var c = PHASES.afternoon.clock;
        var f = Math.max(0, Math.min(1, (g.clock.minutes() - c.startMin) / (c.endMin - c.startMin)));
        return L(f);
      }
      var lightT = 0;

      var ctx = {
        flags: flags,
        director: director,
        later: later,
        sfx: sfx,
        loop: function (name, opts) {
          var h = sfx(name, opts);
          loops.push(h);
          return h;
        },
        once: function (key, make) {
          if (!g.cache[key]) g.cache[key] = make();
          return g.cache[key];
        },
        log: function (action, detail) {
          return g.habits.log(action, detail, { clock: g.clock ? g.clock.label() : '', t: flags.elapsed });
        },
        complete: function (id) {
          if (!director.done(id)) director.complete(id);
        },
        done: function (id) {
          return director.done(id);
        },
        reveal: function (id) {
          revealed[id] = true;
          phone.setTasks(visible());
        },
        phase: function () {
          return flags.phase;
        },
        setPhase: setPhase,
        daylight: daylightNow,
        talking: function () {
          return !!(talk && talk.active());
        },
        // start a conversation from content/talks.js (subtitles; opts.call puts it on the call screen)
        talk: function (id, opts) {
          if (talk && talk.active()) return null;
          opts = opts || {};
          var o = Object.assign({}, opts, {
            log: function (a) {
              ctx.log(a);
              if (opts.log) opts.log(a);
            },
          });
          talk = OC.talk.start(g, OC.talkData[id], o);
          return talk;
        },
        // a phone call: it rings twice, then they pick up
        call: function (id, name, opts) {
          if (talk && talk.active()) {
            hud.toast("You're already on a call.");
            return false;
          }
          if (flags.phase === 'driveOut' || flags.phase === 'driveHome' || flags.phase === 'shop') {
            hud.say(t('day2.thought.noSignal'));
            return false;
          }
          phone.close();
          phone.startCall(name);
          phone.callLine(name, '...');
          sfx('ring');
          talk = { active: function () { return true; }, update: function () {}, stop: function () { phone.endCall(); } }; // ringing
          later(2.6, function () {
            talk = null;
            ctx.talk(id, Object.assign({ call: name }, opts || {}));
          });
          return true;
        },
        finish: finish,
      };

      var mods = {};
      MODULES.forEach(function (m) {
        if (D2[m]) mods[m] = D2[m].create(g, ctx);
      });
      ctx.mods = mods;
      var all = MODULES.filter(function (m) { return mods[m]; }).map(function (m) { return mods[m]; });
      all.forEach(function (m) {
        m.items.forEach(function (it) { g.interact.add(it); });
      });
      // the front door: the shed and the car are outside (Night 1 and Night 2 each add their own door)
      g.interact.add({
        id: 'frontDoor', x: 2.5, y: 1.0, z: 0, radius: 0.5,
        label: function () { return props.frontDoor.isOpen ? 'Close the front door' : 'Open the front door'; },
        onUse: function () {
          if (props.frontDoor.isOpen) {
            if (!props.frontDoor.close(ctl.pos)) return hud.say(t('n1.chore.doorStuck'));
          } else props.frontDoor.open();
          sfx('slide', { pos: { x: 2.5, y: 1, z: 0 }, gain: 0.6 });
          if (ctl.nav) ctl.nav.rebuild();
        },
      });

      function setPhase(name) {
        flags.phase = name;
        flags.lightPhase = name;
        var p = PHASES[name];
        if (p.clock) g.clock.jump(p.clock);
        g.world.setDaylight(daylightNow(), R.renderer);
        if (name === 'shop') {
          OC.places.lightsAt(g.world, 'shop');
          props.setLights({ porch: 1.25, yard: 0.9 });
        } else if (name === 'driveOut' || name === 'driveHome') {
          OC.places.lightsAt(g.world, 'home');
          props.setLights({ porch: name === 'driveHome' ? 1.0 : 0, yard: 0 });
        }
      }

      function toAfternoon() {
        flags.phase = 'toAfternoon';
        hud.fadeOut('');
        later(1.6, function () {
          setPhase('afternoon');
          AFTERNOON.forEach(function (x) { revealed[x.id] = true; });
          phone.setTasks(visible());
          phone.deliver('dave', 'Uncle Dave', t('day2.sms.daveEmail'));
          hud.fadeIn();
          later(1.0, function () { hud.say(t('day2.vo.afternoon'), 7000); });
        });
      }
      function toErrand() {
        flags.phase = 'errand';
        revealed.store = true;
        LATER.forEach(function (x) {
          if (x.id.indexOf('buy_') === 0) {
            var need = mods.trip.list.some(function (l) { return 'buy_' + l[0] === x.id; });
            if (need) revealed[x.id] = true;
          }
        });
        revealed.pay = true;
        phone.setTasks(visible());
        phone.setShopping(mods.trip.list.map(function (l) { return l[1]; }));
        later(2, function () { hud.say(t('day2.thought.errand'), 7000); });
      }

      function finish() {
        if (flags.ending) return;
        flags.ending = true;
        hud.fadeOut('');
        setTimeout(function () { hud.setFadeText(t('day2.vo.end')); }, 1500);
        setTimeout(function () { hud.setFadeText('NIGHT 2'); }, 9500);
        setTimeout(function () { if (g.onEnd) g.onEnd('day2'); }, 12500);
      }

      return {
        director: director,
        flags: flags,
        mods: mods,
        ctx: ctx,
        loops: loops,
        onCall: function (id) {
          return mods.morning.call(id);
        },
        onLink: function (link) {
          mods.morning.onLink(link);
        },
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) {
              var job = queue.splice(i, 1)[0];
              job.fn();
            }
          }
          if (talk) talk.update(dt);
          all.forEach(function (m) { m.update(dt); });
          director.tick(dt, flags);
          var busy = (talk && talk.active()) || (mods.deputy && mods.deputy.busy()) || OC.hud.isReading();
          if (flags.phase === 'morning' && MORNING.every(function (x) { return director.done(x.id); }) && !busy) toAfternoon();
          if (flags.phase === 'afternoon' && AFTERNOON.every(function (x) { return director.done(x.id); }) && !busy) toErrand();
          lightT -= dt;
          if (lightT <= 0) {
            lightT = 1;
            g.world.setDaylight(daylightNow(), R.renderer);
          }
        },
        dispose: function () {
          all.forEach(function (m) { if (m.dispose) m.dispose(); });
          if (talk) talk.stop();
          loops.forEach(function (h) { h.stop(); });
          loops.length = 0;
          queue.length = 0;
          hud.cc(null);
          phone.cancelChoice();
          phone.endCall();
          phone.stopMusic();
          phone.setShopping([]);
          g.state.modal = null;
          g.state.cutscene = false;
          OC.places.lightsAt(g.world, 'home');
        },
      };
    },
  };
})();
