// Act 2: The deadbolt (night two, 8:30 PM to midnight).
// Mason comes back from the store to a front door deadbolted from the inside. Inside: the laundry light
// is on, the hatch is open and its padlock is gone, and Cooper is snarling at the patio slider, which
// is open three inches. The latch will not catch, so Mason jams the track with a broom, and without
// knowing it, locks whoever opened it inside the house with him.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act2.vo.open', 'act2.vo.end',
    'act2.sms.mason1', 'act2.sms.dave1', 'act2.sms.ethan1', 'act2.sms.mason2',
    'act2.thought.door', 'act2.thought.key', 'act2.thought.unlock', 'act2.thought.inside',
    'act2.thought.laundryLight', 'act2.thought.hatch', 'act2.thought.hatchClosed', 'act2.thought.slider',
    'act2.thought.sliderClosed', 'act2.thought.latchBroken', 'act2.thought.broomTake', 'act2.thought.broom',
    'act2.thought.cooperStares',
  ];

  var SLIDER = { x: 19.5, y: 1.0, z: 8.1 };

  OC.acts.act2 = {
    id: 'act2',
    night: 2,
    spawn: 'driveway',
    clockDef: { startMin: 20 * 60 + 30, endMin: 24 * 60, durationSec: 420 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var none = { stop: function () {} };
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }

      // the house as Mason finds it on night two
      if (g.state.tvSound) g.state.tvSound.stop();
      props.tv.setOn(false);
      props.microwave.setGlow(false);
      props.bowl.setFilled(false);
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0, porch: 1.0, laundry: 0.9, guest: 0, tv: 0, yard: 0.45 });
      props.frontDoor.close();
      props.slider.setLocked(false);
      props.slider.setOpen(0.076);
      props.hatch.setAjar(true);
      props.hatch.setPadlock(false);
      props.broom.set('corner');
      props.master.setStage('off');
      props.car.fixWindow();
      cooper.setPos(20.2, 6.5);
      cooper.follow(); // clear any errand left over from the last act, so the stare takes
      cooper.stare(SLIDER);
      if (ctl.nav) ctl.nav.rebuild();
      tension(0.25);

      var flags = {
        elapsed: 0,
        room: null,
        hasKey: false,
        triedDoor: false,
        doorOpen: false,
        insideAt: -1,
        latchTried: false,
        hasBroom: false,
        barred: false,
        barredAt: -1,
        ending: false,
      };
      var queue = [];
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      var barkT = 1.5;
      // Mason has just parked: the headlights are on, then they click off on their own
      props.car.headlights(true);
      later(30, function () {
        props.car.headlights(false);
        sfx('click', { pos: { x: 10, y: 0.8, z: -7.6 } });
      });

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'inside', label: 'Get inside' },
            { id: 'cooper', label: 'Check on Cooper' },
            { id: 'secure', label: 'Lock up the house' },
          ],
          triggers: [
            { id: 'intro', when: function (s) { return s.elapsed > 1.5; }, do: function () { hud.say(t('act2.vo.open'), 10000); } },
            {
              id: 'inside',
              // wait until Mason is properly inside, clear of the door, before it shuts behind him
              when: function (s) { return s.room === 'foyer' && ctl.pos.z > 0.75; },
              do: function () {
                flags.insideAt = flags.elapsed;
                director.complete('inside');
                // Mason locks up behind himself
                props.frontDoor.close(ctl.pos);
                flags.doorOpen = false;
                if (ctl.nav) ctl.nav.rebuild();
                sfx('doorLock', { pos: { x: 2.5, y: 1, z: 0 } });
                later(1.2, function () { hud.say(t('act2.thought.inside')); });
              },
            },
            {
              id: 'laundryLight',
              when: function (s) { return s.insideAt >= 0 && (s.room === 'kitchen' || s.room === 'hall'); },
              do: function () { hud.say(t('act2.thought.laundryLight')); },
            },
            {
              id: 'hatchSeen',
              when: function (s) { return s.room === 'laundry'; },
              do: function () {
                hud.say(t('act2.thought.hatch'));
                tension(0.5);
              },
            },
            {
              id: 'cooperFound',
              when: function (s) { return s.room === 'living'; },
              do: function () {
                director.complete('cooper');
                later(1.2, function () { hud.say(t('act2.thought.slider')); });
                tension(0.55);
              },
            },
            {
              id: 'ethan1',
              when: function (s) { return s.insideAt >= 0 && s.elapsed - s.insideAt > 50; },
              do: function () { phone.deliver('ethan', 'Ethan', t('act2.sms.ethan1')); },
            },
            {
              // after the broom: Cooper turns his attention down the hall, toward the guest room
              id: 'cooperStares',
              when: function (s) { return s.barred && s.elapsed - s.barredAt > 4 && (s.room === 'hall' || s.room === 'kitchen'); },
              do: function () {
                cooper.stare({ x: 2.5, y: 1, z: 16 });
                sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 3 });
                later(1.5, function () { hud.say(t('act2.thought.cooperStares')); });
                later(5, function () { phone.send('ethan', t('act2.sms.mason2')); });
                later(9, function () { cooper.stare(null); });
              },
            },
            {
              id: 'end',
              when: function (s) { return s.barred && s.room === 'guest' && !s.ending; },
              do: function () { finish(); },
            },
          ],
        },
        {
          onTask: function (id) {
            var task = director.list().filter(function (x) { return x.id === id; })[0];
            hud.toast('Done: ' + task.label);
            phone.setTasks(director.list());
          },
        }
      );
      phone.setTasks(director.list());

      function finish() {
        flags.ending = true;
        g.state.cutscene = true;
        hud.fadeOut('');
        setTimeout(function () { hud.setFadeText(t('act2.vo.end')); }, 1500);
        setTimeout(function () { hud.setFadeText('12:30 AM'); }, 9500);
        setTimeout(function () { if (g.onEnd) g.onEnd('act2'); }, 12500);
      }

      var items = [
        {
          id: 'frontDoor', x: 2.5, y: 1.0, z: -0.1, radius: 0.6,
          label: function () { return flags.hasKey ? 'Unlock the front door' : 'Try the front door'; },
          hold: function () { return flags.hasKey ? 1.0 : 0; },
          enabled: function () { return !flags.doorOpen && director.done('inside') === false; },
          onUse: function () {
            if (!flags.hasKey) {
              sfx('thud', { pos: { x: 2.5, y: 1, z: 0 }, gain: 0.5 });
              hud.say(t('act2.thought.door'));
              if (!flags.triedDoor) {
                flags.triedDoor = true;
                later(2.5, function () { phone.send('dave', t('act2.sms.mason1')); });
                later(9, function () { phone.deliver('dave', 'Uncle Dave', t('act2.sms.dave1')); });
              }
              return;
            }
            flags.doorOpen = true;
            props.frontDoor.open();
            if (ctl.nav) ctl.nav.rebuild();
            sfx('doorLock', { pos: { x: 2.5, y: 1, z: 0 } });
            sfx('creak', { pos: { x: 2.5, y: 1, z: 0 }, delay: 0.3 });
            hud.say(t('act2.thought.unlock'));
          },
        },
        {
          id: 'bush', x: 5.55, y: 0.35, z: -0.75, radius: 0.6,
          label: 'Search under the bush',
          hold: 1.6,
          enabled: function () { return !flags.hasKey; },
          onUse: function () {
            flags.hasKey = true;
            sfx('dig', { pos: { x: 5.5, y: 0.2, z: -0.7 } });
            hud.toast('Found the spare key');
            hud.say(t('act2.thought.key'));
          },
        },
        {
          id: 'hatch', x: 2.5, y: 0.25, z: 10.5, radius: 0.55,
          label: 'Close the hatch',
          hold: 1.0,
          enabled: function () { return props.hatch.ajar; },
          onUse: function () {
            props.hatch.setAjar(false);
            sfx('thud', { pos: { x: 2.5, y: 0.1, z: 10.5 }, gain: 0.5 });
            hud.say(t('act2.thought.hatchClosed'));
          },
        },
        {
          id: 'broom', x: 4.75, y: 0.8, z: 12.7, radius: 0.4,
          label: 'Take the broom',
          enabled: function () { return props.broom.where === 'corner'; },
          onUse: function () {
            props.broom.set('held');
            flags.hasBroom = true;
            hud.say(t('act2.thought.broomTake'));
          },
        },
        {
          id: 'slider', x: 19.5, y: 1.0, z: 7.85, radius: 0.6,
          label: function () {
            if (props.slider.open > 0) return 'Close the patio door';
            if (!flags.latchTried) return 'Lock the patio door';
            if (flags.hasBroom) return 'Jam the broom in the track';
            return 'Lock the patio door';
          },
          hold: function () {
            if (props.slider.open > 0) return 1.0;
            if (flags.hasBroom) return 1.5;
            return 1.0;
          },
          enabled: function () { return !flags.barred; },
          onUse: function () {
            if (props.slider.open > 0) {
              props.slider.setOpen(0);
              sfx('slide', { pos: SLIDER });
              hud.say(t('act2.thought.sliderClosed'));
              return;
            }
            if (!flags.hasBroom) {
              flags.latchTried = true;
              sfx('click', { pos: SLIDER });
              sfx('click', { pos: SLIDER, delay: 0.25 });
              hud.say(t('act2.thought.latchBroken'));
              return;
            }
            flags.barred = true;
            flags.barredAt = flags.elapsed;
            props.broom.set('track');
            sfx('thud', { pos: SLIDER, gain: 0.4 });
            hud.say(t('act2.thought.broom'));
            cooper.stare(null);
            director.complete('secure');
            tension(0.45);
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
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          // Cooper barks at the slider until it is jammed shut
          if (!flags.barred) {
            barkT -= dt;
            if (barkT <= 0) {
              barkT = 2.4 + Math.random() * 1.8;
              var at = { x: cooper.pos.x, y: 0.6, z: cooper.pos.z };
              if (Math.random() < 0.35) sfx('growl', { pos: at, duration: 1.6 });
              else sfx('bark', { pos: at, count: 2 + ((Math.random() * 2) | 0) });
            }
          }
          director.tick(dt, flags);
        },
      };
    },
  };
})();
