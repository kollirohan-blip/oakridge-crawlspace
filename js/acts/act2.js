// Act 2, Night 2: "The House Has Changed" (8:30 PM to midnight).
// Mason comes back from the store to a door deadbolted from the inside. The house is the same house
// with seven small things wrong in it, a hatch standing open, and a storm coming in. What the night
// does next depends on how he spent the last one (js/engine/habits.js: nightTwoPlan): lights always
// on, and the breaker goes; a lot of phone light, and the light falters; kept checking Dave's window,
// and tonight's glimpse is in the black TV. The hatch can be gone down. This file composes the night's
// modules (js/night2/*.js) and owns the to-do list, the house lights, and the helpers they share.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};
  var N2 = OC.night2 || {};

  var MODULES = ['arrival', 'changes', 'under', 'dread'];
  var BASE_TEXT = ['act2.vo.open', 'act2.vo.end'];
  var TEXT = MODULES.reduce(function (all, m) {
    return N2[m] ? all.concat(N2[m].TEXT) : all;
  }, BASE_TEXT.slice());

  var TASKS = [
    { id: 'inside', label: 'Get inside' },
    { id: 'groceries', label: 'Put the groceries down' },
    { id: 'secure', label: 'Lock up the house' },
    { id: 'unpack', label: 'Put the groceries away' },
  ];
  // revealed later
  var LATER = [
    { id: 'breaker', label: 'Reset the breaker (laundry room)' },
    { id: 'landline', label: 'Answer the house phone' },
    { id: 'bed', label: 'Go to bed' },
  ];
  var FEAR = { outside: 4, inside: 5, secured: 6, late: 7, bed: 5 };

  OC.acts.act2 = {
    id: 'act2',
    night: 2,
    spawn: 'driveway',
    clockDef: { startMin: 20 * 60 + 30, endMin: 24 * 60, durationSec: 780 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var ch = props.changes;
      var none = { stop: function () {} };

      // ---- the house as Mason finds it ---------------------------------------------------------------
      if (g.state.tvSound) g.state.tvSound.stop();
      props.tv.setOn(false);
      props.microwave.setGlow(false);
      props.bowl.setFilled(false);
      props.frontDoor.close();
      props.slider.setLocked(false);
      props.slider.setOpen(0.076);
      props.hatch.setAjar(true);
      props.hatch.setPadlock(false);
      props.broom.set('corner');
      props.master.setStage('off');
      props.car.fixWindow();
      props.intruder.show(false);
      props.intruder.redEye(false);
      g.state.gag = false;
      g.state.modal = null;
      g.photo.reset();
      g.habits.startChapter('nightTwo');
      var plan = g.state.forcePlan || OC.habits.nightTwoPlan(g.habits.entries());
      ctl.light.available = true;
      ctl.light.battery = Math.max(ctl.light.battery, 0.55); // he charged it in the car
      ctl.light.on = false;
      if (plan.gates.lightFalters) ctl.light.drain = 2.2;

      var flags = { elapsed: 0, room: null, stage: 'outside', insideAt: -1, securedAt: -1, inCrawl: false, ending: false };
      var queue = [];
      var loops = [];
      var talk = null;
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function say(id, ms) {
        hud.say(t(id), ms);
      }

      // ---- the house lights: which are switched on, and whether there is power ----------------------
      var LEVEL = { porch: 1.0 };
      OC.house.switches.forEach(function (s) { LEVEL[s.light] = s.on; });
      var wanted = { laundry: true }; // somebody left the laundry room light on
      var power = true;
      function applyLights() {
        var levels = { guest: 0, phoneglow: 0, tv: 0, yard: 0.45 };
        Object.keys(LEVEL).forEach(function (id) { levels[id] = power && wanted[id] ? LEVEL[id] : 0; });
        if (flags.inCrawl) {
          delete levels.laundry; // borrowed under the house
          delete levels.guest;
          delete levels.yard;
        }
        props.setLights(levels);
        ch.tablet.setBright(power ? 0.6 : 0.04);
      }
      var lights = {
        on: function (id) {
          return !!wanted[id] && power;
        },
        wanted: function (id) {
          return !!wanted[id];
        },
        set: function (id, v) {
          wanted[id] = !!v;
          applyLights();
        },
        power: function (v) {
          power = !!v;
          applyLights();
        },
        hasPower: function () {
          return power;
        },
        apply: applyLights,
        // how many rooms are lit (the porch does not count)
        count: function () {
          return Object.keys(wanted).filter(function (k) { return k !== 'porch' && wanted[k]; }).length;
        },
      };
      applyLights();

      // ---- the to-do list ------------------------------------------------------------------------------
      var revealed = {};
      TASKS.forEach(function (x) { revealed[x.id] = true; });
      function visible() {
        return director.list().filter(function (x) { return revealed[x.id]; });
      }
      var director = OC.director.createDirector(
        {
          tasks: TASKS.concat(LATER),
          advanceWhen: function () { return false; },
          triggers: [
            { id: 'intro', when: function (s) { return s.elapsed > 1.5; }, do: function () { hud.say(t('act2.vo.open'), 10000); } },
          ],
        },
        {
          onTask: function (id) {
            var task = director.list().filter(function (x) { return x.id === id; })[0];
            if (revealed[id]) hud.toast('Done: ' + task.label);
            phone.setTasks(visible());
          },
        }
      );
      phone.setTasks(visible());
      phone.setShopping([]);

      // ---- the storm -----------------------------------------------------------------------------------
      var weather = OC.weather.create(g);
      weather.setLevel(0.3); // wind and a thin rain as he pulls in; the worst of it comes later
      var tension = OC.tension.createTension({ rise: 0.015, cooldown: 16, reliefSec: 26 });

      var ctx = {
        flags: flags,
        plan: plan,
        director: director,
        tension: tension,
        weather: weather,
        lights: lights,
        later: later,
        sfx: sfx,
        say: say,
        loop: function (name, opts) {
          var h = sfx(name, opts);
          loops.push(h);
          return h;
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
        fear: function () {
          return FEAR[flags.stage] || 5;
        },
        setStage: function (s) {
          flags.stage = s;
        },
        indoors: function () {
          return flags.room !== null;
        },
        // nothing else has Mason: not sitting, reading, choosing, talking or in a cutscene
        free: function () {
          return !ctl.frozen && !g.state.modal && !phone.choosing() && !hud.isReading() && !g.state.cutscene && !(talk && talk.active());
        },
        talking: function () {
          return !!(talk && talk.active());
        },
        talk: function (id, opts) {
          if (talk && talk.active()) return null;
          opts = opts || {};
          talk = OC.talk.start(g, OC.talkData[id], Object.assign({}, opts, {
            log: function (a) {
              ctx.log(a);
              if (opts.log) opts.log(a);
            },
          }));
          return talk;
        },
        finish: finish,
      };

      var mods = {};
      MODULES.forEach(function (m) {
        if (N2[m]) mods[m] = N2[m].create(g, ctx);
      });
      ctx.mods = mods;
      var all = MODULES.filter(function (m) { return mods[m]; }).map(function (m) { return mods[m]; });
      all.forEach(function (m) {
        m.items.forEach(function (it) { g.interact.add(it); });
      });
      if (ctl.nav) ctl.nav.rebuild();

      function finish() {
        if (flags.ending) return;
        flags.ending = true;
        g.state.cutscene = true;
        hud.fadeOut('');
        setTimeout(function () { hud.setFadeText(t('act2.vo.end')); }, 1500);
        setTimeout(function () { hud.setFadeText('12:30 AM'); }, 9500);
        setTimeout(function () { if (g.onEnd) g.onEnd('act2'); }, 12500);
      }

      // stress signs for the Director (as on night one)
      var lastYaw = ctl.yaw;
      var lastPos = { x: ctl.pos.x, z: ctl.pos.z };
      var turnRate = 0;

      return {
        director: director,
        flags: flags,
        mods: mods,
        ctx: ctx,
        plan: plan,
        tension: tension,
        weather: weather,
        loops: loops,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          var dyaw = Math.abs(ctl.yaw - lastYaw);
          lastYaw = ctl.yaw;
          turnRate += (dyaw / Math.max(dt, 1e-3) - turnRate) * Math.min(1, dt * 5);
          var mx = ctl.pos.x - lastPos.x;
          var mz = ctl.pos.z - lastPos.z;
          lastPos.x = ctl.pos.x;
          lastPos.z = ctl.pos.z;
          var moved = Math.hypot(mx, mz);
          var forward = -Math.sin(ctl.yaw) * mx - Math.cos(ctl.yaw) * mz;
          ctx.signs = {
            turnRate: turnRate,
            moving: moved > 0.002 && moved < 1,
            backingUp: forward < -0.5 * moved && moved > 0.002,
            sprinting: false,
            lightOn: ctl.light.on,
          };
          if (talk) talk.update(dt);
          weather.update(dt);
          all.forEach(function (m) { m.update(dt); });
          director.tick(dt, flags);
        },
        dispose: function () {
          all.forEach(function (m) { if (m.dispose) m.dispose(); });
          if (talk) talk.stop();
          weather.dispose();
          g.world.setDaylight(0, g.render.renderer);
          loops.forEach(function (h) { h.stop(); });
          loops.length = 0;
          queue.length = 0;
          hud.cc(null);
          phone.cancelChoice();
          phone.endCall();
          phone.stopMusic();
          phone.setCollected(null);
          g.state.modal = null;
          g.mirror.beforeRender = g.mirror.afterRender = null;
          cooper.setAvoid(null);
          cooper.ears(false);
          ctl.stand();
        },
      };
    },
  };
})();
