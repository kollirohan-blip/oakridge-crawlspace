// Act 1: Arrival and routine (7:30 PM to 1:30 AM).
// Mason heats up dinner, feeds Cooper, locks the slider and watches TV. Meanwhile: scratching under
// the laundry hatch ("rats"), a light that should not be on in Dave's bedroom across the courtyard,
// and a figure behind its blinds that only ever moves when Mason looks away.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act1.vo.open', 'act1.vo.silhouette', 'act1.vo.end',
    'act1.note.fridge',
    'act1.sms.dave1', 'act1.sms.ethan1', 'act1.sms.mason1', 'act1.sms.dave2',
    'act1.thought.microwave', 'act1.thought.microwaveDone', 'act1.thought.bin', 'act1.thought.needKibble',
    'act1.thought.bowl', 'act1.thought.latch', 'act1.thought.tvon', 'act1.thought.couch',
    'act1.thought.couchDone', 'act1.thought.allDone', 'act1.thought.scratch1', 'act1.thought.scratch2',
    'act1.thought.hatch', 'act1.thought.lampOn', 'act1.thought.silhouette1', 'act1.thought.silhouette2',
    'act1.thought.lampOff', 'act1.thought.masterEmpty', 'act1.thought.late',
  ];

  var SOUTH_WING = ['hall', 'laundry', 'guest', 'bath', 'office', 'master'];
  var HATCH = { x: 2.5, y: 0.15, z: 10.5 };

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
      var phone = g.phone;
      var stand = OC.house.stand;
      var none = { stop: function () {} };

      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }

      var flags = {
        elapsed: 0,
        room: null,
        tasksDone: 0,
        kibble: false,
        microwave: 'idle', // idle -> running -> ready -> done
        microwaveT: 0,
        tvOn: false,
        seated: false,
        seatT: 0,
        ending: false,
        dread: false, // Dave's lamp has come on
        seenNow: false,
        lampHidden: false,
        figureDone: false,
        lateBed: false,
        scratch1At: -1,
      };
      var hum = none;
      var queue = []; // things to do after a delay, in game time
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      function stareFor(target, seconds) {
        cooper.stare(target);
        later(seconds, function () { cooper.stare(null); });
      }

      var figure = OC.silhouette.createSilhouette(['lampOn', 'figureA', 'figureB', 'gone']);
      var saidSilhouette = false;
      function voSilhouette() {
        if (saidSilhouette) return;
        saidSilhouette = true;
        hud.say(t('act1.vo.silhouette'), 9000);
      }

      function onSighted(stage) {
        if (stage === 'lampOn') {
          hud.say(t('act1.thought.lampOn'));
          tension(0.3);
        } else if (stage === 'figureA') {
          sfx('sting', { gain: 0.45 });
          hud.say(t('act1.thought.silhouette1'));
          stareFor(props.master.windows[0], 7);
          sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 2.2 });
          tension(0.6);
        } else if (stage === 'figureB') {
          hud.say(t('act1.thought.silhouette2'));
          var beat = sfx('heartbeat', { gain: 0.7 });
          later(8, function () { beat.stop(); });
          stareFor(props.master.windows[1], 7);
          tension(0.8);
        } else if (stage === 'gone') {
          flags.figureDone = true;
          hud.say(t('act1.thought.lampOff'));
          later(5, voSilhouette);
          tension(0.4);
        }
      }

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'microwave', label: 'Heat up dinner' },
            { id: 'feedCooper', label: 'Feed Cooper' },
            { id: 'lockPatio', label: 'Lock the patio door' },
            { id: 'watchTv', label: 'Watch some TV' },
          ],
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
              // the first scratching, while dinner heats
              id: 'scratch1',
              when: function (s) { return s.microwave === 'running' && s.microwaveT > 7; },
              do: function () {
                flags.scratch1At = flags.elapsed;
                sfx('scratch', { pos: HATCH, gain: 1.4, duration: 3 });
                stareFor(HATCH, 6);
                later(3, function () { hud.say(t('act1.thought.scratch1')); });
              },
            },
            {
              id: 'dave2',
              when: function (s) { return s.scratch1At >= 0 && s.elapsed - s.scratch1At > 30; },
              do: function () { phone.deliver('dave', 'Uncle Dave', t('act1.sms.dave2')); },
            },
            {
              // Dave's lamp comes on, but never while Mason is looking at it
              id: 'dread',
              when: function (s) { return (s.tasksDone >= 2 || s.elapsed > 240) && !s.seenNow && SOUTH_WING.indexOf(s.room) < 0; },
              do: function () {
                flags.dread = true;
                props.master.setStage('lampOn');
              },
            },
            {
              // after the figure is gone: something heavier under the floor
              id: 'scratch2',
              when: function (s) { return s.figureDone && (s.room === 'hall' || s.room === 'laundry' || s.room === 'guest'); },
              do: function () {
                sfx('scratch', { pos: HATCH, gain: 1.8, duration: 2 });
                sfx('thud', { pos: HATCH, gain: 1.4, delay: 2.2 });
                stareFor(HATCH, 8);
                sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, delay: 2.4, duration: 3 });
                later(3.5, function () { hud.say(t('act1.thought.scratch2')); });
              },
            },
            {
              id: 'masterEmpty',
              when: function (s) { return s.figureDone && s.room === 'master'; },
              do: function () {
                hud.say(t('act1.thought.masterEmpty'));
                later(5, voSilhouette);
              },
            },
            {
              id: 'late',
              when: function () { return g.clock && g.clock.finished() && !director.actDone(); },
              do: function () {
                flags.lateBed = true;
                hud.say(t('act1.thought.late'));
              },
            },
          ],
        },
        {
          onTask: function (id) {
            var task = director.list().filter(function (x) { return x.id === id; })[0];
            hud.toast('Done: ' + task.label);
            phone.setTasks(director.list());
          },
          onAdvance: function () {
            later(2, function () { hud.say(t('act1.thought.allDone')); });
          },
        }
      );
      phone.setTasks(director.list());

      function finish() {
        flags.ending = true;
        g.state.cutscene = true;
        hud.fadeOut('');
        setTimeout(function () { hud.setFadeText(t('act1.vo.end')); }, 1500);
        setTimeout(function () { hud.setFadeText('NIGHT 2'); }, 8500);
        setTimeout(function () { if (g.onEnd) g.onEnd('act1'); }, 11500);
      }

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
              hum = sfx('hum', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
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
            g.state.tvSound = sfx('tv', { pos: { x: 19.5, y: 1, z: 0.5 }, gain: 0.8 });
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
          id: 'hatch', x: 2.5, y: 0.08, z: 10.5, radius: 0.5,
          label: 'Look at the hatch',
          onUse: function () {
            hud.say(t('act1.thought.hatch'));
            if (flags.dread) sfx('knock', { pos: HATCH, count: 1, gain: 0.6, delay: 1.2 });
          },
        },
        {
          id: 'bed', x: 1.1, y: 0.6, z: 15.6, radius: 0.7,
          label: 'Go to bed',
          enabled: function () { return (director.actDone() || flags.lateBed) && !flags.ending; },
          onUse: finish,
        },
      ];
      items.forEach(function (it) { g.interact.add(it); });

      function updateFigure(dt) {
        var room = flags.room;
        var inSouthWing = SOUTH_WING.indexOf(room) >= 0;
        var stage = figure.stage();

        // walking toward Dave's room: the lamp goes dark, and if someone was there, they are gone
        if (inSouthWing) {
          if (figure.index() === 0 && props.master.stage === 'lampOn') {
            props.master.setStage('off');
            flags.lampHidden = true;
          } else if (figure.index() === 1 || figure.index() === 2) {
            props.master.setStage('gone');
            flags.figureDone = true;
            tension(0.35);
          }
          flags.seenNow = false;
          return;
        }
        var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
        var target = props.master.focus();
        var vantage = room === 'living' || (room === null && ctl.pos.x > 13 && ctl.pos.z > 8);
        // the windows face east: seen too edge-on, the wall's thickness hides what is behind them
        var dist = Math.hypot(ctl.pos.x - target.x, ctl.pos.z - target.z);
        var faceOn = (ctl.pos.x - target.x) / dist >= 0.34;
        var seen =
          vantage &&
          faceOn &&
          OC.sightline.inView(cam, target, 0.42) &&
          OC.sightline.lineOfSight(ctl.boxes, cam, target, 1.5);
        if (flags.lampHidden && !seen) {
          props.master.setStage(stage);
          flags.lampHidden = false;
        }
        flags.seenNow = seen;
        var ev = figure.update(seen, dt);
        if (ev && ev.advancedTo) props.master.setStage(ev.advancedTo);
        if (ev && ev.sighted) onSighted(ev.sighted);
      }

      return {
        director: director,
        flags: flags,
        figure: figure,
        items: items,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          flags.tasksDone = director.list().filter(function (x) { return x.done; }).length;

          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) {
              var job = queue.splice(i, 1)[0];
              job.fn();
            }
          }
          if (flags.microwave === 'running') {
            flags.microwaveT += dt;
            if (flags.microwaveT >= 25) {
              flags.microwave = 'ready';
              props.microwave.setGlow(false);
              hum.stop();
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
          if (flags.dread && !flags.figureDone) updateFigure(dt);
          director.tick(dt, flags);
        },
      };
    },
  };
})();
