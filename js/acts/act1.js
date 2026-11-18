// Act 1, Night 1: "The House Learns You" (7:30 PM to 2:15 AM).
// A free routine full of choices: dinner, Cooper, the chores, the TV, the house's jokes, the phone.
// Every choice goes into the habit log. After the settled-in gate the dread starts, paced by the
// tension Director (js/night1/dread.js). This file composes the night's modules and owns the
// to-do list, the shared helpers they use, and the ending.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};
  var N1 = OC.night1 || {};

  var MODULES = ['dinner', 'cooperPlay', 'chores', 'jokes', 'tv'];
  var BASE_TEXT = [
    'act1.vo.open', 'act1.vo.end', 'act1.sms.dave1', 'act1.sms.ethan1', 'act1.sms.mason1', 'act1.sms.dave2',
    'act1.thought.allDone', 'act1.thought.late',
  ];
  var TEXT = MODULES.concat(['dread']).reduce(function (all, m) {
    return N1[m] ? all.concat(N1[m].TEXT) : all;
  }, BASE_TEXT.slice());

  var ROUTINE = [
    { id: 'dinner', label: 'Make dinner' },
    { id: 'feedCooper', label: 'Feed Cooper' },
    { id: 'mail', label: 'Get the mail' },
    { id: 'trash', label: 'Take out the trash' },
    { id: 'washUp', label: 'Wash the dishes' },
    { id: 'brushTeeth', label: 'Brush your teeth' },
    { id: 'lockPatio', label: 'Lock the patio door' },
    { id: 'watchTv', label: 'Watch some TV' },
  ];
  // revealed later, by the dread
  var LATER = [
    { id: 'photo', label: 'Send Ethan a hallway pic' },
    { id: 'hatch', label: 'Check the hatch' },
    { id: 'findCooper', label: 'Check on Cooper' },
    { id: 'bed', label: 'Go to bed' },
  ];

  OC.acts.act1 = {
    id: 'act1',
    night: 1,
    spawn: 'living',
    clockDef: { startMin: 19 * 60 + 30, endMin: 26 * 60 + 15, durationSec: 960 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var none = { stop: function () {} };

      // the house as Mason finds it on night one
      props.setLights({ living: 1.3, kitchen: 1.1, foyer: 0.5, hall: 0.3, porch: 1.0, laundry: 0, guest: 0, phoneglow: 0, yard: 0, tv: 0 });
      if (g.state.tvSound) g.state.tvSound.stop();
      props.tv.setOn(false);
      props.bowl.setFilled(false);
      props.microwave.setGlow(false);
      props.frontDoor.close();
      props.slider.setOpen(0);
      props.slider.setLocked(false);
      props.hatch.setAjar(false);
      props.hatch.setPadlock(true);
      props.broom.set('corner');
      props.master.setStage('off');
      props.car.fixWindow();
      props.car.headlights(false);
      props.intruder.show(false);
      props.intruder.redEye(false);
      cooper.setPos(15.5, 5.5);
      cooper.follow();
      cooper.wag(null);
      if (ctl.nav) ctl.nav.rebuild();
      g.state.gag = false;
      g.state.modal = null;
      g.habits.reset();
      g.photo.reset();

      var flags = { elapsed: 0, room: null, tasksDone: 0, ending: false };
      var queue = []; // things to do after a delay, in game time
      var loops = []; // sounds that must stop when the act ends
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      function sfx(name, opts) {
        var h = g.audio ? g.audio.play(name, opts) : none;
        return h;
      }

      var revealed = {};
      ROUTINE.forEach(function (x) { revealed[x.id] = true; });
      function visible() {
        return director.list().filter(function (x) { return revealed[x.id]; });
      }

      var director = OC.director.createDirector(
        {
          tasks: ROUTINE.concat(LATER),
          advanceWhen: function () { return false; }, // bed is opened by the dread, not by the list
          triggers: [
            { id: 'intro', when: function (s) { return s.elapsed > 1.5; }, do: function () { hud.say(t('act1.vo.open'), 10000); } },
            {
              id: 'dave1',
              when: function (s) { return s.elapsed > 18; },
              do: function () { phone.deliver('dave', 'Uncle Dave', t('act1.sms.dave1')); },
            },
            {
              id: 'ethan1',
              when: function (s) { return s.elapsed > 75; },
              do: function () {
                phone.deliver('ethan', 'Ethan', t('act1.sms.ethan1'));
                later(6, function () { phone.send('ethan', t('act1.sms.mason1')); });
              },
            },
            {
              id: 'dave2',
              when: function (s) { return s.elapsed > 150; },
              do: function () { phone.deliver('dave', 'Uncle Dave', t('act1.sms.dave2')); },
            },
            {
              id: 'allDone',
              when: function (s) { return s.tasksDone === ROUTINE.length; },
              do: function () { later(2, function () { hud.say(t('act1.thought.allDone')); }); },
            },
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

      var tension = OC.tension.createTension();
      var ctx = {
        flags: flags,
        director: director,
        tension: tension,
        later: later,
        sfx: sfx,
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
        reveal: function (id) {
          revealed[id] = true;
          phone.setTasks(visible());
        },
        routineDone: function () {
          return flags.tasksDone;
        },
        dinnerEaten: function () {
          return mods.dinner.dinner().state === 'eaten';
        },
        finish: finish,
      };

      var mods = {};
      MODULES.forEach(function (m) {
        mods[m] = N1[m].create(g, ctx);
      });
      ctx.mods = mods;
      var dread = N1.dread ? N1.dread.create(g, ctx) : null;
      var all = MODULES.map(function (m) { return mods[m]; }).concat(dread ? [dread] : []);
      all.forEach(function (m) {
        m.items.forEach(function (it) { g.interact.add(it); });
      });

      // without the dread module, bed opens when the list is done
      if (!dread) {
        g.interact.add({
          id: 'bed', x: 1.1, y: 0.6, z: 15.6, radius: 0.7,
          label: 'Go to bed',
          enabled: function () { return flags.tasksDone === ROUTINE.length && !flags.ending; },
          onUse: function () { finish('normal'); },
        });
      }

      function finish(kind) {
        if (flags.ending) return;
        flags.ending = true;
        g.state.cutscene = true;
        if (kind === 'gag') {
          hud.fadeOut('');
          g.after(function () { if (g.onEnd) g.onEnd('act1', 'gag'); }, 1600);
          return;
        }
        hud.fadeOut('');
        g.after(function () { hud.setFadeText(t('act1.vo.end')); }, 1500);
        g.after(function () { hud.setFadeText('NIGHT 2'); }, 9500);
        g.after(function () { if (g.onEnd) g.onEnd('act1'); }, 12500);
      }

      // stress signs for the Director: how fast the view turns, backing up, the light
      var lastYaw = ctl.yaw;
      var lastPos = { x: ctl.pos.x, z: ctl.pos.z };
      var turnRate = 0;

      return {
        director: director,
        flags: flags,
        mods: mods,
        dread: dread,
        tension: tension,
        ctx: ctx,
        loops: loops,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          flags.tasksDone = ROUTINE.filter(function (x) { return director.done(x.id); }).length;

          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) {
              var job = queue.splice(i, 1)[0];
              job.fn();
            }
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
            moving: moved > 0.002,
            backingUp: forward < -0.5 * moved && moved > 0.002,
            sprinting: false,
            lightOn: ctl.light.on,
          };

          all.forEach(function (m) { m.update(dt); });
          director.tick(dt, flags);
        },
        dispose: function () {
          all.forEach(function (m) { if (m.dispose) m.dispose(); });
          loops.forEach(function (h) { h.stop(); });
          loops.length = 0;
          queue.length = 0;
          hud.cc(null);
          hud.keypad(false);
          g.state.modal = null;
          g.state.petcamForce = false;
          phone.stopMusic();
          phone.raise(false);
          cooper.setAvoid(null);
        },
      };
    },
  };
})();
