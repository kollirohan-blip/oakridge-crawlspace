// Act 1: Arrival and routine. Mason heats up dinner, feeds Cooper, locks the patio slider and
// watches some TV, then goes to bed. (The dread arrives in the next task.)
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act1.vo.open',
    'act1.note.fridge',
    'act1.thought.microwave',
    'act1.thought.microwaveDone',
    'act1.thought.bin',
    'act1.thought.needKibble',
    'act1.thought.bowl',
    'act1.thought.latch',
    'act1.thought.tvon',
    'act1.thought.couch',
    'act1.thought.couchDone',
    'act1.thought.allDone',
  ];

  OC.acts.act1 = {
    id: 'act1',
    night: 1,
    spawn: 'living',
    clockDef: { startMin: 19 * 60 + 30, endMin: 25 * 60 + 30, durationSec: 600 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var stand = OC.house.stand;

      function sfx(name, opts) {
        if (g.audio) g.audio.play(name, opts);
      }

      var flags = {
        elapsed: 0,
        kibble: false,
        microwave: 'idle', // idle -> running -> ready -> done
        microwaveT: 0,
        tvOn: false,
        seated: false,
        seatT: 0,
        ending: false,
      };

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'microwave', label: 'Heat up dinner' },
            { id: 'feedCooper', label: 'Feed Cooper' },
            { id: 'lockPatio', label: 'Lock the patio door' },
            { id: 'watchTv', label: 'Watch some TV' },
          ],
          triggers: [
            {
              id: 'intro',
              when: function (s) { return s.elapsed > 1.5; },
              do: function () { hud.say(t('act1.vo.open'), 10000); },
            },
          ],
        },
        {
          onTask: function (id) {
            var task = director.list().filter(function (x) { return x.id === id; })[0];
            hud.toast('Done: ' + task.label);
            if (g.phone) g.phone.setTasks(director.list());
          },
          onAdvance: function () {
            setTimeout(function () { hud.say(t('act1.thought.allDone')); }, 1800);
          },
        }
      );

      var items = [
        {
          id: 'note', x: 12.55, y: 1.4, z: 0.9, radius: 0.3,
          label: 'Read the note',
          onUse: function () { hud.say(t('act1.note.fridge'), 11000); },
        },
        {
          id: 'microwave', x: 6.3, y: 1.06, z: 0.7, radius: 0.35,
          label: function () { return flags.microwave === 'ready' ? 'Take out dinner' : 'Heat up dinner'; },
          hold: function () { return flags.microwave === 'ready' ? 0.3 : 0.8; },
          enabled: function () { return flags.microwave === 'idle' || flags.microwave === 'ready'; },
          onUse: function () {
            if (flags.microwave === 'idle') {
              flags.microwave = 'running';
              flags.microwaveT = 0;
              props.microwave.setGlow(true);
              sfx('hum', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
              hud.say(t('act1.thought.microwave'));
            } else if (flags.microwave === 'ready') {
              flags.microwave = 'done';
              hud.say(t('act1.thought.microwaveDone'));
              director.complete('microwave');
            }
          },
        },
        {
          id: 'bin', x: 12.4, y: 0.78, z: 7.0, radius: 0.4,
          label: "Scoop Cooper's food",
          enabled: function () { return !flags.kibble && !props.bowl.filled; },
          onUse: function () {
            flags.kibble = true;
            hud.say(t('act1.thought.bin'));
          },
        },
        {
          id: 'bowl', x: 11.2, y: 0.14, z: 6.9, radius: 0.3,
          label: "Fill Cooper's bowl",
          enabled: function () { return !props.bowl.filled; },
          onUse: function () {
            if (!flags.kibble) {
              hud.say(t('act1.thought.needKibble'));
              return;
            }
            flags.kibble = false;
            props.bowl.setFilled(true);
            hud.say(t('act1.thought.bowl'));
            cooper.goTo(11.2, 6.2, function () {
              cooper.eat(4, function () { director.complete('feedCooper'); });
            });
          },
        },
        {
          id: 'latch', x: 19.52, y: 1.05, z: 7.9, radius: 0.35,
          label: 'Lock the patio door',
          hold: 1.2,
          enabled: function () { return !props.slider.locked; },
          onUse: function () {
            props.slider.setLocked(true);
            sfx('doorLock', { pos: { x: 19.5, y: 1.05, z: 8 } });
            hud.say(t('act1.thought.latch'));
            director.complete('lockPatio');
          },
        },
        {
          id: 'tv', x: 19.5, y: 0.95, z: 0.7, radius: 0.5,
          label: 'Turn on the TV',
          enabled: function () { return !props.tv.on; },
          onUse: function () {
            props.tv.setOn(true);
            flags.tvOn = true;
            sfx('tv', { pos: { x: 19.5, y: 1, z: 0.5 } });
            hud.say(t('act1.thought.tvon'));
          },
        },
        {
          id: 'couch', x: 19.25, y: 0.55, z: 4.0, radius: 0.6,
          label: 'Sit and watch TV',
          enabled: function () { return flags.tvOn && !flags.seated && !director.done('watchTv'); },
          onUse: function () {
            flags.seated = true;
            flags.seatT = 0;
            ctl.seat(19.25, 3.95, 0, -0.5);
            hud.say(t('act1.thought.couch'));
          },
        },
        {
          id: 'bed', x: 1.1, y: 0.6, z: 15.6, radius: 0.7,
          label: 'Go to bed',
          enabled: function () { return director.actDone() && !flags.ending; },
          onUse: function () {
            flags.ending = true;
            g.interact.suspend(true);
            hud.fadeOut('NIGHT 2', function () { if (g.onEnd) g.onEnd('act1'); });
          },
        },
      ];
      items.forEach(function (it) { g.interact.add(it); });

      return {
        director: director,
        flags: flags,
        items: items,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          if (flags.microwave === 'running') {
            flags.microwaveT += dt;
            if (flags.microwaveT >= 25) {
              flags.microwave = 'ready';
              props.microwave.setGlow(false);
              sfx('beep', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
              hud.toast('Dinner is ready');
            }
          }
          if (flags.seated) {
            flags.seatT += dt;
            if (flags.seatT >= 20) {
              flags.seated = false;
              ctl.stand();
              ctl.teleport(stand.couch.x, stand.couch.z);
              hud.say(t('act1.thought.couchDone'));
              director.complete('watchTv');
            }
          }
          director.tick(dt, flags);
        },
      };
    },
  };
})();
